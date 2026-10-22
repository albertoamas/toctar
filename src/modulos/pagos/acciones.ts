"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { auditoria, pago, trabajo, trabajoLinea } from "@/db/esquema";
import { erroresDe, type EstadoFormulario } from "@/lib/formularios";
import { exigirModulo } from "@/lib/sesion";
import { mostrarMonto } from "@/modulos/catalogo/reglas";
import { montoNoMayor } from "@/modulos/cotizaciones/reglas";
import { descartarComprobante, guardarComprobante } from "./comprobante";
import { esquemaAnularPago, esquemaPago } from "./esquemas";
import { calcularSaldo, estaPagada } from "./reglas";

// Pagos de una reserva (HU-32, RF-45, RF-46). Dueño o encargado con "Pagos"; el técnico nunca (RN-12). Un pago no
// pasa el saldo pendiente y no se borra: se anula con motivo (D-6). Todo queda en la auditoría (RNF-10).

const RECARGA = "No se pudo leer el pedido. Recarga la página.";
const CAMBIO = "Esa reserva cambió recién. Recarga la página.";

/** Algo cambió entre la revisión y la escritura: se lanza dentro de la transacción para deshacerla entera. Con
 * `campo`, el error va junto a ese campo; sin él, arriba del formulario. */
class Conflicto extends Error {
  constructor(
    mensaje: string,
    readonly campo?: string,
  ) {
    super(mensaje);
  }
}

function despuesDePagar(trabajoId: number, clienteId: number) {
  revalidatePath(`/panel/agenda/${trabajoId}`);
  revalidatePath(`/panel/clientes/${clienteId}`);
}

/** Registra un pago con su comprobante opcional (foto en el bucket privado: es un dato del cliente). */
export async function registrarPago(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirModulo("pagos");
  const valores = {
    monto: String(datos.get("monto") ?? ""),
    tipo: String(datos.get("tipo") ?? ""),
    metodo: String(datos.get("metodo") ?? ""),
    fecha: String(datos.get("fecha") ?? ""),
  };
  const r = esquemaPago.safeParse({ trabajoId: datos.get("trabajoId"), ...valores });
  if (!r.success) {
    const errores = erroresDe(r.error);
    return errores.trabajoId ? { mensaje: RECARGA } : { errores, valores };
  }
  const { trabajoId, monto, tipo, metodo, fecha } = r.data;
  const autorId = Number(usuario.id);

  // La foto se sube antes de la transacción; si el pago no se guarda, se borra
  const foto = await guardarComprobante(datos.get("comprobante"), autorId);
  if (!foto.ok) return { errores: { comprobante: foto.error }, valores };
  const comprobanteId = foto.archivoId;

  let resultado: { clienteId: number; saldo: string };
  try {
    resultado = await db.transaction(async (tx) => {
      // Bloquea la reserva: dos pagos a la vez no pasan juntos el saldo
      const [t] = await tx
        .select({ estado: trabajo.estado, clienteId: trabajo.clienteId, descuento: trabajo.descuento })
        .from(trabajo)
        .where(eq(trabajo.id, trabajoId))
        .for("update");
      if (!t) throw new Conflicto("Esa reserva ya no existe.");
      if (t.estado === "cancelado") throw new Conflicto("Una reserva cancelada no recibe pagos.");
      const [lineas, pagos] = await Promise.all([
        tx.select({ precio: trabajoLinea.precio }).from(trabajoLinea).where(eq(trabajoLinea.trabajoId, trabajoId)),
        tx.select({ monto: pago.monto, anulado: pago.anulado }).from(pago).where(eq(pago.trabajoId, trabajoId)),
      ]);
      const { saldo } = calcularSaldo(
        lineas.map((l) => l.precio),
        t.descuento,
        pagos,
      );
      if (estaPagada(saldo)) throw new Conflicto("Esa reserva ya está pagada.");
      if (!montoNoMayor(monto, saldo)) throw new Conflicto(`El pago no puede ser mayor que el saldo (${mostrarMonto(saldo)} Bs).`, "monto");

      const [nuevo] = await tx
        .insert(pago)
        .values({ trabajoId, monto, metodo, tipo, fecha, comprobanteArchivoId: comprobanteId, createdBy: autorId })
        .returning({ id: pago.id });
      await tx.insert(auditoria).values({ usuarioId: autorId, entidad: "pago", entidadId: nuevo.id, accion: "crear", datos: { trabajoId, monto, tipo, metodo, fecha, comprobanteArchivoId: comprobanteId } });
      const despues = calcularSaldo(lineas.map((l) => l.precio), t.descuento, [...pagos, { monto, anulado: false }]);
      return { clienteId: t.clienteId, saldo: despues.saldo };
    });
  } catch (error) {
    await descartarComprobante(comprobanteId);
    if (error instanceof Conflicto) return error.campo ? { errores: { [error.campo]: error.message }, valores } : { mensaje: error.message };
    throw error;
  }

  despuesDePagar(trabajoId, resultado.clienteId);
  return { ok: true, mensaje: `Pago de ${mostrarMonto(monto)} Bs registrado. Saldo: ${mostrarMonto(resultado.saldo)} Bs.` };
}

/** Anula un pago con motivo (D-6): no se borra y deja de contar para el saldo. */
export async function anularPago(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirModulo("pagos");
  const valores = { motivo: String(datos.get("motivo") ?? "") };
  const r = esquemaAnularPago.safeParse({ id: datos.get("id"), ...valores });
  if (!r.success) {
    const errores = erroresDe(r.error);
    return errores.id ? { mensaje: RECARGA } : { errores, valores };
  }
  const { id, motivo } = r.data;
  const autorId = Number(usuario.id);

  let suyo: { trabajoId: number; clienteId: number };
  try {
    suyo = await db.transaction(async (tx) => {
      const [p] = await tx
        .select({ trabajoId: pago.trabajoId, clienteId: trabajo.clienteId, estado: trabajo.estado })
        .from(pago)
        .innerJoin(trabajo, eq(pago.trabajoId, trabajo.id))
        .where(eq(pago.id, id))
        .for("update", { of: trabajo });
      if (!p) throw new Conflicto("Ese pago ya no existe.");
      // Una reserva cancelada se ve con sus pagos, sin acciones: el adelanto quedó como ingreso (RN-05)
      if (p.estado === "cancelado") throw new Conflicto("Los pagos de una reserva cancelada no se anulan.");
      const [anulado] = await tx
        .update(pago)
        .set({ anulado: true, motivoAnulacion: motivo, anuladoAt: sql`now()`, anuladoPor: autorId })
        .where(and(eq(pago.id, id), eq(pago.anulado, false)))
        .returning({ id: pago.id });
      if (!anulado) throw new Conflicto(CAMBIO);
      await tx.insert(auditoria).values({ usuarioId: autorId, entidad: "pago", entidadId: id, accion: "anular", datos: { trabajoId: p.trabajoId, motivo } });
      return { trabajoId: p.trabajoId, clienteId: p.clienteId };
    });
  } catch (error) {
    if (error instanceof Conflicto) return { mensaje: error.message };
    throw error;
  }

  despuesDePagar(suyo.trabajoId, suyo.clienteId);
  return { ok: true, mensaje: "Pago anulado." };
}
