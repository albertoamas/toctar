"use server";

import { and, count, eq, max, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, type Transaccion } from "@/db";
import { precio, recordatorioMantenimiento, servicio, variante } from "@/db/esquema";
import { erroresDe, indiceUnicoViolado, type EstadoFormulario } from "@/lib/formularios";
import { nombreRepetido, puedeDesactivar, reordenar, type Direccion } from "@/lib/orden";
import { exigirModulo } from "@/lib/sesion";
import { crearSlug } from "@/lib/slug";
import { servicioCambiado } from "@/modulos/sitio/servicio-cambiado";
import { tamanosActivos } from "@/modulos/configuracion/consultas";
import { historialPrecios, listarVariantes, preciosVigentes, type CambioPrecio } from "./consultas";
import { esquemaCrearServicio, esquemaDatosCatalogo, esquemaIdServicio, esquemaEstadoVariante, esquemaIdVariante, esquemaMoverVariante, esquemaVariante, esquemaVarianteCatalogo } from "./esquemas";
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
 * Alta de un servicio (HU-19): con su nombre, su duración y la variante "Única" (D-2). Nace oculto en el sitio y sin resumen: se
 * muestra cuando se completa su página en Sitio web. Así un servicio interno (el mantenimiento del cerámico) no
 * necesita textos para el sitio.
 */
export async function crearServicio(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const autor = await exigirModulo("catalogo");
  const valores = { nombre: String(datos.get("nombre") ?? ""), duracionDias: String(datos.get("duracionDias") ?? "") };
  const entrada = esquemaCrearServicio.safeParse(valores);
  if (!entrada.success) return { errores: erroresDe(entrada.error), valores };
  const { nombre, duracionDias } = entrada.data;

  const existentes = await db.select({ id: servicio.id, nombre: servicio.nombre }).from(servicio);
  if (nombreRepetido(existentes, nombre)) return { errores: { nombre: NOMBRE_REPETIDO }, valores };

  let id: number;
  try {
    id = await db.transaction(async (tx) => {
      const [{ ultimo }] = await tx.select({ ultimo: max(servicio.orden) }).from(servicio);
      const [nuevo] = await tx
        .insert(servicio)
        .values({ nombre, duracionDias, resumen: "", slug: await slugLibre(tx, nombre), orden: (ultimo ?? 0) + 1, visibleSitio: false, updatedBy: Number(autor.id) })
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

/** Nombre, duración y su mantenimiento (HU-19, RF-27, RF-28, RN-08, pedido 21). Desactivar va aparte (hallazgo 1). */
export async function guardarDatosCatalogo(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const autor = await exigirModulo("catalogo");
  const conMantenimiento = datos.get("conMantenimiento") === "on";
  const valores = {
    id: String(datos.get("id") ?? ""),
    nombre: String(datos.get("nombre") ?? ""),
    duracionDias: String(datos.get("duracionDias") ?? ""),
    conMantenimiento: conMantenimiento ? "on" : "",
    mantenimientoServicioId: String(datos.get("mantenimientoServicioId") ?? ""),
    mantenimientoMeses: String(datos.get("mantenimientoMeses") ?? ""),
  };
  const entrada = esquemaDatosCatalogo.safeParse({ ...valores, conMantenimiento });
  if (!entrada.success) return { errores: erroresDe(entrada.error), valores };
  const { id, nombre, duracionDias, mantenimiento } = entrada.data;
  // El servicio de mantenimiento tiene que existir (puede ser él mismo); uno inactivo no se agenda. Si no cambió, no se
  // vuelve a mirar: editar el nombre no obliga a cambiar el mantenimiento
  const [actual] = await db.select({ mantenimientoServicioId: servicio.mantenimientoServicioId }).from(servicio).where(eq(servicio.id, id));
  if (mantenimiento && mantenimiento.servicioId !== id && mantenimiento.servicioId !== actual?.mantenimientoServicioId) {
    const [suyo] = await db.select({ activo: servicio.activo }).from(servicio).where(eq(servicio.id, mantenimiento.servicioId));
    if (!suyo?.activo) return { errores: { mantenimientoServicioId: "Ese servicio ya no está activo: elige otro." }, valores };
  }
  const otros = await db.select({ id: servicio.id, nombre: servicio.nombre }).from(servicio).where(ne(servicio.id, id));
  if (nombreRepetido(otros, nombre)) return { errores: { nombre: NOMBRE_REPETIDO }, valores };

  let actualizado: { id: number } | undefined;
  try {
    [actualizado] = await db
      .update(servicio)
      .set({
        nombre,
        duracionDias,
        mantenimientoServicioId: mantenimiento?.servicioId ?? null,
        mantenimientoMeses: mantenimiento?.meses ?? null,
        updatedAt: new Date(),
        updatedBy: Number(autor.id),
      })
      .where(eq(servicio.id, id))
      .returning({ id: servicio.id });
  } catch (error) {
    if (indiceUnicoViolado(error) !== null) return { errores: { nombre: NOMBRE_REPETIDO }, valores };
    throw error;
  }
  if (!actualizado) return { mensaje: "Ese servicio ya no existe. Recarga la página." };

  // El nombre sale en el sitio: se invalida su caché
  servicioCambiado(id);
  return { ok: true, mensaje: "Cambios guardados." };
}

/**
 * Desactivar un servicio, desde "Más" de su ficha y con confirmación (hallazgo 1 de la prueba en celulares: la casilla
 * "Activo en el catálogo" en los datos se confundía con "Mostrar en el sitio"). Ya no se cotiza, no se reserva y no sale
 * en el sitio; no se borra nada. Uno que otros usan como su mantenimiento no se desactiva: sus planes no se agendarían.
 */
export async function desactivarServicio(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  return cambiarActivoServicio(datos, false);
}

/** Reactivar un servicio: vuelve a cotizarse y, si su página está completa, al sitio. */
export async function reactivarServicio(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  return cambiarActivoServicio(datos, true);
}

async function cambiarActivoServicio(datos: FormData, activo: boolean): Promise<EstadoFormulario> {
  const autor = await exigirModulo("catalogo");
  const entrada = esquemaIdServicio.safeParse({ id: datos.get("id") });
  if (!entrada.success) return { mensaje: "No se pudo cambiar el servicio. Recarga la página." };
  const { id } = entrada.data;
  if (!activo) {
    const usan = await db
      .select({ nombre: servicio.nombre })
      .from(servicio)
      .where(and(eq(servicio.mantenimientoServicioId, id), ne(servicio.id, id), eq(servicio.activo, true)));
    if (usan.length > 0) {
      return { mensaje: `Es el mantenimiento de ${new Intl.ListFormat("es").format(usan.map((u) => u.nombre))}: cámbialo ahí primero.` };
    }
    // Vehículos con su mantenimiento de este servicio todavía abierto: inactivo, no se podrían reservar
    const [{ pendientes }] = await db
      .select({ pendientes: count() })
      .from(recordatorioMantenimiento)
      .where(and(eq(recordatorioMantenimiento.servicioMantenimientoId, id), sql`${recordatorioMantenimiento.estado} in ('pendiente', 'avisado')`));
    if (pendientes > 0) {
      return {
        mensaje: `${pendientes === 1 ? "Un vehículo tiene" : `${pendientes} vehículos tienen`} su mantenimiento de este servicio pendiente: ciérralo o resérvalo en Mantenimientos primero.`,
      };
    }
  }
  const [cambiado] = await db
    .update(servicio)
    .set({ activo, updatedAt: new Date(), updatedBy: Number(autor.id) })
    .where(eq(servicio.id, id))
    .returning({ nombre: servicio.nombre });
  if (!cambiado) return { mensaje: "Ese servicio ya no existe. Recarga la página." };
  // Inactivo deja de salir en el sitio: se invalida su caché
  servicioCambiado(id);
  return { ok: true, mensaje: activo ? `${cambiado.nombre} reactivado.` : `${cambiado.nombre} desactivado.` };
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
  const { varianteId } = entrada.data;

  const [elegida] = await db
    .select({ servicioId: variante.servicioId })
    .from(variante)
    .where(and(eq(variante.id, varianteId), eq(variante.activo, true)));
  if (!elegida) return { mensaje: "Esa variante ya no existe o está desactivada. Recarga la página." };

  const vigentes = new Map((await preciosVigentes([varianteId])).map((p) => [p.tamanoId, p.monto]));
  const cambios = preciosCambiados(vigentes, enviados);
  const [antes] = await db.select({ duracionDias: variante.duracionDias }).from(variante).where(eq(variante.id, varianteId));
  // Con una sola variante activa no hay duración propia (hallazgo 2): lo decide la base, no el formulario (uno abierto
  // desde antes de desactivar la otra todavía la mandaría)
  const [{ activas }] = await db
    .select({ activas: count() })
    .from(variante)
    .where(and(eq(variante.servicioId, elegida.servicioId), eq(variante.activo, true)));
  const duracionDias = activas > 1 && "duracionDias" in valores ? entrada.data.duracionDias : activas > 1 ? antes.duracionDias : null;
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
  // Si queda una sola activa, su duración propia pasa a ser la del servicio (hallazgo 2): con una sola variante no se
  // muestra ni se edita, y quedaría escondida decidiendo la entrega de la reserva
  const quedaSola = !activo ? variantes.filter((v) => v.activo && v.id !== id) : [];
  await db.transaction(async (tx) => {
    await tx
      .update(variante)
      .set({ activo, orden })
      .where(and(eq(variante.id, id), eq(variante.servicioId, servicioId)));
    const [sola] = quedaSola;
    if (quedaSola.length === 1 && sola.duracionDias !== null) {
      await tx.update(servicio).set({ duracionDias: sola.duracionDias, updatedAt: new Date() }).where(eq(servicio.id, servicioId));
      await tx.update(variante).set({ duracionDias: null }).where(eq(variante.id, sola.id));
    }
  });
  servicioCambiado(servicioId);
  return { ok: true, mensaje: activo ? `${elegida.nombre} reactivada.` : `${elegida.nombre} desactivada.` };
}
