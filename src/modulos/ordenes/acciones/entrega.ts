"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect, RedirectType } from "next/navigation";
import { db } from "@/db";
import { auditoria, pago, trabajo, trabajoAvance, trabajoLinea } from "@/db/esquema";
import { fechaEnBolivia } from "@/lib/fechas";
import { eliminarFoto, guardarFoto } from "@/lib/fotos";
import { erroresDe, type EstadoFormulario } from "@/lib/formularios";
import { puede, puedeVerModulo } from "@/lib/permisos";
import { exigirModulo } from "@/lib/sesion";
import { mostrarMonto } from "@/modulos/catalogo/reglas";
import { calcularSaldo, estaPagada } from "@/modulos/pagos/reglas";
import { aplicarPlanesAlEntregar } from "@/modulos/mantenimientos/planes";
import { esquemaEntregar } from "../esquemas";
import { conDesde, sinElTrabajo } from "@/lib/volver";
import { Conflicto, RECARGA, despuesDeCambiar } from "./comun";

// Órdenes (C4): Entregar el vehículo: la firma, el saldo y lo que pasa al entregar (HU-35, P13).
// Entra el dueño o el encargado con "Órdenes" (pedido 32). Especificación: docs/08-desarrollo/etapas/C4-taller-entrega.md.

/** La firma es un PNG chico (un dibujo a mano): más que esto no es una firma del recuadro. */
const BYTES_MAXIMOS_FIRMA = 1024 * 1024;

const FIRMA_ILEGIBLE = "No se pudo leer la firma. Bórrala y vuelve a firmar.";

const SALDO_SIN_PERMISO = "Queda saldo pendiente: la entrega con saldo la autoriza el dueño o quien tenga el permiso.";

/**
 * Entrega el vehículo (HU-36, RF-43, RF-49, CU-19). Con saldo pendiente, solo el dueño o un encargado con "autorizar
 * entrega con saldo", y queda quién lo autorizó (RN-13). El saldo se vuelve a calcular con la orden bloqueada: un pago
 * o un adicional a último momento cuenta. Los planes de mantenimiento del vehículo (RN-08, pedido 21): el que se hizo
 * queda hecho y nace el siguiente; un servicio con mantenimiento en el catálogo crea el suyo.
 */
export async function entregarVehiculo(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirModulo("ordenes");
  if (!puede(usuario, "entregar_vehiculo")) return { mensaje: "El vehículo lo entrega el dueño o el encargado." };
  const firma = datos.get("firma");
  const conFirma = firma instanceof File && firma.size > 0;
  const valores = {
    firmaNombre: String(datos.get("firmaNombre") ?? ""),
    sinFirma: String(datos.get("sinFirma") ?? ""),
    sinFirmaMotivo: String(datos.get("sinFirmaMotivo") ?? ""),
  };
  const r = esquemaEntregar.safeParse({
    id: datos.get("id"),
    conSaldo: datos.get("conSaldo") ?? undefined,
    conFirma,
    firmaNombre: valores.firmaNombre,
    sinFirma: valores.sinFirma || undefined,
    sinFirmaMotivo: valores.sinFirmaMotivo,
  });
  if (!r.success) {
    const errores = erroresDe(r.error);
    return errores.id || errores.conSaldo || errores.sinFirma ? { mensaje: RECARGA } : { errores, valores };
  }
  const { id, conSaldo, sinFirma } = r.data;
  // Sin firma, ni el nombre: el motivo dice quién o por qué
  const firmaNombre = sinFirma ? null : r.data.firmaNombre;
  const sinFirmaMotivo = sinFirma ? r.data.sinFirmaMotivo : null;
  const autorId = Number(usuario.id);
  const hoy = fechaEnBolivia();

  // La firma, antes de la transacción (se convierte y se sube); si la entrega no se completa, se borra
  let firmaArchivoId: number | null = null;
  if (!sinFirma && conFirma) {
    if (firma.size > BYTES_MAXIMOS_FIRMA) return { errores: { firma: FIRMA_ILEGIBLE }, valores };
    const g = await guardarFoto(firma, { carpeta: "firmas", autorId, privado: true, ladoMayor: 1200 });
    if (!g.ok) return { errores: { firma: FIRMA_ILEGIBLE }, valores };
    firmaArchivoId = g.archivoId;
  }

  let resultado: { clienteId: number; saldo: string | null; conMantenimiento: boolean };
  try {
    resultado = await db.transaction(async (tx) => {
      const [t] = await tx
        .select({ estado: trabajo.estado, descuento: trabajo.descuento, clienteId: trabajo.clienteId, vehiculoId: trabajo.vehiculoId })
        .from(trabajo)
        .where(eq(trabajo.id, id))
        .for("update");
      if (!t) throw new Conflicto("Esa orden ya no existe.");
      if (t.estado !== "listo") throw new Conflicto("Solo se entrega una orden lista.");
      const [lineas, pagos] = await Promise.all([
        tx.select({ precio: trabajoLinea.precio }).from(trabajoLinea).where(eq(trabajoLinea.trabajoId, id)),
        tx.select({ monto: pago.monto, anulado: pago.anulado }).from(pago).where(eq(pago.trabajoId, id)),
      ]);
      const { saldo } = calcularSaldo(
        lineas.map((l) => l.precio),
        t.descuento,
        pagos,
      );
      const conDeuda = !estaPagada(saldo);
      if (conDeuda && !puede(usuario, "entrega_con_saldo")) throw new Conflicto(SALDO_SIN_PERMISO);
      if (conDeuda && !conSaldo) {
        // El monto, solo a quien ve pagos (RN-12); el error va con la casilla, que así aparece aunque al abrir no hubiera saldo
        const monto = puedeVerModulo(usuario, "pagos") ? ` de ${mostrarMonto(saldo)} Bs` : "";
        throw new Conflicto(`Queda un saldo${monto}: marca «Entregar con saldo pendiente» para confirmar.`, "conSaldo");
      }

      await tx
        .update(trabajo)
        .set({
          estado: "entregado",
          entregadoAt: sql`now()`,
          entregadoPor: autorId,
          entregaConSaldoAutorizadaPor: conDeuda ? autorId : null,
          saldoAlEntregar: saldo,
          firmaArchivoId,
          firmaNombre,
          sinFirmaMotivo,
          // El día en que salió: antes de la entrega aproximada, la agenda deja de mostrarlo esos días; después (se
          // atrasó), lo muestra hasta ese día (pedido 28). Entregada ya no ocupa el espacio: no choca con otra reserva
          fechaFin: sql`greatest(${trabajo.fechaInicio}, ${hoy}::date)`,
          updatedAt: sql`now()`,
        })
        .where(eq(trabajo.id, id));

      // RN-08 (pedido 21): los planes de mantenimiento del vehículo, en la misma transacción
      const planes = await aplicarPlanesAlEntregar(tx, { trabajoId: id, clienteId: t.clienteId, vehiculoId: t.vehiculoId, hoy });

      // En la historia sin el monto: la ve también quien no tiene Pagos (RN-12)
      await tx.insert(trabajoAvance).values({ trabajoId: id, usuarioId: autorId, nota: conDeuda ? "Vehículo entregado con saldo pendiente." : "Vehículo entregado." });
      await tx.insert(auditoria).values({
        usuarioId: autorId,
        entidad: "trabajo",
        entidadId: id,
        accion: "entregar",
        datos: { saldo, conSaldo: conDeuda, conFirma: firmaArchivoId !== null, sinFirmaMotivo, mantenimientosHechos: planes.hechos, mantenimientosNuevos: planes.nuevos },
      });
      return { clienteId: t.clienteId, saldo: conDeuda ? saldo : null, conMantenimiento: planes.hechos.length + planes.nuevos.length > 0 };
    });
  } catch (error) {
    // Sin la entrega, la firma no es de nadie: se borra
    if (firmaArchivoId) await eliminarFoto(firmaArchivoId).catch((e) => console.error("No se pudo borrar la firma", e));
    if (error instanceof Conflicto) return error.campo ? { errores: { [error.campo]: error.message }, valores } : { mensaje: error.message, valores };
    throw error;
  }

  despuesDeCambiar(id, resultado.clienteId);
  if (resultado.conMantenimiento) revalidatePath("/panel/mantenimientos");
  redirect(conDesde(`/panel/ordenes/${id}?entregado=1`, sinElTrabajo(String(datos.get("volver") ?? ""), id)), RedirectType.replace);
}
