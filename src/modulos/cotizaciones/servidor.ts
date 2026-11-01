import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { z } from "zod";
import { db, type Transaccion } from "@/db";
import { auditoria, correlativo, cotizacion, cotizacionLinea, servicio, variante } from "@/db/esquema";
import { preciosVigentes } from "@/modulos/catalogo/consultas";
import type { Monto } from "@/modulos/catalogo/reglas";
import type { obtenerParametros } from "@/modulos/configuracion/consultas";
import type { esquemaNuevaVersion } from "./esquemas";
import { datosDocumento } from "./consultas";
import { anioCotizacion, calcularTotales, claveCorrelativo, descripcionLinea, numeroCotizacion, precioSugerido } from "./reglas";

// Lo que comparten la nueva cotización y la versión nueva (pedido 23, P23-cotizacion-directa.md §6): las líneas con su
// precio sugerido y escribir la versión. No es un archivo "use server": no expone nada al navegador.

/** Lo validado de una versión (los mismos campos en la nueva cotización y en la versión nueva). */
type Precios = Pick<z.output<typeof esquemaNuevaVersion>, "lineas" | "descuento" | "adelanto" | "validaHasta" | "modo">;

type LineaLista = { varianteId: number; tamanoId: number; descripcion: string; precioSugerido: string | null; precio: string; orden: number };

/**
 * Las líneas listas para guardar: cada una, una variante activa de un servicio activo, con la descripción y el precio
 * sugerido del catálogo para ese tamaño copiados (D-4). Si una ya no se ofrece, el error va a su fila.
 */
export async function prepararLineas(
  lineas: Precios["lineas"],
  tamanoId: number,
): Promise<{ errores: Record<string, string> } | { lineas: LineaLista[] }> {
  const varianteIds = [...new Set(lineas.map((l) => l.varianteId))];
  const [opciones, vigentes] = await Promise.all([
    db
      .select({ id: variante.id, servicio: servicio.nombre, variante: variante.nombre })
      .from(variante)
      .innerJoin(servicio, eq(variante.servicioId, servicio.id))
      .where(and(inArray(variante.id, varianteIds), eq(variante.activo, true), eq(servicio.activo, true))),
    preciosVigentes(varianteIds),
  ]);
  const errores: Record<string, string> = {};
  lineas.forEach((l, i) => {
    if (!opciones.some((o) => o.id === l.varianteId)) errores[`lineas.${i}`] = "Ese servicio ya no se ofrece: quítalo.";
  });
  if (Object.keys(errores).length > 0) return { errores };

  const montosDe = (varianteId: number) => new Map<number, Monto>(vigentes.filter((p) => p.varianteId === varianteId).map((p) => [p.tamanoId, p.monto]));
  return {
    lineas: lineas.map((l, orden) => {
      const o = opciones.find((x) => x.id === l.varianteId)!;
      const sugerencia = precioSugerido(montosDe(l.varianteId), tamanoId);
      return {
        varianteId: l.varianteId,
        tamanoId,
        descripcion: descripcionLinea(o.servicio, o.variante),
        precioSugerido: sugerencia.tipo === "monto" ? sugerencia.monto : null,
        precio: l.precio,
        orden,
      };
    }),
  };
}

/** El número siguiente del año ("2026-0007"), dentro de la transacción: dos a la vez no toman el mismo. */
export async function numeroNuevo(tx: Transaccion): Promise<string> {
  const anio = anioCotizacion();
  const [{ ultimo }] = await tx
    .insert(correlativo)
    .values({ clave: claveCorrelativo(anio), ultimo: 1 })
    .onConflictDoUpdate({ target: correlativo.clave, set: { ultimo: sql`${correlativo.ultimo} + 1` } })
    .returning({ ultimo: correlativo.ultimo });
  return numeroCotizacion(anio, ultimo);
}

/**
 * Escribe una versión con sus líneas y su auditoría (RNF-10). Los totales se recalculan con el descuento; las
 * condiciones de Configuración y los datos del documento se copian (D-4): el PDF sale de acá aunque después cambien.
 */
export async function escribirVersion(
  tx: Transaccion,
  v: {
    consultaId: number;
    numero: string;
    version: number;
    precios: Precios;
    lineas: LineaLista[];
    parametros: Awaited<ReturnType<typeof obtenerParametros>>;
    autorId: number;
  },
): Promise<number> {
  const totales = calcularTotales(
    v.lineas.map((l) => l.precio),
    v.precios.descuento,
  );
  const [nueva] = await tx
    .insert(cotizacion)
    .values({
      consultaId: v.consultaId,
      numero: v.numero,
      version: v.version,
      esEstimado: v.precios.modo === "fotos",
      ...totales,
      adelantoSugerido: v.precios.adelanto,
      validaHasta: v.precios.validaHasta,
      condiciones: v.parametros.condiciones_cotizacion,
      garantia: v.parametros.garantia_cotizacion,
      formasPago: v.parametros.formas_pago_cotizacion,
      datosDocumento: await datosDocumento(v.consultaId, tx),
      createdBy: v.autorId,
    })
    .returning({ id: cotizacion.id });
  await tx.insert(cotizacionLinea).values(v.lineas.map((l) => ({ ...l, cotizacionId: nueva.id })));
  await tx.insert(auditoria).values({
    usuarioId: v.autorId,
    entidad: "cotizacion",
    entidadId: nueva.id,
    accion: v.version === 1 ? "crear" : "nueva_version",
    datos: { numero: v.numero, version: v.version, total: totales.total },
  });
  return nueva.id;
}
