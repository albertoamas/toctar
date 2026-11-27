"use server";

import { and, count, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { trabajo, trabajoFoto, vehiculo } from "@/db/esquema";
import { eliminarFoto, guardarFoto } from "@/lib/fotos";
import { type EstadoFormulario } from "@/lib/formularios";
import { exigirModulo } from "@/lib/sesion";
import type { EstadoTrabajo, EtapaFoto } from "@/db/esquema/trabajos";
import { esquemaFotoOrden, esquemaQuitarFotoOrden } from "../esquemas";
import { etapaAbierta, puedeQuitarFoto, MAXIMO_FOTOS_ETAPA, FRASE_ETAPA } from "../reglas";
import { Conflicto, ERROR_FOTO, RECARGA, despuesDeCambiar } from "./comun";

// Órdenes (C4): Las fotos de la orden: subirlas y quitarlas (RF-40, RF-42).
// Entra el dueño o el encargado con "Órdenes" (pedido 32). Especificación: docs/08-desarrollo/etapas/C4-taller-entrega.md.

/** Si a esa etapa se le puede sumar una foto ahora (inicio o final, con la orden abierta). Devuelve el motivo si no. */
function motivoSinFoto(etapa: EtapaFoto, estado: EstadoTrabajo, fotos: number): string | null {
  if (!etapaAbierta(etapa, estado)) return `Ya no se agregan fotos ${FRASE_ETAPA[etapa]}.`;
  if (fotos >= MAXIMO_FOTOS_ETAPA) return `Hasta ${MAXIMO_FOTOS_ETAPA} fotos por etapa.`;
  return null;
}

const contarFotos = (base: Pick<typeof db, "select">, trabajoId: number, etapa: EtapaFoto) =>
  base
    .select({ fotos: count() })
    .from(trabajoFoto)
    .where(and(eq(trabajoFoto.trabajoId, trabajoId), eq(trabajoFoto.etapa, etapa)))
    .then(([{ fotos }]) => fotos);

/** Agrega una foto a una etapa de la orden (RF-40, RF-42): achicada en el navegador, WebP en el servidor, bucket privado. */
export async function subirFotoOrden(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirModulo("ordenes");
  const entrada = esquemaFotoOrden.safeParse({ trabajoId: datos.get("trabajoId"), etapa: datos.get("etapa") });
  if (!entrada.success) return { mensaje: RECARGA };
  const { trabajoId, etapa } = entrada.data;

  const [t] = await db
    .select({ estado: trabajo.estado, clienteId: trabajo.clienteId })
    .from(trabajo)
    .where(eq(trabajo.id, trabajoId));
  if (!t) return { mensaje: "Esa orden ya no existe." };
  // Antes de procesar la foto: si no va a entrar, ni se convierte ni se sube
  const antes = motivoSinFoto(etapa, t.estado, await contarFotos(db, trabajoId, etapa));
  if (antes) return { errores: { foto: antes } };

  const autorId = Number(usuario.id);
  const r = await guardarFoto(datos.get("foto"), { carpeta: "ordenes", miniatura: true, autorId, privado: true });
  if (!r.ok) return { errores: { foto: r.motivo === "vacia" ? "Elige una foto." : ERROR_FOTO } };
  try {
    await db.transaction(async (tx) => {
      // Candado sobre la orden: dos subidas a la vez no pasan juntas el límite, y el estado no cambia en el medio
      const [actual] = await tx.select({ estado: trabajo.estado }).from(trabajo).where(eq(trabajo.id, trabajoId)).for("update");
      if (!actual) throw new Conflicto("Esa orden ya no existe.");
      const motivo = motivoSinFoto(etapa, actual.estado, await contarFotos(tx, trabajoId, etapa));
      if (motivo) throw new Conflicto(motivo);
      await tx.insert(trabajoFoto).values({ trabajoId, archivoId: r.archivoId, etapa, subidoPor: autorId });
      // La primera de "antes" (el auto como llegó), si el vehículo no tiene foto, pasa a ser la suya (pedido 58): el mismo archivo.
      // Si después se quita de la orden, el vehículo queda sin foto (la columna es "on delete set null")
      if (etapa === "antes") {
        await tx
          .update(vehiculo)
          .set({ fotoArchivoId: r.archivoId })
          .where(and(isNull(vehiculo.fotoArchivoId), eq(vehiculo.id, tx.select({ id: trabajo.vehiculoId }).from(trabajo).where(eq(trabajo.id, trabajoId)))));
      }
    });
  } catch (error) {
    // Sin la fila en la orden, la foto no la encontraría nadie: se borra
    await eliminarFoto(r.archivoId).catch((e) => console.error("No se pudo borrar la foto de la orden", e));
    if (error instanceof Conflicto) return { errores: { foto: error.message } };
    throw error;
  }

  despuesDeCambiar(trabajoId, t.clienteId);
  return { ok: true, mensaje: "Foto guardada." };
}

/** Quita una foto: solo mientras su etapa está abierta, y solo quien la subió o el dueño (D-6). */
export async function quitarFotoOrden(datos: { trabajoId: number; fotoId: number }): Promise<EstadoFormulario> {
  const usuario = await exigirModulo("ordenes");
  const entrada = esquemaQuitarFotoOrden.safeParse(datos);
  if (!entrada.success) return { mensaje: RECARGA };
  const { trabajoId, fotoId } = entrada.data;

  const [f] = await db
    .select({ archivoId: trabajoFoto.archivoId, etapa: trabajoFoto.etapa, subidoPor: trabajoFoto.subidoPor, estado: trabajo.estado, clienteId: trabajo.clienteId })
    .from(trabajoFoto)
    .innerJoin(trabajo, eq(trabajoFoto.trabajoId, trabajo.id))
    .where(and(eq(trabajoFoto.id, fotoId), eq(trabajoFoto.trabajoId, trabajoId)));
  if (!f) return { mensaje: "Esa foto ya no está." };
  if (usuario.rol !== "dueno" && f.subidoPor !== Number(usuario.id)) return { mensaje: "Solo quien subió la foto, o el dueño, la puede quitar." };
  if (!puedeQuitarFoto(f.etapa, f.estado)) return { mensaje: "Esa foto ya no se puede quitar." };

  const borrada = await db.transaction(async (tx) => {
    const [actual] = await tx.select({ estado: trabajo.estado }).from(trabajo).where(eq(trabajo.id, trabajoId)).for("update");
    if (!actual || !puedeQuitarFoto(f.etapa, actual.estado)) return false;
    const [fila] = await tx.delete(trabajoFoto).where(eq(trabajoFoto.id, fotoId)).returning({ id: trabajoFoto.id });
    return !!fila;
  });
  if (!borrada) return { mensaje: "Esa foto ya no se puede quitar." };
  await eliminarFoto(f.archivoId).catch((e) => console.error("No se pudo borrar la foto de la orden", e));

  despuesDeCambiar(trabajoId, f.clienteId);
  return { ok: true, mensaje: "Foto quitada." };
}
