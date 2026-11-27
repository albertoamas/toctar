"use server";

import { eq, max } from "drizzle-orm";
import { db } from "@/db";
import { faq } from "@/db/esquema";
import { erroresDe, type EstadoFormulario } from "@/lib/formularios";
import { reordenar, type Direccion } from "@/lib/orden";
import { exigirModulo } from "@/lib/sesion";
import { esquemaPregunta } from "../contenido";
import { listarPreguntas } from "../consultas";
import { esquemaId, esquemaMover } from "../esquemas";
import { despuesDeCambiarContenido } from "./comun";

// Sitio web (HU-07 a HU-09; RF-10 a RF-12). Entra el dueño o un encargado con el permiso "sitio". Al guardar se
// invalida lo que muestra el sitio, que se renueva sin volver a desplegar (B4).
// Aquí: las preguntas frecuentes.

/** Agrega (sin id) o edita (con id) una pregunta frecuente. */
export async function guardarPregunta(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  await exigirModulo("sitio");
  const valores = { pregunta: String(datos.get("pregunta") ?? ""), respuesta: String(datos.get("respuesta") ?? "") };
  // "Mostrar en el sitio" viene solo al editar: el texto y si se muestra se guardan juntos, en un solo cambio
  const visible = datos.has("visible") ? datos.get("visible") === "on" : undefined;
  const entrada = esquemaPregunta.safeParse({ ...valores, id: datos.get("id") || undefined, visible });
  if (!entrada.success) return { errores: erroresDe(entrada.error), valores };
  const { id, pregunta, respuesta } = entrada.data;

  if (id) {
    const cambios = entrada.data.visible === undefined ? { pregunta, respuesta } : { pregunta, respuesta, visible: entrada.data.visible };
    const [editada] = await db.update(faq).set(cambios).where(eq(faq.id, id)).returning({ id: faq.id });
    if (!editada) return { mensaje: "Esa pregunta ya no existe. Recarga la página." };
  } else {
    const [{ ultimo }] = await db.select({ ultimo: max(faq.orden) }).from(faq);
    await db.insert(faq).values({ pregunta, respuesta, orden: (ultimo ?? 0) + 1 });
  }

  despuesDeCambiarContenido("preguntas");
  return { ok: true, mensaje: id ? "Pregunta guardada." : "Pregunta agregada." };
}

export async function moverPregunta(datos: { id: number; direccion: Direccion }): Promise<EstadoFormulario> {
  await exigirModulo("sitio");
  const entrada = esquemaMover.safeParse(datos);
  if (!entrada.success) return { mensaje: "No se pudo mover." };
  // Las ocultas también se ordenan: se pueden volver a mostrar en su lugar.
  const preguntas = (await listarPreguntas()).map((p) => ({ ...p, activo: true }));
  const nuevoOrden = reordenar(preguntas, entrada.data.id, entrada.data.direccion);
  if (!nuevoOrden) return { ok: true };
  await db.transaction(async (tx) => {
    for (const o of nuevoOrden) await tx.update(faq).set({ orden: o.orden }).where(eq(faq.id, o.id));
  });
  despuesDeCambiarContenido("preguntas");
  return { ok: true };
}

/** Las preguntas frecuentes no tienen historial: se eliminan de verdad. */
export async function eliminarPregunta(datoId: number): Promise<EstadoFormulario> {
  await exigirModulo("sitio");
  const entrada = esquemaId.safeParse(datoId);
  if (!entrada.success) return { mensaje: "Esa pregunta ya no existe. Recarga la página." };
  const [fila] = await db.delete(faq).where(eq(faq.id, entrada.data)).returning({ id: faq.id });
  if (!fila) return { mensaje: "Esa pregunta ya no existe. Recarga la página." };
  despuesDeCambiarContenido("preguntas");
  return { ok: true, mensaje: "Pregunta eliminada." };
}

// ---------------------------------------------------------------------------------------------
// HU-09 Galería. Al guardar se renueva lo que la muestra (galeriaCambiada).
