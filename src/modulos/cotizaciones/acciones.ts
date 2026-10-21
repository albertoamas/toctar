"use server";

import { and, eq, inArray, like, max, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
  const valores = { descuento: entrada.descuento, adelanto: entrada.adelanto, validaHasta: entrada.validaHasta };
  const r = esquemaCotizacion.safeParse(entrada);
  if (!r.success) return { errores: erroresDe(r.error), valores };
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
  const [opciones, vigentes, fotosValidas, parametros] = await Promise.all([
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
  ]);
  const errores: Record<string, string> = {};
  d.lineas.forEach((l, i) => {
    if (!opciones.some((o) => o.id === l.varianteId)) errores[`lineas.${i}`] = "Ese servicio ya no se ofrece: quítalo.";
  });
  if (fotosValidas.length !== d.fotos.length) errores.fotos = "Una de las fotos ya no está en la consulta. Recarga la página.";
  if (Object.keys(errores).length > 0) return { errores, valores };

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
    // Candado sobre la consulta: dos guardados a la vez no crean dos vigentes ni dos versiones con el mismo número
    await tx.select({ id: consulta.id }).from(consulta).where(eq(consulta.id, d.consultaId)).for("update");
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
  if ("error" in resultado) return { mensaje: resultado.error, valores };

  revalidatePath("/panel/consultas");
  revalidatePath(`/panel/consultas/${d.consultaId}`);
  redirect(`/panel/consultas/${d.consultaId}?cotizada=${resultado.id}`);
}
