"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { auditoria, categoriaGasto, gasto } from "@/db/esquema";
import { erroresDe, type EstadoFormulario } from "@/lib/formularios";
import { exigirModulo } from "@/lib/sesion";
import { mostrarMonto } from "@/modulos/catalogo/reglas";
import { sucursalPrincipal } from "@/modulos/configuracion/consultas";
import { descartarComprobante, guardarComprobante } from "@/modulos/pagos/comprobante";
import { esquemaAnularGasto, esquemaGasto } from "./esquemas";

// Pedido 16 (P16-reportes-y-gastos.md §6): registrar y anular los gastos del taller. Solo el dueño (el módulo Reportes
// no se asigna a encargados, RN-01). Un gasto no se borra: se anula con su motivo (RN-14). Todo queda en la auditoría.

const RECARGA = "No se pudo leer el pedido. Recarga la página.";

/** La categoría elegida se desactivó o ya no existe: se lanza dentro de la transacción para deshacerla. */
class CategoriaNoActiva extends Error {}

function despuesDeCambiarGastos() {
  revalidatePath("/panel/reportes", "layout");
}

/** Registra un gasto con su comprobante opcional (foto en el bucket privado: es un dato del negocio). */
export async function registrarGasto(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirModulo("reportes");
  const valores = {
    categoriaId: String(datos.get("categoriaId") ?? ""),
    monto: String(datos.get("monto") ?? ""),
    metodo: String(datos.get("metodo") ?? ""),
    fecha: String(datos.get("fecha") ?? ""),
    detalle: String(datos.get("detalle") ?? ""),
  };
  const r = esquemaGasto.safeParse(valores);
  if (!r.success) return { errores: erroresDe(r.error), valores };
  const { categoriaId, monto, metodo, fecha, detalle } = r.data;
  const autorId = Number(usuario.id);

  // La foto se sube antes de guardar; si el gasto no se guarda, se borra
  const foto = await guardarComprobante(datos.get("comprobante"), autorId);
  if (!foto.ok) return { errores: { comprobante: foto.error }, valores };
  const comprobanteId = foto.archivoId;

  let categoria: string;
  try {
    const { id: sucursalId } = await sucursalPrincipal();
    categoria = await db.transaction(async (tx) => {
      // Activa al guardar: la fila queda tomada, así desactivarla en Configuración espera a que el gasto se guarde
      const [c] = await tx
        .select({ nombre: categoriaGasto.nombre })
        .from(categoriaGasto)
        .where(and(eq(categoriaGasto.id, categoriaId), eq(categoriaGasto.activo, true)))
        .for("share");
      if (!c) throw new CategoriaNoActiva();
      const [nuevo] = await tx
        .insert(gasto)
        .values({ sucursalId, categoriaId, monto, metodo, fecha, detalle, comprobanteArchivoId: comprobanteId, createdBy: autorId })
        .returning({ id: gasto.id });
      await tx.insert(auditoria).values({ usuarioId: autorId, entidad: "gasto", entidadId: nuevo.id, accion: "crear", datos: { categoriaId, monto, metodo, fecha, detalle, comprobanteArchivoId: comprobanteId } });
      return c.nombre;
    });
  } catch (error) {
    await descartarComprobante(comprobanteId);
    if (error instanceof CategoriaNoActiva) return { errores: { categoriaId: "Esa categoría ya no está. Elige otra." }, valores };
    throw error;
  }

  despuesDeCambiarGastos();
  return { ok: true, mensaje: `Gasto registrado: ${categoria}, ${mostrarMonto(monto)} Bs.` };
}

/** Anula un gasto con su motivo: queda tachado y deja de contar. Uno ya anulado no se vuelve a anular. */
export async function anularGasto(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirModulo("reportes");
  const valores = { motivo: String(datos.get("motivo") ?? "") };
  const r = esquemaAnularGasto.safeParse({ id: datos.get("id"), ...valores });
  if (!r.success) {
    const errores = erroresDe(r.error);
    return errores.id ? { mensaje: RECARGA } : { errores, valores };
  }
  const { id, motivo } = r.data;
  const autorId = Number(usuario.id);

  const anulado = await db.transaction(async (tx) => {
    const [g] = await tx
      .update(gasto)
      .set({ anulado: true, motivoAnulacion: motivo, anuladoAt: sql`now()`, anuladoPor: autorId })
      .where(and(eq(gasto.id, id), eq(gasto.anulado, false)))
      .returning({ id: gasto.id });
    if (g) await tx.insert(auditoria).values({ usuarioId: autorId, entidad: "gasto", entidadId: id, accion: "anular", datos: { motivo } });
    return !!g;
  });
  if (!anulado) return { mensaje: "Ese gasto ya estaba anulado o no existe. Recarga la página." };

  despuesDeCambiarGastos();
  return { ok: true, mensaje: "Gasto anulado." };
}
