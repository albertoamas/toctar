"use server";

import { and, eq, inArray, like, max, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import {
  archivo,
  auditoria,
  consulta,
  consultaArchivo,
  correlativo,
  cotizacion,
  cotizacionFoto,
  cotizacionLinea,
  servicio,
  variante,
  vehiculo,
} from "@/db/esquema";
import { erroresDe, type EstadoFormulario } from "@/lib/formularios";
import { exigirModulo } from "@/lib/sesion";
import { preciosVigentes } from "@/modulos/catalogo/consultas";
import type { Monto } from "@/modulos/catalogo/reglas";
import { obtenerParametros } from "@/modulos/configuracion/consultas";
import { NOMBRE_ESTADO, transicionPermitida } from "@/modulos/consultas/reglas";
import { entradaCotizacion, esquemaCotizacion } from "./esquemas";
import { datosDocumento } from "./consultas";
import { generarPdf } from "./pdf/generar";
import { anioCotizacion, calcularTotales, claveCorrelativo, descripcionLinea, numeroCotizacion, precioSugerido } from "./reglas";

// Cotizaciones (HU-25). Solo el dueño (RN-01): exigirModulo("cotizaciones") no tiene permiso de encargado.
// Una cotización enviada no cambia (RN-02, RF-34): no hay acción de editar. Corregirla crea la versión siguiente con el
// mismo número, y la anterior queda "reemplazada". Especificación: docs/08-desarrollo/etapas/C2-consultas-cotizaciones.md §6.

/**
 * Guarda la cotización (o la versión nueva) y pasa la consulta a "cotizado". Los totales se recalculan acá; las
 * descripciones, los precios sugeridos y los textos de Configuración se copian (D-4). Todo en una transacción.
 */
export async function guardarCotizacion(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const autor = await exigirModulo("cotizaciones");
  const entrada = entradaCotizacion(datos);
  const r = esquemaCotizacion.safeParse(entrada);
  if (!r.success) {
    const errores = erroresDe(r.error);
    // Los campos ocultos no tienen dónde mostrar su error: llegaron alterados
    if (errores.consultaId || errores.desde) return { mensaje: "No se pudo leer el pedido. Recarga la página." };
    // Sin `valores`: el formulario es controlado y conserva lo escrito
    return { errores };
  }
  const d = r.data;

  // La consulta, su vehículo (su tamaño da los precios) y si se puede cotizar
  const [c] = await db
    .select({ estado: consulta.estado, tamanoId: vehiculo.tamanoId })
    .from(consulta)
    .innerJoin(vehiculo, eq(consulta.vehiculoId, vehiculo.id))
    .where(eq(consulta.id, d.consultaId));
  if (!c) return { mensaje: "Esa consulta ya no existe." };
  if (!transicionPermitida(c.estado, "cotizado")) {
    return { mensaje: `La consulta está ${NOMBRE_ESTADO[c.estado].toLowerCase()}: ${c.estado === "perdido" ? "reábrela para cotizar" : "ya no se cotiza"}.` };
  }

  // Cada línea: una variante activa de un servicio activo; su precio sugerido es el vigente para ese tamaño
  const varianteIds = [...new Set(d.lineas.map((l) => l.varianteId))];
  const [opciones, vigentes, fotosValidas, parametros, documento] = await Promise.all([
    db
      .select({ id: variante.id, servicio: servicio.nombre, variante: variante.nombre })
      .from(variante)
      .innerJoin(servicio, eq(variante.servicioId, servicio.id))
      .where(and(inArray(variante.id, varianteIds), eq(variante.activo, true), eq(servicio.activo, true))),
    preciosVigentes(varianteIds),
    d.fotos.length === 0
      ? []
      : db
          .select({ id: consultaArchivo.archivoId })
          .from(consultaArchivo)
          .innerJoin(archivo, eq(consultaArchivo.archivoId, archivo.id))
          .where(and(eq(consultaArchivo.consultaId, d.consultaId), inArray(consultaArchivo.archivoId, d.fotos), like(archivo.tipoMime, "image/%"))),
    obtenerParametros(),
    datosDocumento(d.consultaId),
  ]);
  const errores: Record<string, string> = {};
  d.lineas.forEach((l, i) => {
    if (!opciones.some((o) => o.id === l.varianteId)) errores[`lineas.${i}`] = "Ese servicio ya no se ofrece: quítalo.";
  });
  if (fotosValidas.length !== d.fotos.length) errores.fotos = "Una de las fotos ya no está en la consulta. Recarga la página.";
  if (Object.keys(errores).length > 0) return { errores };

  const montosDe = (varianteId: number) => new Map<number, Monto>(vigentes.filter((p) => p.varianteId === varianteId).map((p) => [p.tamanoId, p.monto]));
  const lineas = d.lineas.map((l, orden) => {
    const o = opciones.find((x) => x.id === l.varianteId)!;
    const sugerencia = precioSugerido(montosDe(l.varianteId), c.tamanoId);
    return {
      varianteId: l.varianteId,
      tamanoId: c.tamanoId,
      descripcion: descripcionLinea(o.servicio, o.variante),
      precioSugerido: sugerencia.tipo === "monto" ? sugerencia.monto : null,
      precio: l.precio,
      orden,
    };
  });
  const totales = calcularTotales(
    lineas.map((l) => l.precio),
    d.descuento,
  );
  const autorId = Number(autor.id);

  const resultado = await db.transaction(async (tx) => {
    // Candado sobre la consulta: dos guardados a la vez no crean dos vigentes ni dos versiones con el mismo número. Con
    // él tomado se vuelve a mirar lo que pudo cambiar desde la revisión de arriba: el estado (alguien la marcó perdida)
    // y las fotos (alguien quitó una; quitarArchivoConsulta toma el mismo candado)
    const [bloqueada] = await tx.select({ estado: consulta.estado }).from(consulta).where(eq(consulta.id, d.consultaId)).for("update");
    if (!bloqueada || !transicionPermitida(bloqueada.estado, "cotizado")) return { error: "La consulta cambió de estado recién. Vuelve a la consulta." } as const;
    if (d.fotos.length > 0) {
      const siguen = await tx
        .select({ id: consultaArchivo.archivoId })
        .from(consultaArchivo)
        .where(and(eq(consultaArchivo.consultaId, d.consultaId), inArray(consultaArchivo.archivoId, d.fotos)));
      if (siguen.length !== d.fotos.length) return { error: "Una de las fotos ya no está en la consulta. Recarga la página." } as const;
    }
    const [vigente] = await tx
      .select({ id: cotizacion.id, numero: cotizacion.numero })
      .from(cotizacion)
      .where(and(eq(cotizacion.consultaId, d.consultaId), eq(cotizacion.estado, "enviada")));

    let numero: string;
    let version: number;
    if (d.desde) {
      // Se corrige la vigente: comparte número y la reemplaza (su PDF queda intacto)
      if (!vigente || vigente.id !== d.desde) return { error: "Esa versión ya fue corregida. Vuelve a la consulta para ver la vigente." } as const;
      numero = vigente.numero;
      const [{ ultima }] = await tx.select({ ultima: max(cotizacion.version) }).from(cotizacion).where(eq(cotizacion.numero, numero));
      version = (ultima ?? 0) + 1;
      await tx.update(cotizacion).set({ estado: "reemplazada" }).where(eq(cotizacion.id, vigente.id));
    } else {
      if (vigente) return { error: "Esta consulta ya tiene una cotización: corrígela con una versión nueva." } as const;
      const anio = anioCotizacion();
      const [{ ultimo }] = await tx
        .insert(correlativo)
        .values({ clave: claveCorrelativo(anio), ultimo: 1 })
        .onConflictDoUpdate({ target: correlativo.clave, set: { ultimo: sql`${correlativo.ultimo} + 1` } })
        .returning({ ultimo: correlativo.ultimo });
      numero = numeroCotizacion(anio, ultimo);
      version = 1;
    }

    const [nueva] = await tx
      .insert(cotizacion)
      .values({
        consultaId: d.consultaId,
        numero,
        version,
        esEstimado: d.esEstimado,
        ...totales,
        adelantoSugerido: d.adelanto,
        validaHasta: d.validaHasta,
        condiciones: parametros.condiciones_cotizacion,
        garantia: parametros.garantia_cotizacion,
        formasPago: parametros.formas_pago_cotizacion,
        datosDocumento: documento,
        createdBy: autorId,
      })
      .returning({ id: cotizacion.id });
    await tx.insert(cotizacionLinea).values(lineas.map((l) => ({ ...l, cotizacionId: nueva.id })));
    if (d.fotos.length > 0) await tx.insert(cotizacionFoto).values(d.fotos.map((archivoId, orden) => ({ cotizacionId: nueva.id, archivoId, orden })));
    await tx.insert(auditoria).values({
      usuarioId: autorId,
      entidad: "cotizacion",
      entidadId: nueva.id,
      accion: version === 1 ? "crear" : "nueva_version",
      datos: { numero, version, total: totales.total },
    });
    await tx.update(consulta).set({ estado: "cotizado", ultimoMovimientoAt: sql`now()` }).where(eq(consulta.id, d.consultaId));
    return { id: nueva.id } as const;
  });
  if ("error" in resultado) return { mensaje: resultado.error };

  // El PDF (HU-26), fuera de la transacción: arma imágenes y sube un archivo. Si falla, la cotización ya quedó
  // guardada y la consulta ofrece generarlo de nuevo; no se pierde lo cargado
  let conPdf = true;
  try {
    await generarPdf(resultado.id, autorId);
  } catch (error) {
    console.error(`No se pudo generar el PDF de la cotización ${resultado.id}:`, error);
    conPdf = false;
  }

  revalidatePath("/panel/consultas");
  revalidatePath(`/panel/consultas/${d.consultaId}`);
  redirect(`/panel/consultas/${d.consultaId}?cotizada=${resultado.id}${conPdf ? "" : "&sinpdf=1"}`);
}

/**
 * Genera el PDF de una cotización que quedó sin él (falló al guardarla). Solo si todavía no tiene: el que ya existe no
 * se regenera (RN-02). Recibe datos sueltos: se validan.
 */
export async function generarPdfPendiente(datos: { cotizacionId: number }): Promise<EstadoFormulario> {
  const autor = await exigirModulo("cotizaciones");
  const entrada = z.object({ cotizacionId: z.number().int().positive() }).safeParse(datos);
  if (!entrada.success) return { mensaje: "No se pudo leer el pedido. Recarga la página." };
  const [c] = await db
    .select({ consultaId: cotizacion.consultaId, pdf: cotizacion.pdfArchivoId })
    .from(cotizacion)
    .where(eq(cotizacion.id, entrada.data.cotizacionId));
  if (!c) return { mensaje: "Esa cotización ya no existe. Recarga la página." };
  if (!c.pdf) {
    try {
      await generarPdf(entrada.data.cotizacionId, Number(autor.id));
    } catch (error) {
      console.error(`No se pudo generar el PDF de la cotización ${entrada.data.cotizacionId}:`, error);
      return { mensaje: "No se pudo generar el PDF. Vuelve a intentar en un momento." };
    }
  }
  revalidatePath(`/panel/consultas/${c.consultaId}`);
  return { ok: true, mensaje: "PDF listo." };
}
