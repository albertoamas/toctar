"use server";

import { randomUUID } from "node:crypto";
import { and, count, eq, gt, lte, max, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { archivo, cliente, consulta, consultaArchivo, subidaPendiente, vehiculo } from "@/db/esquema";
import { borrarArchivo, datosArchivoPrivado, urlSubidaPrivada } from "@/lib/almacenamiento";
import { erroresDe, indiceUnicoViolado, type EstadoFormulario } from "@/lib/formularios";
import { eliminarFoto, guardarFoto } from "@/lib/fotos";
import { exigirModulo } from "@/lib/sesion";
import { clienteConTelefono } from "@/modulos/clientes/consultas";
import { esquemaCliente, esquemaVehiculo } from "@/modulos/clientes/esquemas";
import {
  camposConPrefijo,
  erroresConPrefijo,
  leerValores,
  PREFIJO_VEHICULO,
  revisarVehiculo,
  type EstadoCliente,
  type Existentes,
} from "@/modulos/clientes/servidor";
import {
  esquemaArchivoConsulta,
  esquemaConsulta,
  esquemaIdConsulta,
  esquemaNota,
  esquemaPedirSubidaVideo,
  esquemaRegistrarVideo,
  esquemaVehiculoElegido,
} from "./esquemas";
import { BYTES_MAXIMOS_VIDEO, CLIENTE_NUEVO, EXTENSION_VIDEO, MAXIMO_ARCHIVOS, TIPOS_VIDEO, VEHICULO_OTRO } from "./reglas";

// Consultas (HU-24). Entra el dueño o un encargado con el permiso "consultas"; el técnico nunca (RN-12).
// Especificación: docs/08-desarrollo/etapas/C2-consultas-cotizaciones.md §6.

const ERROR_FOTO = "La foto debe ser JPG, PNG o WebP de hasta 5 MB.";
const MENSAJE_LIMITE = `Hasta ${MAXIMO_ARCHIVOS} fotos o videos por consulta.`;
const PEDIDO_ILEGIBLE = "No se pudo leer el pedido. Recarga la página.";
const CONSULTA_INEXISTENTE = "Esa consulta ya no existe. Recarga la página.";
/** El permiso firmado dura 10 minutos; el lugar se guarda un rato más, lo que puede tardar en 4G una subida empezada al final. */
const MINUTOS_SUBIDA_PENDIENTE = 30;

function despuesDeCambiar(id: number, clienteId?: number) {
  revalidatePath("/panel/consultas");
  revalidatePath(`/panel/consultas/${id}`);
  if (clienteId) revalidatePath(`/panel/clientes/${clienteId}`);
}

/**
 * Registra una consulta (HU-24, RF-29). El cliente se elige o se registra ahí mismo (nombre, WhatsApp, placa y tamaño,
 * con las reglas de C1 y su aviso de repetidos, RF-23); el vehículo se elige entre los suyos o se agrega. Todo o nada.
 */
export async function crearConsulta(_previo: EstadoCliente, datos: FormData): Promise<EstadoCliente> {
  const autor = await exigirModulo("consultas");
  const valores = leerValores(datos);
  const errores: Record<string, string> = {};

  const entrada = esquemaConsulta.safeParse(valores);
  if (!entrada.success) Object.assign(errores, erroresDe(entrada.error));
  // El cliente se lee aparte: aunque falte otro dato (el canal), se muestran juntos los errores del cliente y del vehículo
  const delCliente = esquemaConsulta.shape.cliente.safeParse(valores.cliente ?? "");
  const elegido = delCliente.success ? delCliente.data : null;

  // Cliente nuevo: solo lo justo para atenderlo; el resto se completa en su ficha
  let nuevoCliente: { nombre: string; telefono: string } | null = null;
  if (elegido === CLIENTE_NUEVO) {
    const c = esquemaCliente.pick({ nombre: true, telefono: true }).safeParse(valores);
    if (c.success) nuevoCliente = c.data;
    else Object.assign(errores, erroresDe(c.error));
  }

  // Vehículo: con un cliente nuevo siempre es nuevo; con uno registrado, uno suyo u "otro"
  let vehiculoId: number | null = null;
  let nuevoVehiculo: z.output<typeof esquemaVehiculo> | null = null;
  let eleccionVehiculo: number | typeof VEHICULO_OTRO | null = null;
  if (elegido === CLIENTE_NUEVO) eleccionVehiculo = VEHICULO_OTRO;
  else if (elegido !== null) {
    const v = esquemaVehiculoElegido.safeParse(valores.vehiculo ?? "");
    if (v.success) eleccionVehiculo = v.data;
    else errores.vehiculo = v.error.issues[0].message;
  }
  if (eleccionVehiculo === VEHICULO_OTRO) {
    const n = esquemaVehiculo.safeParse(camposConPrefijo(valores, PREFIJO_VEHICULO));
    if (n.success) nuevoVehiculo = n.data;
    else Object.assign(errores, erroresConPrefijo(erroresDe(n.error), PREFIJO_VEHICULO));
  } else vehiculoId = eleccionVehiculo;
  if (!entrada.success || Object.keys(errores).length > 0) return { errores, valores };
  const d = entrada.data;

  // Lo que el esquema no sabe: que el cliente y su vehículo existan y estén activos, y los repetidos (RF-23)
  const existentes: Existentes = {};
  if (typeof d.cliente === "number") {
    const [c] = await db.select({ id: cliente.id }).from(cliente).where(and(eq(cliente.id, d.cliente), eq(cliente.activo, true)));
    if (!c) return { errores: { cliente: "Ese cliente ya no está activo. Elige otro." }, valores };
    if (vehiculoId) {
      const [suyo] = await db
        .select({ id: vehiculo.id })
        .from(vehiculo)
        .where(and(eq(vehiculo.id, vehiculoId), eq(vehiculo.clienteId, d.cliente), eq(vehiculo.activo, true)));
      if (!suyo) errores.vehiculo = "Elige el vehículo.";
    }
  } else if (nuevoCliente) {
    const conTelefono = await clienteConTelefono(nuevoCliente.telefono);
    if (conTelefono) {
      errores.telefono = `Ese número ya es de ${conTelefono.nombre}.`;
      existentes.telefono = conTelefono;
    }
  }
  if (nuevoVehiculo) await revisarVehiculo(nuevoVehiculo, PREFIJO_VEHICULO, errores, existentes);
  if (Object.keys(errores).length > 0) return { errores, valores, existentes };

  const creadoPor = Number(autor.id);
  let ids: { consulta: number; cliente: number };
  try {
    ids = await db.transaction(async (tx) => {
      let clienteId: number;
      if (typeof d.cliente === "number") {
        clienteId = d.cliente;
        // Un cliente que consulta sube en la lista de recientes de Clientes
        await tx.update(cliente).set({ updatedAt: sql`now()` }).where(eq(cliente.id, clienteId));
      } else {
        const [c] = await tx
          .insert(cliente)
          .values({ ...nuevoCliente!, createdBy: creadoPor, updatedBy: creadoPor })
          .returning({ id: cliente.id });
        clienteId = c.id;
      }
      if (nuevoVehiculo) {
        const [v] = await tx.insert(vehiculo).values({ ...nuevoVehiculo, clienteId, createdBy: creadoPor }).returning({ id: vehiculo.id });
        vehiculoId = v.id;
      }
      const [nueva] = await tx
        .insert(consulta)
        .values({ clienteId, vehiculoId: vehiculoId!, servicioId: d.servicioId, canal: d.canal, nota: d.nota, createdBy: creadoPor })
        .returning({ id: consulta.id });
      return { consulta: nueva.id, cliente: clienteId };
    });
  } catch (error) {
    // Dos personas registrando lo mismo a la vez: lo frena el índice único
    const indice = indiceUnicoViolado(error);
    if (indice === "cliente_telefono_unico") return { errores: { telefono: "Ese número ya está registrado. Busca al cliente." }, valores };
    if (indice === "vehiculo_placa_unica") return { errores: { [`${PREFIJO_VEHICULO}placa`]: "Esa placa ya está registrada. Busca al cliente." }, valores };
    throw error;
  }

  despuesDeCambiar(ids.consulta, ids.cliente);
  revalidatePath("/panel/clientes");
  redirect(`/panel/consultas/${ids.consulta}?creada=1`);
}

type Conexion = Pick<typeof db, "select">;

/** Lugares ocupados: archivos de la consulta más los videos con permiso de subida vigente (todavía subiendo). */
async function ocupados(base: Conexion, id: number): Promise<number> {
  const [[{ archivos }], [{ pendientes }]] = await Promise.all([
    base.select({ archivos: count() }).from(consultaArchivo).where(eq(consultaArchivo.consultaId, id)),
    base
      .select({ pendientes: count() })
      .from(subidaPendiente)
      .where(and(eq(subidaPendiente.consultaId, id), gt(subidaPendiente.expiraAt, sql`now()`))),
  ]);
  return archivos + pendientes;
}

/** La consulta y si le queda lugar: antes de subir, para no procesar algo que no va a entrar. */
async function lugarParaArchivo(id: number): Promise<{ clienteId: number; hayLugar: boolean } | null> {
  const [actual] = await db.select({ clienteId: consulta.clienteId }).from(consulta).where(eq(consulta.id, id));
  return actual ? { clienteId: actual.clienteId, hayLugar: (await ocupados(db, id)) < MAXIMO_ARCHIVOS } : null;
}

/** Suma a la consulta un archivo ya guardado; false si en el camino se llenó (y entonces no queda registrado). */
async function vincularArchivo(id: number, archivoId: number): Promise<boolean> {
  return db.transaction(async (tx) => {
    // Candado sobre la consulta: dos subidas a la vez no pasan juntas el límite
    await tx.select({ id: consulta.id }).from(consulta).where(eq(consulta.id, id)).for("update");
    if ((await ocupados(tx, id)) >= MAXIMO_ARCHIVOS) return false;
    const [{ ultimo }] = await tx.select({ ultimo: max(consultaArchivo.orden) }).from(consultaArchivo).where(eq(consultaArchivo.consultaId, id));
    await tx.insert(consultaArchivo).values({ consultaId: id, archivoId, orden: (ultimo ?? -1) + 1 });
    await tx.update(consulta).set({ ultimoMovimientoAt: sql`now()` }).where(eq(consulta.id, id));
    return true;
  });
}

/** Borra los permisos vencidos y lo que se haya alcanzado a subir con ellos: no queda nada suelto en el almacenamiento. */
async function limpiarSubidasVencidas() {
  const vencidas = await db.delete(subidaPendiente).where(lte(subidaPendiente.expiraAt, sql`now()`)).returning({ clave: subidaPendiente.clave });
  await Promise.allSettled(vencidas.map((v) => borrarArchivo(v.clave, "privado")));
}

/** Agrega una foto a la consulta (RF-29): achicada en el navegador, WebP en el servidor y en el bucket privado. */
export async function subirArchivoConsulta(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const autor = await exigirModulo("consultas");
  const entrada = esquemaIdConsulta.safeParse(datos.get("id"));
  if (!entrada.success) return { mensaje: PEDIDO_ILEGIBLE };
  const id = entrada.data;

  const lugar = await lugarParaArchivo(id);
  if (!lugar) return { mensaje: CONSULTA_INEXISTENTE };
  if (!lugar.hayLugar) return { errores: { foto: MENSAJE_LIMITE } };

  const r = await guardarFoto(datos.get("foto"), { carpeta: "consultas", miniatura: true, autorId: Number(autor.id), privado: true });
  if (!r.ok) return { errores: { foto: r.motivo === "vacia" ? "Elige una foto." : ERROR_FOTO } };
  if (!(await vincularArchivo(id, r.archivoId))) {
    await eliminarFoto(r.archivoId);
    return { errores: { foto: MENSAJE_LIMITE } };
  }

  despuesDeCambiar(id, lugar.clienteId);
  return { ok: true, mensaje: "Foto agregada." };
}

export type PermisoSubida = { ok: true; url: string; clave: string } | { ok: false; mensaje: string };

/**
 * Primer paso para agregar un video (RF-29, RNF-07): un permiso firmado de 10 minutos para subirlo directo al bucket
 * privado. Una acción del servidor acepta hasta 6 MB y un video llega a 50. El tipo y el tamaño quedan firmados.
 */
export async function pedirSubidaVideo(datos: { consultaId: number; tipo: string; bytes: number; duracion: number }): Promise<PermisoSubida> {
  const autor = await exigirModulo("consultas");
  const entrada = esquemaPedirSubidaVideo.safeParse(datos);
  if (!entrada.success) return { ok: false, mensaje: entrada.error.issues[0].message };
  const { consultaId, tipo, bytes } = entrada.data;
  await limpiarSubidasVencidas();

  // El permiso queda anotado y ocupa un lugar hasta que se registra o vence: así no se pueden pedir permisos sin fin
  const clave = `consultas/${randomUUID()}.${EXTENSION_VIDEO[tipo]}`;
  const resultado = await db.transaction(async (tx) => {
    const [existe] = await tx.select({ id: consulta.id }).from(consulta).where(eq(consulta.id, consultaId)).for("update");
    if (!existe) return CONSULTA_INEXISTENTE;
    if ((await ocupados(tx, consultaId)) >= MAXIMO_ARCHIVOS) return MENSAJE_LIMITE;
    await tx.insert(subidaPendiente).values({ clave, consultaId, createdBy: Number(autor.id), expiraAt: sql`now() + make_interval(mins => ${MINUTOS_SUBIDA_PENDIENTE})` });
    return null;
  });
  if (resultado) return { ok: false, mensaje: resultado };
  return { ok: true, url: await urlSubidaPrivada(clave, tipo, bytes), clave };
}

/**
 * Segundo paso: el video ya está en el almacenamiento y se registra en la consulta. Solo con un permiso vigente de esa
 * consulta. Se mira lo que de verdad se subió (tipo y tamaño), no lo que dice el navegador. Si no entra, se borra.
 */
export async function registrarVideo(datos: { consultaId: number; clave: string; duracion: number }): Promise<EstadoFormulario> {
  const autor = await exigirModulo("consultas");
  const entrada = esquemaRegistrarVideo.safeParse(datos);
  if (!entrada.success) return { mensaje: PEDIDO_ILEGIBLE };
  const { consultaId, clave, duracion } = entrada.data;

  // El permiso se usa una vez: al registrar (o al fallar) deja de ocupar lugar
  const [permiso] = await db
    .delete(subidaPendiente)
    .where(and(eq(subidaPendiente.clave, clave), eq(subidaPendiente.consultaId, consultaId), gt(subidaPendiente.expiraAt, sql`now()`)))
    .returning({ clave: subidaPendiente.clave });
  if (!permiso) return { mensaje: "El permiso para subir el video venció. Vuelve a intentar." };

  const subido = await datosArchivoPrivado(clave);
  if (!subido) return { mensaje: "El video no terminó de subir. Vuelve a intentar." };
  if (!(TIPOS_VIDEO as readonly string[]).includes(subido.tipo) || subido.bytes > BYTES_MAXIMOS_VIDEO) {
    await borrarArchivo(clave, "privado");
    return { mensaje: PEDIDO_ILEGIBLE };
  }

  const [{ id: archivoId }] = await db
    .insert(archivo)
    .values({ clave, tipoMime: subido.tipo, bytes: subido.bytes, privado: true, duracionSegundos: Math.round(duracion), createdBy: Number(autor.id) })
    .returning({ id: archivo.id });
  if (!(await vincularArchivo(consultaId, archivoId))) {
    await eliminarFoto(archivoId);
    return { mensaje: MENSAJE_LIMITE };
  }

  despuesDeCambiar(consultaId);
  return { ok: true, mensaje: "Video agregado." };
}

/** Quita una foto o un video de la consulta y del almacenamiento. Desde HU-25, no si la usa una cotización (D-6). */
export async function quitarArchivoConsulta(datos: { consultaId: number; archivoId: number }): Promise<EstadoFormulario> {
  await exigirModulo("consultas");
  const entrada = esquemaArchivoConsulta.safeParse(datos);
  if (!entrada.success) return { mensaje: PEDIDO_ILEGIBLE };
  const { consultaId, archivoId } = entrada.data;

  const [quitado] = await db
    .delete(consultaArchivo)
    .where(and(eq(consultaArchivo.consultaId, consultaId), eq(consultaArchivo.archivoId, archivoId)))
    .returning({ archivoId: consultaArchivo.archivoId });
  if (!quitado) return { mensaje: "Esa foto ya no está en la consulta. Recarga la página." };
  await eliminarFoto(archivoId);

  despuesDeCambiar(consultaId);
  return { ok: true, mensaje: "Quitado." };
}

/** Guarda la nota de la consulta: cuenta como movimiento (RF-35). */
export async function guardarNota(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  await exigirModulo("consultas");
  const valores = { nota: String(datos.get("nota") ?? "") };
  const entrada = esquemaNota.safeParse({ id: datos.get("id"), ...valores });
  if (!entrada.success) return { errores: erroresDe(entrada.error), valores };
  const { id, nota } = entrada.data;

  const [actualizada] = await db
    .update(consulta)
    .set({ nota, ultimoMovimientoAt: sql`now()` })
    .where(eq(consulta.id, id))
    .returning({ id: consulta.id });
  if (!actualizada) return { mensaje: CONSULTA_INEXISTENTE };

  despuesDeCambiar(id);
  return { ok: true, mensaje: "Nota guardada." };
}
