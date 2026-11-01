import type { EstadoTrabajo, EtapaFoto, TipoDetalle } from "@/db/esquema/trabajos";

// Reglas puras de las órdenes (C4). Una orden es una reserva ya recibida (D-1): el mismo `trabajo`.
// Especificación: docs/08-desarrollo/etapas/C4-taller-entrega.md.

export const NOMBRE_ETAPA: Record<EtapaFoto, string> = { ingreso: "Ingreso", antes: "Antes", durante: "Durante", despues: "Después" };
export const MAXIMO_FOTOS_ETAPA = 20;

/**
 * Una orden abierta: recibida, en proceso o lista (se trabaja, se le suben fotos). Aquí y no desde el esquema de la
 * base: estas reglas también corren en el navegador, que no carga Drizzle.
 */
export const ESTADOS_ORDEN_ABIERTA = ["recibido", "en_proceso", "listo"] as const satisfies readonly EstadoTrabajo[];
/** Recibida, en proceso o lista: se trabaja, se le suben fotos y avances, y se puede extender. */
export const estaAbierta = (estado: EstadoTrabajo) => (ESTADOS_ORDEN_ABIERTA as readonly EstadoTrabajo[]).includes(estado);

/**
 * Se le extiende la entrega mientras se trabaja: recibida o en proceso. Una lista ya liberó su espacio (decisión del
 * 20/10); si hace falta más, primero vuelve a en proceso.
 */
export const puedeExtenderse = (estado: EstadoTrabajo) => estado === "recibido" || estado === "en_proceso";

/** Ya se recibió: abierta o entregada (los mismos de la restricción `trabajo_recibido_si_orden`). */
export const esOrden = (estado: EstadoTrabajo) => estaAbierta(estado) || estado === "entregado";

/**
 * Dónde se abre un trabajo (C5 §0): ya recibido, en su orden; si no, en su reserva (D-1). Quien no ve órdenes va siempre
 * a la reserva, que le dice "Esta reserva ya es una orden". Para cualquier lista que muestre trabajos.
 */
export function rutaTrabajo(id: number, estado: EstadoTrabajo, verOrdenes: boolean) {
  return verOrdenes && esOrden(estado) ? (`/panel/ordenes/${id}` as const) : (`/panel/agenda/${id}` as const);
}

/**
 * El enlace "Ver la orden" o "Ver la reserva" a un trabajo, según a dónde lleva (rutaTrabajo), o null si quien mira no
 * puede abrir esa pantalla (la reserva pide "Agenda"; la orden, "Órdenes").
 */
export function enlaceTrabajo(id: number, estado: EstadoTrabajo, ve: { ordenes: boolean; agenda: boolean }) {
  const href = rutaTrabajo(id, estado, ve.ordenes);
  const aLaOrden = href.startsWith("/panel/ordenes/");
  if (!aLaOrden && !ve.agenda) return null;
  return { href, texto: aLaOrden ? "Ver la orden" : "Ver la reserva" };
}

/** Cada estado abierto, con su paso siguiente y el de vuelta (por si se marcó por error). */
const PASOS: Record<(typeof ESTADOS_ORDEN_ABIERTA)[number], { siguiente?: { estado: EstadoTrabajo; texto: string }; anterior?: { estado: EstadoTrabajo; texto: string } }> = {
  recibido: { siguiente: { estado: "en_proceso", texto: "Empezar trabajo" } },
  en_proceso: { siguiente: { estado: "listo", texto: "Marcar listo" }, anterior: { estado: "recibido", texto: "Volver a recibida" } },
  // Listo sigue con la entrega (HU-36): aquí solo se puede volver
  listo: { anterior: { estado: "en_proceso", texto: "Volver a en proceso" } },
};

/** Los botones de estado de una orden abierta: el paso siguiente y el de vuelta. Vacío si no está abierta. */
export function pasosDeOrden(estado: EstadoTrabajo) {
  return estaAbierta(estado) ? PASOS[estado as keyof typeof PASOS] : {};
}

/** Solo un paso adelante o atrás entre recibido, en proceso y listo; "entregado" solo lo pone la entrega (HU-36). */
export function transicionOrden(actual: EstadoTrabajo, nuevo: EstadoTrabajo): boolean {
  const pasos = pasosDeOrden(actual);
  return pasos.siguiente?.estado === nuevo || pasos.anterior?.estado === nuevo;
}

/** Una orden abierta cuya entrega aproximada ya pasó (las listas no: están esperando al cliente). */
export const estaAtrasada = (o: { estado: EstadoTrabajo; fechaFin: string }, hoy: string) => (o.estado === "recibido" || o.estado === "en_proceso") && o.fechaFin < hoy;

/** Una reserva se recibe desde su día de ingreso (en Bolivia): si el cliente llega antes, primero se reprograma. */
export const puedeRecibirse = (r: { estado: EstadoTrabajo; fechaInicio: string }, hoy: string) => r.estado === "agendado" && r.fechaInicio <= hoy;

/**
 * Si a esa etapa todavía se le suben o quitan fotos. Las de ingreso, solo mientras se recibe: después son la prueba de
 * cómo llegó el vehículo (D-6). Las demás, mientras la orden está abierta (no después de la entrega).
 */
export function etapaAbierta(etapa: EtapaFoto, estado: EstadoTrabajo): boolean {
  if (etapa === "ingreso") return estado === "agendado";
  return estaAbierta(estado);
}

/** De dónde sale la foto de antes al publicar en la galería (HU-41): las del ingreso o las de antes de trabajar. */
export const ETAPAS_FOTO_ANTES = ["ingreso", "antes"] as const satisfies readonly EtapaFoto[];
export const esFotoDeAntes = (etapa: EtapaFoto) => (ETAPAS_FOTO_ANTES as readonly EtapaFoto[]).includes(etapa);

/** Se publica en la galería desde una orden entregada con al menos una foto de después (HU-41). */
export const puedePublicarse = (estado: EstadoTrabajo, etapas: readonly EtapaFoto[]) => estado === "entregado" && etapas.includes("despues");

/** Qué tiene una parte al recibir (pedido 12), como se lee en el panel. */
export const NOMBRE_DETALLE: Record<TipoDetalle, string> = { rayon: "Rayón", golpe: "Golpe", raspon: "Raspón", roto: "Roto", otro: "Otro" };
/** Los tipos, del texto de cada uno y no del esquema de la base: así no se arrastra Drizzle al navegador. */
export const TIPOS_DE_DETALLE = Object.keys(NOMBRE_DETALLE) as [TipoDetalle, ...TipoDetalle[]];

/** Qué falta revisar antes de recibir: "Falta revisar Capó en el checklist." o la lista (hasta 4 y "N más"). */
export function textoSinRevisar(partes: readonly string[]): string {
  if (partes.length === 1) return `Falta revisar ${partes[0]} en el checklist.`;
  const lista = partes.length > 4 ? `${partes.slice(0, 4).join(", ")} y ${partes.length - 4} más` : `${partes.slice(0, -1).join(", ")} y ${partes.at(-1)}`;
  return `Faltan revisar ${partes.length} partes del checklist: ${lista}.`;
}
