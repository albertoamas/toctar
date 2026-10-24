"use server";

import { and, eq, max, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, type Transaccion } from "@/db";
import { precio, servicio, variante } from "@/db/esquema";
import { erroresDe, indiceUnicoViolado, type EstadoFormulario } from "@/lib/formularios";
import { nombreRepetido, puedeDesactivar, reordenar, type Direccion } from "@/lib/orden";
import { exigirModulo } from "@/lib/sesion";
import { crearSlug } from "@/lib/slug";
import { servicioCambiado } from "@/modulos/sitio/servicio-cambiado";
import { tamanosActivos } from "@/modulos/configuracion/consultas";
import { historialPrecios, listarVariantes, preciosVigentes, type CambioPrecio } from "./consultas";
import { esquemaCrearServicio, esquemaDatosCatalogo, esquemaEstadoVariante, esquemaIdVariante, esquemaMoverVariante, esquemaVariante, esquemaVarianteCatalogo } from "./esquemas";
import { leerMonto, MONTO_MAXIMO, preciosCambiados, type Monto } from "./reglas";

// Catálogo y precios (HU-19, HU-20). Solo el dueño (módulo "catalogo", RN-01). Aquí vive el servicio: se crea, se
// nombra y tiene sus variantes (D-2) y precios. Su página en el sitio se edita en Sitio web (sitio/acciones.ts).

const NOMBRE_REPETIDO = "Ya existe un servicio con ese nombre.";

/** Dirección de la página a partir del nombre: si ya existe, le agrega -2, -3… Dentro de la transacción del alta. */
async function slugLibre(tx: Transaccion, nombre: string): Promise<string> {
  const base = crearSlug(nombre) || "servicio";
  const usados = new Set((await tx.select({ slug: servicio.slug }).from(servicio)).map((s) => s.slug));
  let slug = base;
  for (let n = 2; usados.has(slug); n++) slug = `${base}-${n}`;
  return slug;
}

/**
 * Alta de un servicio (HU-19): con su nombre y la variante "Única" (D-2). Nace oculto en el sitio y sin resumen: se
 * muestra cuando se completa su página en Sitio web. Así un servicio interno (el mantenimiento del cerámico) no
 * necesita textos para el sitio.
 */
export async function crearServicio(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const autor = await exigirModulo("catalogo");
  const valores = { nombre: String(datos.get("nombre") ?? "") };
  const entrada = esquemaCrearServicio.safeParse(valores);
  if (!entrada.success) return { errores: erroresDe(entrada.error), valores };
  const { nombre } = entrada.data;

  const existentes = await db.select({ id: servicio.id, nombre: servicio.nombre }).from(servicio);
  if (nombreRepetido(existentes, nombre)) return { errores: { nombre: NOMBRE_REPETIDO }, valores };

  let id: number;
  try {
    id = await db.transaction(async (tx) => {
      const [{ ultimo }] = await tx.select({ ultimo: max(servicio.orden) }).from(servicio);
      const [nuevo] = await tx
        .insert(servicio)
        .values({ nombre, resumen: "", slug: await slugLibre(tx, nombre), orden: (ultimo ?? 0) + 1, visibleSitio: false, updatedBy: Number(autor.id) })
        .returning({ id: servicio.id });
      await tx.insert(variante).values({ servicioId: nuevo.id, nombre: "Única", orden: 1 });
      return nuevo.id;
    });
  } catch (error) {
    // Dos altas a la vez: la base frena la segunda. Con el mismo nombre, se dice; con nombres que dan la misma
    // dirección ("Pulido!" y "Pulido?"), basta volver a intentar: la dirección libre se calcula de nuevo
    const restriccion = indiceUnicoViolado(error);
    if (restriccion === "servicio_nombre_unico") return { errores: { nombre: NOMBRE_REPETIDO }, valores };
    if (restriccion !== null) return { mensaje: "Otra persona creó un servicio parecido recién. Vuelve a intentarlo.", valores };
    throw error;
  }

  servicioCambiado();
  redirect(`/panel/catalogo/${id}?creado=1`);
}

/** Nombre, duración, mantenimiento y si el servicio está activo (HU-19, RF-27, RF-28, RN-08). */
export async function guardarDatosCatalogo(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const autor = await exigirModulo("catalogo");
  const generaMantenimiento = datos.get("generaMantenimiento") === "on";
  const activo = datos.get("activo") === "on";
  const valores = {
    id: String(datos.get("id") ?? ""),
    nombre: String(datos.get("nombre") ?? ""),
    duracionDias: String(datos.get("duracionDias") ?? ""),
    generaMantenimiento: generaMantenimiento ? "on" : "",
    activo: activo ? "on" : "",
  };
  const entrada = esquemaDatosCatalogo.safeParse({ ...valores, generaMantenimiento, activo });
  if (!entrada.success) return { errores: erroresDe(entrada.error), valores };
  const { id, nombre, duracionDias } = entrada.data;

  const otros = await db.select({ id: servicio.id, nombre: servicio.nombre }).from(servicio).where(ne(servicio.id, id));
  if (nombreRepetido(otros, nombre)) return { errores: { nombre: NOMBRE_REPETIDO }, valores };

  let actualizado: { id: number } | undefined;
  try {
    [actualizado] = await db
      .update(servicio)
      .set({ nombre, duracionDias, generaMantenimiento, activo, updatedAt: new Date(), updatedBy: Number(autor.id) })
      .where(eq(servicio.id, id))
      .returning({ id: servicio.id });
  } catch (error) {
    if (indiceUnicoViolado(error) !== null) return { errores: { nombre: NOMBRE_REPETIDO }, valores };
    throw error;
  }
  if (!actualizado) return { mensaje: "Ese servicio ya no existe. Recarga la página." };

  // El nombre sale en el sitio y un servicio inactivo deja de salir: se invalida su caché
  servicioCambiado(id);
  return { ok: true, mensaje: "Cambios guardados." };
}

const ERROR_MONTO = `Escribe solo números, mayor a cero y hasta ${MONTO_MAXIMO}, por ejemplo 250 o 250,50.`;

/**
 * Precios de una variante por tamaño y su duración propia (HU-20, RF-26, RF-27). Los precios nunca se pisan: solo se
 * inserta una fila nueva por cada tamaño que cambió (D-3), con quién y cuándo (RNF-10). Cada campo se llama
 * "precio-<id del tamaño>"; vacío es "según evaluación".
 */
export async function guardarPreciosVariante(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const autor = await exigirModulo("catalogo");
  const valores: Record<string, string> = {};
  for (const [clave, valor] of datos.entries()) if (typeof valor === "string") valores[clave] = valor;

  const entrada = esquemaVarianteCatalogo.safeParse({ varianteId: valores.varianteId, duracionDias: valores.duracionDias });
  const errores: Record<string, string> = entrada.success ? {} : erroresDe(entrada.error);
  const tamanos = await tamanosActivos();
  const enviados = new Map<number, Monto>();
  for (const t of tamanos) {
    const monto = leerMonto(valores[`precio-${t.id}`] ?? "");
    if (monto === undefined) errores[`precio-${t.id}`] = ERROR_MONTO;
    else enviados.set(t.id, monto);
  }
  if (!entrada.success || Object.keys(errores).length > 0) return { errores, valores };
  const { varianteId, duracionDias } = entrada.data;

  const [elegida] = await db
    .select({ servicioId: variante.servicioId })
    .from(variante)
    .where(and(eq(variante.id, varianteId), eq(variante.activo, true)));
  if (!elegida) return { mensaje: "Esa variante ya no existe o está desactivada. Recarga la página." };

  const vigentes = new Map((await preciosVigentes([varianteId])).map((p) => [p.tamanoId, p.monto]));
  const cambios = preciosCambiados(vigentes, enviados);
  const [antes] = await db.select({ duracionDias: variante.duracionDias }).from(variante).where(eq(variante.id, varianteId));
  if (cambios.length === 0 && antes.duracionDias === duracionDias) return { ok: true, mensaje: "No había cambios." };

  await db.transaction(async (tx) => {
    if (antes.duracionDias !== duracionDias) await tx.update(variante).set({ duracionDias }).where(eq(variante.id, varianteId));
    if (cambios.length > 0) {
      await tx.insert(precio).values(cambios.map((c) => ({ varianteId, tamanoId: c.tamanoId, monto: c.monto, createdBy: Number(autor.id) })));
    }
  });

  revalidatePath("/panel/catalogo");
  revalidatePath(`/panel/catalogo/${elegida.servicioId}`);
  return { ok: true, mensaje: "Precios guardados." };
}

/** Historial de precios de una variante, para el diálogo "Ver historial" (RF-28, RNF-10). */
export async function verHistorialPrecios(varianteId: number): Promise<CambioPrecio[]> {
  await exigirModulo("catalogo");
  const id = esquemaIdVariante.parse(varianteId);
  return historialPrecios(id);
}

// ---------------------------------------------------------------------------------------------
// Variantes (D-2): las opciones que eligen los clientes. Nunca se borran (D-6): las cotizaciones las siguen mostrando.

const VARIANTE_REPETIDA = "Ya existe una variante con ese nombre.";

export async function guardarVariante(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  await exigirModulo("catalogo");
  const valores = { nombre: String(datos.get("nombre") ?? ""), descripcion: String(datos.get("descripcion") ?? "") };
  const entrada = esquemaVariante.safeParse({
    servicioId: datos.get("servicioId"),
    id: datos.get("id") || undefined,
    nombre: valores.nombre,
    descripcion: valores.descripcion,
  });
  if (!entrada.success) return { errores: erroresDe(entrada.error), valores };
  const { servicioId, id, nombre, descripcion } = entrada.data;

  const variantes = await listarVariantes(servicioId);
  if (nombreRepetido(variantes, nombre, id)) return { errores: { nombre: VARIANTE_REPETIDA }, valores };
  if (id && !variantes.some((v) => v.id === id)) return { mensaje: "Esa variante ya no existe. Recarga la página." };

  try {
    if (id) {
      await db.update(variante).set({ nombre, descripcion }).where(and(eq(variante.id, id), eq(variante.servicioId, servicioId)));
    } else {
      const orden = Math.max(0, ...variantes.map((v) => v.orden)) + 1;
      await db.insert(variante).values({ servicioId, nombre, descripcion, orden });
    }
  } catch (error) {
    if (indiceUnicoViolado(error) !== null) return { errores: { nombre: VARIANTE_REPETIDA }, valores };
    throw error;
  }

  servicioCambiado(servicioId);
  return { ok: true, mensaje: id ? "Cambios guardados." : `Variante ${nombre} agregada.` };
}

export async function moverVariante(datos: { servicioId: number; id: number; direccion: Direccion }): Promise<EstadoFormulario> {
  await exigirModulo("catalogo");
  const entrada = esquemaMoverVariante.safeParse(datos);
  if (!entrada.success) return { mensaje: "No se pudo mover." };
  const { servicioId, id, direccion } = entrada.data;
  const nuevoOrden = reordenar(await listarVariantes(servicioId), id, direccion);
  if (!nuevoOrden) return { ok: true };
  await db.transaction(async (tx) => {
    for (const o of nuevoOrden) {
      await tx.update(variante).set({ orden: o.orden }).where(and(eq(variante.id, o.id), eq(variante.servicioId, servicioId)));
    }
  });
  servicioCambiado(servicioId);
  return { ok: true };
}

/** Desactivar no borra (D-6); al reactivarla vuelve al final de las activas. Siempre queda al menos una activa. */
export async function cambiarEstadoVariante(datos: { servicioId: number; id: number; activo: boolean }): Promise<EstadoFormulario> {
  await exigirModulo("catalogo");
  const entrada = esquemaEstadoVariante.safeParse(datos);
  if (!entrada.success) return { mensaje: "No se pudo cambiar el estado." };
  const { servicioId, id, activo } = entrada.data;
  const variantes = await listarVariantes(servicioId);
  const elegida = variantes.find((v) => v.id === id);
  if (!elegida) return { mensaje: "Esa variante ya no existe. Recarga la página." };
  if (!activo && !puedeDesactivar(variantes, id)) {
    return { mensaje: "Debe quedar al menos una variante activa. Si el servicio no tiene opciones, deja una llamada Única." };
  }
  const orden = activo ? Math.max(0, ...variantes.filter((v) => v.activo).map((v) => v.orden)) + 1 : elegida.orden;
  await db
    .update(variante)
    .set({ activo, orden })
    .where(and(eq(variante.id, id), eq(variante.servicioId, servicioId)));
  servicioCambiado(servicioId);
  return { ok: true, mensaje: activo ? `${elegida.nombre} reactivada.` : `${elegida.nombre} desactivada.` };
}
