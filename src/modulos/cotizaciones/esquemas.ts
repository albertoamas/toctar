import { z } from "zod";
import { fechaEnBolivia } from "@/lib/fechas";
import { leerMonto } from "@/modulos/catalogo/reglas";
import { calcularTotales, leerMontoOCero, MAXIMO_FOTOS_PDF, MAXIMO_LINEAS, montoNoMayor } from "./reglas";

// Validación de la cotización (HU-25). Especificación: docs/08-desarrollo/etapas/C2-consultas-cotizaciones.md §6 y §8.
// Las líneas llegan como JSON en un campo oculto (EditorLista); los errores de cada una van en "lineas.0", "lineas.1"…

const id = z.coerce.number().int().positive();

const precioLinea = z.string().transform((v, ctx) => {
  if (!v.trim()) {
    ctx.addIssue({ code: "custom", message: "Escribe el precio." });
    return z.NEVER;
  }
  const monto = leerMonto(v);
  if (!monto) {
    ctx.addIssue({ code: "custom", message: "Revisa el precio: un número mayor a cero, como 450 o 450,50." });
    return z.NEVER;
  }
  return monto;
});

const linea = z.object({
  varianteId: z.number({ message: "Elige el servicio." }).int().positive("Elige el servicio."),
  precio: precioLinea,
});

const montoOCero = (mensaje: string) =>
  z.string().transform((v, ctx) => {
    const monto = leerMontoOCero(v);
    if (monto === undefined) {
      ctx.addIssue({ code: "custom", message: mensaje });
      return z.NEVER;
    }
    return monto;
  });

/** Las líneas del campo oculto: JSON con [{ varianteId, precio }]. */
const lineas = z
  .string()
  .transform((v, ctx) => {
    try {
      return JSON.parse(v) as unknown;
    } catch {
      ctx.addIssue({ code: "custom", message: "No se pudo leer la lista de servicios. Recarga la página." });
      return z.NEVER;
    }
  })
  .pipe(z.array(linea).min(1, "Agrega al menos un servicio.").max(MAXIMO_LINEAS, `Hasta ${MAXIMO_LINEAS} servicios.`));

export const esquemaCotizacion = z
  .object({
    consultaId: id,
    /** La versión que se corrige; vacío en la primera. */
    desde: z
      .string()
      .optional()
      .transform((v) => (v ? Number(v) : null))
      .pipe(z.number().int().positive().nullable()),
    lineas,
    descuento: montoOCero("Revisa el descuento: un número, como 50 o 50,50."),
    adelanto: montoOCero("Revisa el adelanto: un número, como 200 o 200,50."),
    validaHasta: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Elige la fecha.")
      .refine((v) => !Number.isNaN(Date.parse(v)), "Elige la fecha.")
      .refine((v) => v >= fechaEnBolivia(), "La validez no puede ser anterior a hoy."),
    esEstimado: z.boolean(),
    fotos: z.array(id).max(MAXIMO_FOTOS_PDF, `Hasta ${MAXIMO_FOTOS_PDF} fotos.`),
  })
  .superRefine((d, ctx) => {
    if (d.fotos.length !== new Set(d.fotos).size) ctx.addIssue({ code: "custom", path: ["fotos"], message: "Revisa las fotos elegidas." });
    // Sin líneas válidas no hay subtotal con qué comparar: primero el error de las líneas
    if (!Array.isArray(d.lineas) || d.lineas.length === 0) return;
    const { subtotal, total } = calcularTotales(
      d.lineas.map((l) => l.precio),
      d.descuento,
    );
    if (!montoNoMayor(d.descuento, subtotal)) ctx.addIssue({ code: "custom", path: ["descuento"], message: "El descuento no puede ser mayor que el subtotal." });
    else if (!montoNoMayor(d.adelanto, total)) ctx.addIssue({ code: "custom", path: ["adelanto"], message: "El adelanto no puede ser mayor que el total." });
  });

/** Lee el formulario: las casillas y las fotos elegidas no llegan como texto simple. */
export function entradaCotizacion(datos: FormData) {
  return {
    consultaId: String(datos.get("consultaId") ?? ""),
    desde: String(datos.get("desde") ?? ""),
    lineas: String(datos.get("lineas") ?? "[]"),
    descuento: String(datos.get("descuento") ?? ""),
    adelanto: String(datos.get("adelanto") ?? ""),
    validaHasta: String(datos.get("validaHasta") ?? ""),
    esEstimado: datos.get("esEstimado") === "on",
    fotos: datos.getAll("fotos").map(String),
  };
}
