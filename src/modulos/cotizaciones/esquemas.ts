import { z } from "zod";
import { fechaEnBolivia, sumarDias } from "@/lib/fechas";
import { leerMonto } from "@/modulos/catalogo/reglas";
import { calcularTotales, CLIENTE_NUEVO, leerMontoOCero, MAXIMO_LINEAS, MODOS, montoNoMayor, MOTIVOS, VEHICULO_OTRO } from "./reglas";

// Validación de la cotización. Especificación: docs/08-desarrollo/etapas/P23-cotizacion-directa.md §6.
// Las líneas llegan como JSON en un campo oculto (EditorLista); los errores de cada una van en "lineas.0", "lineas.1"…
// El cliente y el vehículo nuevos se validan con los esquemas de Clientes (C1), en la acción.

const id = z.coerce.number().int().positive();

/**
 * Una línea de servicio: la cotización y la reserva directa (agenda). Se elige el servicio y, si tiene varias, su opción
 * (pulido 9.4): `servicioId` llega cuando se eligió el servicio y falta la opción, y entonces el error lo dice. Se
 * revisa en orden (servicio, opción y precio) y se muestra el primero, como en el resto de los formularios.
 */
export const lineaServicio = z
  .object({ servicioId: z.number().int().positive().optional(), varianteId: z.number({ message: "Elige el servicio." }).int(), precio: z.string() })
  .superRefine((l, ctx) => {
    if (l.varianteId <= 0) {
      ctx.addIssue({ code: "custom", path: ["varianteId"], message: l.servicioId ? "Elige la opción." : "Elige el servicio." });
    } else if (!l.precio.trim()) {
      ctx.addIssue({ code: "custom", path: ["precio"], message: "Escribe el precio." });
    } else if (!leerMonto(l.precio)) {
      ctx.addIssue({ code: "custom", path: ["precio"], message: "Revisa el precio: un número mayor a cero, como 450 o 450,50." });
    }
  })
  .transform((l) => ({ varianteId: l.varianteId, precio: leerMonto(l.precio)! }));

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
  .pipe(z.array(lineaServicio).min(1, "Agrega al menos un servicio.").max(MAXIMO_LINEAS, `Hasta ${MAXIMO_LINEAS} servicios.`));

/** Lo que lleva cada versión: servicios, montos, validez y cómo se cotizó (RN-03). */
const camposPrecio = {
  lineas,
  descuento: montoOCero("Revisa el descuento: un número, como 50 o 50,50."),
  adelanto: montoOCero("Revisa el adelanto: un número, como 200 o 200,50."),
  validaHasta: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Elige la fecha.")
    // Una fecha que no existe ("2026-02-31") la acepta Date.parse, pero la rechaza la base: se compara de vuelta
    .refine((v) => !Number.isNaN(Date.parse(v)) && new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v, "Elige la fecha.")
    .refine((v) => v <= sumarDias(fechaEnBolivia(), 365), "La validez puede ser de hasta un año.")
    .refine((v) => v >= fechaEnBolivia(), "La validez no puede ser anterior a hoy."),
  modo: z.enum(MODOS, { message: "Elige cómo se cotizó." }),
};

/** El descuento no pasa del subtotal ni el adelanto del total. Sin líneas válidas no hay con qué comparar. */
function revisarMontos(d: { lineas: { precio: string }[]; descuento: string; adelanto: string }, ctx: z.RefinementCtx) {
  if (!Array.isArray(d.lineas) || d.lineas.length === 0) return;
  const { subtotal, total } = calcularTotales(
    d.lineas.map((l) => l.precio),
    d.descuento,
  );
  if (!montoNoMayor(d.descuento, subtotal)) ctx.addIssue({ code: "custom", path: ["descuento"], message: "El descuento no puede ser mayor que el subtotal." });
  else if (!montoNoMayor(d.adelanto, total)) ctx.addIssue({ code: "custom", path: ["adelanto"], message: "El adelanto no puede ser mayor que el total." });
}

/** Un id elegido en un selector, o el valor especial ("nuevo", "otro"). Vacío: no se eligió. */
const eleccion = <T extends string>(especial: T, mensaje: string) =>
  z.string().transform((v, ctx): number | T => {
    if (v === especial) return especial;
    const n = Number(v);
    if (!v || !Number.isInteger(n) || n <= 0) {
      ctx.addIssue({ code: "custom", message: mensaje });
      return z.NEVER;
    }
    return n;
  });

export const esquemaClienteElegido = eleccion(CLIENTE_NUEVO, "Elige el cliente.");
export const esquemaVehiculoElegido = eleccion(VEHICULO_OTRO, "Elige el vehículo.");

/**
 * Los precios de una cotización nueva (pedido 23). El cliente (`esquemaClienteElegido`), su vehículo y los datos del
 * cliente y del vehículo nuevos se validan aparte, con los esquemas de Clientes.
 */
export const esquemaPreciosNuevos = z.object(camposPrecio).superRefine(revisarMontos);

/** Nueva versión de una cotización pendiente (RN-02): reemplaza a `desde`, la vigente. */
export const esquemaNuevaVersion = z.object({ consultaId: id, desde: id, ...camposPrecio }).superRefine(revisarMontos);

/** Lee los campos de precio del formulario (los demás, como texto, con `leerValores`). */
export function entradaPrecios(datos: FormData) {
  const texto = (clave: string, vacio = "") => String(datos.get(clave) ?? vacio);
  return {
    lineas: texto("lineas", "[]"),
    descuento: texto("descuento"),
    adelanto: texto("adelanto"),
    validaHasta: texto("validaHasta"),
    modo: texto("modo"),
  };
}

/** Rechazar (con motivo) o volver a pendiente (RF-30). Con "Otro", el detalle dice qué pasó. */
export const esquemaCambioEstado = z.discriminatedUnion("accion", [
  z
    .object({
      id,
      accion: z.literal("rechazar"),
      motivo: z.enum(MOTIVOS, { message: "Elige el motivo." }),
      detalle: z
        .string()
        .trim()
        .max(300, "Hasta 300 caracteres.")
        .transform((v) => v || null),
    })
    .refine((d) => d.motivo !== "otro" || d.detalle, { path: ["detalle"], message: "Cuenta qué pasó." }),
  z.object({ id, accion: z.literal("reabrir") }),
  // "Aceptó, sin fecha" (pedido 31): queda aceptada y se reserva después
  z.object({ id, accion: z.literal("aceptar") }),
]);
