"use server";

import { eq, max } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { db } from "@/db";
import { espacioTaller, negocio, parametro, parteRevision, plantillaMensaje, sucursal, tamanoVehiculo } from "@/db/esquema";
import { erroresDe, indiceUnicoViolado, type EstadoFormulario } from "@/lib/formularios";
import { eliminarFotosSinFallar, guardarFoto } from "@/lib/fotos";
import { nombreRepetido, puedeDesactivar, reordenar, type Direccion } from "@/lib/orden";
import { exigirModulo } from "@/lib/sesion";
import { whatsAppLocal } from "@/lib/whatsapp";
import { textoEnlaceMapa } from "@/lib/ubicacion";
import { ETIQUETA_NEGOCIO, ETIQUETA_PARAMETROS, ETIQUETA_PLANTILLAS, listarElementos, obtenerConfiguracionNegocio, sucursalPrincipal } from "./consultas";
import { CAMPOS_NEGOCIO, esquemaNegocio } from "./esquemas";
import {
  esquemaElemento,
  esquemaEstado,
  esquemaMover,
  mensajeRepetido,
  mensajeUltimoActivo,
  type Lista,
} from "./listas";
import { CLAVES_PARAMETRO, esquemaParametros } from "./parametros";
import { esquemaClavePlantilla, esquemaPlantilla, PLANTILLAS } from "./plantillas";

// Configuración del negocio (HU-04) y parámetros (HU-05). Solo el dueño entra al módulo "configuracion".
// Al guardar se invalida la etiqueta "negocio": el sitio muestra los datos nuevos sin volver a desplegar.

const RUTA = "/panel/configuracion";

function valoresDe(datos: FormData): Record<string, string> {
  return Object.fromEntries(CAMPOS_NEGOCIO.map((c) => [c, String(datos.get(c) ?? "")]));
}

export async function guardarNegocio(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const autor = await exigirModulo("configuracion");
  const entrada = esquemaNegocio.safeParse(valoresDe(datos));
  if (!entrada.success) return { errores: erroresDe(entrada.error), valores: valoresDe(datos) };
  const d = entrada.data;
  const autorId = Number(autor.id);
  const { sucursalId, coordenadas: guardadas } = await obtenerConfiguracionNegocio();
  // Pedido 38: las coordenadas salen del enlace (el pin) o, si no las trae, del mapa. El enlace corto de "Compartir" no
  // las trae: con él se conservan las que ya estaban. Sin enlace ni mapa, no hay ubicación
  const coordenadas = d.enlaceMapa?.coordenadas ?? d.mapaInsertado?.coordenadas ?? (d.enlaceMapa ? guardadas : null);

  await db.transaction(async (tx) => {
    await tx
      .update(negocio)
      .set({
        nombre: d.nombre,
        correo: d.correo,
        redes: {
          ...(d.facebook && { facebook: d.facebook }),
          ...(d.instagram && { instagram: d.instagram }),
          ...(d.tiktok && { tiktok: d.tiktok }),
        },
        nit: d.nit,
        razonSocial: d.razonSocial,
        updatedAt: new Date(),
        updatedBy: autorId,
      })
      .where(eq(negocio.id, 1));
    await tx
      .update(sucursal)
      .set({
        direccion: d.direccion,
        lat: coordenadas?.lat ?? null,
        lng: coordenadas?.lng ?? null,
        enlaceMapa: d.enlaceMapa?.enlace ?? null,
        mapaInsertado: d.mapaInsertado?.src ?? null,
        horarios: d.horarios,
        telefonoWhatsapp: d.whatsapp,
        updatedAt: new Date(),
        updatedBy: autorId,
      })
      .where(eq(sucursal.id, sucursalId));
  });

  updateTag(ETIQUETA_NEGOCIO);
  revalidatePath(`${RUTA}/negocio`);
  // Se devuelven los valores ya normalizados: el formulario muestra lo que quedó guardado.
  return {
    ok: true,
    mensaje: "Cambios guardados.",
    valores: {
      ...valoresDe(datos),
      whatsapp: whatsAppLocal(d.whatsapp),
      correo: d.correo ?? "",
      enlaceMapa: textoEnlaceMapa(d.enlaceMapa?.enlace ?? null, coordenadas, d.mapaInsertado?.src ?? null),
      mapaInsertado: d.mapaInsertado?.src ?? "",
      facebook: d.facebook ?? "",
      instagram: d.instagram ?? "",
      tiktok: d.tiktok ?? "",
    },
  };
}

const ERROR_LOGO = "El logo debe ser PNG, JPG o WebP de hasta 5 MB.";
const BORRAR_LOGO_FALLO = "No se pudo borrar del almacenamiento un logo";

/** Logo para el PDF de cotización y otros documentos. Se guarda en WebP de hasta 1600 px, con transparencia. */
export async function subirLogo(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const autor = await exigirModulo("configuracion");
  const foto = await guardarFoto(datos.get("logo"), { carpeta: "negocio", prefijo: "logo-", autorId: Number(autor.id) });
  if (!foto.ok) return { errores: { logo: foto.motivo === "vacia" ? "Elige una imagen." : ERROR_LOGO } };

  let anterior: number | null;
  try {
    // Con la fila del negocio bloqueada: dos cambios de logo a la vez no dejan uno sin usar
    anterior = await db.transaction(async (tx) => {
      const [fila] = await tx.select({ logoArchivoId: negocio.logoArchivoId }).from(negocio).where(eq(negocio.id, 1)).for("update");
      await tx.update(negocio).set({ logoArchivoId: foto.archivoId, updatedAt: new Date(), updatedBy: Number(autor.id) }).where(eq(negocio.id, 1));
      return fila?.logoArchivoId ?? null;
    });
  } catch (error) {
    await eliminarFotosSinFallar([foto.archivoId], BORRAR_LOGO_FALLO);
    throw error;
  }

  updateTag(ETIQUETA_NEGOCIO);
  revalidatePath(`${RUTA}/negocio`);
  // El logo anterior no lo usa nadie más: se borra después de renovar; si el almacenamiento falla, el nuevo ya vale
  // (auditoría QA-07)
  await eliminarFotosSinFallar([anterior], BORRAR_LOGO_FALLO);
  return { ok: true, mensaje: "Logo actualizado." };
}

// ---------------------------------------------------------------------------------------------
// HU-05 Parámetros

export async function guardarParametros(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const autor = await exigirModulo("configuracion");
  const valores = Object.fromEntries(CLAVES_PARAMETRO.map((c) => [c, String(datos.get(c) ?? "")]));
  const entrada = esquemaParametros.safeParse(valores);
  if (!entrada.success) return { errores: erroresDe(entrada.error), valores };

  const ahora = new Date();
  await db.transaction(async (tx) => {
    for (const clave of CLAVES_PARAMETRO) {
      const fila = { clave, valor: entrada.data[clave], updatedAt: ahora, updatedBy: Number(autor.id) };
      await tx.insert(parametro).values(fila).onConflictDoUpdate({ target: parametro.clave, set: fila });
    }
  });

  updateTag(ETIQUETA_PARAMETROS);
  revalidatePath(`${RUTA}/parametros`);
  return { ok: true, mensaje: "Cambios guardados.", valores: Object.fromEntries(CLAVES_PARAMETRO.map((c) => [c, String(entrada.data[c])])) };
}

function despuesDeCambiarLista() {
  updateTag(ETIQUETA_PARAMETROS);
  revalidatePath(`${RUTA}/taller`);
}

/** Agrega (sin id) o renombra (con id) un espacio del taller, un tamaño de vehículo o una parte del checklist. */
export async function guardarElemento(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  await exigirModulo("configuracion");
  const valores = { nombre: String(datos.get("nombre") ?? ""), descripcion: String(datos.get("descripcion") ?? "") };
  const entrada = esquemaElemento.safeParse({
    lista: datos.get("lista"),
    id: datos.get("id") || undefined,
    nombre: valores.nombre,
    descripcion: datos.get("descripcion") ?? undefined,
  });
  if (!entrada.success) return { errores: erroresDe(entrada.error), valores };
  const { lista, id, nombre, descripcion } = entrada.data;

  const elementos = await listarElementos(lista);
  if (nombreRepetido(elementos, nombre, id)) return { errores: { nombre: mensajeRepetido(lista) }, valores };
  if (id && !elementos.some((e) => e.id === id)) return { mensaje: "Ese elemento ya no existe. Recarga la página." };

  try {
    if (lista === "partes") {
      if (id) await db.update(parteRevision).set({ nombre }).where(eq(parteRevision.id, id));
      else {
        const [{ ultimo }] = await db.select({ ultimo: max(parteRevision.orden) }).from(parteRevision);
        await db.insert(parteRevision).values({ nombre, orden: (ultimo ?? 0) + 1 });
      }
    } else if (lista === "tamanos") {
      if (id) await db.update(tamanoVehiculo).set({ nombre, descripcion }).where(eq(tamanoVehiculo.id, id));
      else {
        const [{ ultimo }] = await db.select({ ultimo: max(tamanoVehiculo.orden) }).from(tamanoVehiculo);
        await db.insert(tamanoVehiculo).values({ nombre, descripcion, orden: (ultimo ?? 0) + 1 });
      }
    } else {
      if (id) await db.update(espacioTaller).set({ nombre }).where(eq(espacioTaller.id, id));
      else {
        const { id: sucursalId } = await sucursalPrincipal();
        const [{ ultimo }] = await db
          .select({ ultimo: max(espacioTaller.orden) })
          .from(espacioTaller)
          .where(eq(espacioTaller.sucursalId, sucursalId));
        await db.insert(espacioTaller).values({ sucursalId, nombre, orden: (ultimo ?? 0) + 1 });
      }
    }
  } catch (error) {
    if (indiceUnicoViolado(error) !== null) return { errores: { nombre: mensajeRepetido(lista) }, valores };
    throw error;
  }

  despuesDeCambiarLista();
  return { ok: true, mensaje: id ? "Cambios guardados." : `${nombre} ${lista === "partes" ? "agregada" : "agregado"}.` };
}

async function actualizarOrden(lista: Lista, orden: { id: number; orden: number }[]) {
  await db.transaction(async (tx) => {
    for (const o of orden) {
      if (lista === "partes") await tx.update(parteRevision).set({ orden: o.orden }).where(eq(parteRevision.id, o.id));
      else if (lista === "tamanos") await tx.update(tamanoVehiculo).set({ orden: o.orden }).where(eq(tamanoVehiculo.id, o.id));
      else await tx.update(espacioTaller).set({ orden: o.orden }).where(eq(espacioTaller.id, o.id));
    }
  });
}

export async function moverElemento(datos: { lista: Lista; id: number; direccion: Direccion }): Promise<EstadoFormulario> {
  await exigirModulo("configuracion");
  const entrada = esquemaMover.safeParse(datos);
  if (!entrada.success) return { mensaje: "No se pudo mover." };
  const { lista, id, direccion } = entrada.data;

  const nuevoOrden = reordenar(await listarElementos(lista), id, direccion);
  if (!nuevoOrden) return { ok: true };
  await actualizarOrden(lista, nuevoOrden);
  despuesDeCambiarLista();
  return { ok: true };
}

/** Desactivar no borra (D-6): lo ya registrado con ese espacio, tamaño o parte lo sigue mostrando. */
export async function cambiarEstadoElemento(datos: { lista: Lista; id: number; activo: boolean }): Promise<EstadoFormulario> {
  await exigirModulo("configuracion");
  const entrada = esquemaEstado.safeParse(datos);
  if (!entrada.success) return { mensaje: "No se pudo cambiar el estado." };
  const { lista, id, activo } = entrada.data;

  const elementos = await listarElementos(lista);
  const elemento = elementos.find((e) => e.id === id);
  if (!elemento) return { mensaje: "Ese elemento ya no existe. Recarga la página." };
  if (!activo && !puedeDesactivar(elementos, id)) return { mensaje: mensajeUltimoActivo(lista) };

  // Al reactivarlo, vuelve al final de la lista.
  const orden = activo ? Math.max(0, ...elementos.filter((e) => e.activo).map((e) => e.orden)) + 1 : elemento.orden;
  if (lista === "partes") await db.update(parteRevision).set({ activo, orden }).where(eq(parteRevision.id, id));
  else if (lista === "tamanos") await db.update(tamanoVehiculo).set({ activo, orden }).where(eq(tamanoVehiculo.id, id));
  else await db.update(espacioTaller).set({ activo, orden }).where(eq(espacioTaller.id, id));

  despuesDeCambiarLista();
  const a = lista === "partes" ? "a" : "o";
  return { ok: true, mensaje: activo ? `${elemento.nombre} reactivad${a}.` : `${elemento.nombre} desactivad${a}.` };
}

// ---------------------------------------------------------------------------------------------
// HU-40 Mensajes de WhatsApp

function despuesDeCambiarPlantilla() {
  updateTag(ETIQUETA_PLANTILLAS);
  revalidatePath(`${RUTA}/mensajes`);
}

/** Guarda el texto de un mensaje, solo con los campos de ese mensaje. */
export async function guardarPlantilla(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const autor = await exigirModulo("configuracion");
  const valores = { texto: String(datos.get("texto") ?? "") };
  const entrada = esquemaPlantilla.safeParse({ clave: datos.get("clave"), texto: valores.texto });
  if (!entrada.success) {
    const errores = erroresDe(entrada.error);
    // La clave no es un campo del formulario: si no vale, la página quedó vieja
    return errores.clave ? { mensaje: errores.clave } : { errores, valores };
  }
  const { clave, texto } = entrada.data;

  const fila = { clave, texto, updatedAt: new Date(), updatedBy: Number(autor.id) };
  await db.insert(plantillaMensaje).values(fila).onConflictDoUpdate({ target: plantillaMensaje.clave, set: fila });
  despuesDeCambiarPlantilla();
  return { ok: true, mensaje: "Mensaje guardado.", valores: { texto } };
}

/** Vuelve al texto original de un mensaje: sin fila guardada, vale el original. */
export async function restaurarPlantilla(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  await exigirModulo("configuracion");
  const entrada = esquemaClavePlantilla.safeParse({ clave: datos.get("clave") });
  if (!entrada.success) return { mensaje: erroresDe(entrada.error).clave };
  const { clave } = entrada.data;

  await db.delete(plantillaMensaje).where(eq(plantillaMensaje.clave, clave));
  despuesDeCambiarPlantilla();
  return { ok: true, mensaje: "Volvió el texto original.", valores: { texto: PLANTILLAS[clave].original } };
}
