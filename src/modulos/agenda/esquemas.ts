import { z } from "zod";
import { METODOS_PAGO } from "@/db/esquema/trabajos";
import { fechaEnBolivia, fechaExiste, sumarDias } from "@/lib/fechas";
import { leerMonto } from "@/modulos/catalogo/reglas";
import { MAXIMO_LINEAS } from "@/modulos/cotizaciones/reglas";
import { DIAS_MAXIMOS_TRABAJO } from "./reglas";

// Validación de las reservas (HU-30). Especificación: docs/08-desarrollo/etapas/C3-agenda-pagos.md §6 y §8.
// Las líneas de una reserva directa llegan como JSON (el editor de líneas de la cotización); con cotización, se
// copian de ella en el servidor y no se reciben.

const id = z.coerce.number().int().positive();

/** Id opcional que llega de un selector o un campo oculto: vacío es null. */
const idOpcional = z
  .string()
  .optional()
  .transform((v) => (v ? Number(v) : null))
  .pipe(z.number().int().positive().nullable());

const existe = fechaExiste;
const fecha = (mensaje: string) => z.string().refine(existe, mensaje);

const textoOpcional = (maximo: number) =>
  z
    .string()
    .trim()
    .max(maximo, `Hasta ${maximo} caracteres.`)
    .transform((v) => v || null);

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
  .pipe(
    z
      .array(z.object({ varianteId: z.number({ message: "Elige el servicio." }).int().positive("Elige el servicio."), precio: precioLinea }))
      .min(1, "Agrega al menos un servicio.")
      .max(MAXIMO_LINEAS, `Hasta ${MAXIMO_LINEAS} servicios.`),
  );

/** Las fechas de una reserva: el ingreso desde hoy (en Bolivia) y hasta un año; la entrega, no antes del ingreso. */
export const esquemaFechas = z
  .object({
    fechaInicio: fecha("Elige el día de ingreso."),
    fechaFin: fecha("Elige el día de entrega."),
  })
  .superRefine((d, ctx) => {
    // Con una fecha que no existe ya hay un error: no se compara con ella
    if (!existe(d.fechaInicio) || !existe(d.fechaFin)) return;
    const hoy = fechaEnBolivia();
    if (d.fechaInicio < hoy) ctx.addIssue({ code: "custom", path: ["fechaInicio"], message: "El ingreso no puede ser antes de hoy." });
    else if (d.fechaInicio > sumarDias(hoy, 365)) ctx.addIssue({ code: "custom", path: ["fechaInicio"], message: "Se agenda hasta un año adelante." });
    if (d.fechaFin < d.fechaInicio) ctx.addIssue({ code: "custom", path: ["fechaFin"], message: "La entrega no puede ser antes del ingreso." });
    else if (d.fechaFin > sumarDias(d.fechaInicio, DIAS_MAXIMOS_TRABAJO))
      ctx.addIssue({ code: "custom", path: ["fechaFin"], message: `Una reserva dura hasta ${DIAS_MAXIMOS_TRABAJO} días.` });
  });

/** Adelanto al agendar (RN-04): un monto y su método, o "sin adelanto". El tope (el total) lo mira la acción. */
const adelanto = z.discriminatedUnion("sinAdelanto", [
  z.object({ sinAdelanto: z.literal(true) }),
  z.object({
    sinAdelanto: z.literal(false),
    monto: z.string().transform((v, ctx) => {
      const m = leerMonto(v);
      if (!m) {
        ctx.addIssue({ code: "custom", message: "Escribe el adelanto, como 200 o 200,50." });
        return z.NEVER;
      }
      return m;
    }),
    metodo: z.enum(METODOS_PAGO, { message: "Elige cómo pagó." }),
  }),
]);

const base = {
  espacioId: z.coerce.number({ message: "Elige el espacio." }).int().positive("Elige el espacio."),
  tecnicoId: idOpcional,
  horaIngreso: textoOpcional(40),
  nota: textoOpcional(1000),
};

/** Reserva desde la cotización vigente de una consulta: cliente, vehículo y líneas salen de ella. */
const esquemaReservaDeCotizacion = z.object({ origen: z.literal("cotizacion"), cotizacionId: id, ...base });

/**
 * Reserva directa (RF-37): cliente y vehículo registrados y servicios del catálogo. Con `recordatorioId` si viene de
 * "Agendar" en Mantenimientos (HU-38): el recordatorio queda agendado con la reserva.
 */
const esquemaReservaDirecta = z.object({ origen: z.literal("directa"), clienteId: id, vehiculoId: id, lineas, recordatorioId: idOpcional, ...base });

export const esquemaReserva = z.discriminatedUnion("origen", [esquemaReservaDeCotizacion, esquemaReservaDirecta]);

/** Lee el formulario de la reserva: fechas, datos y adelanto por separado (cada uno con su esquema). */
export function entradaReserva(datos: FormData) {
  const texto = (clave: string) => String(datos.get(clave) ?? "");
  return {
    reserva: {
      origen: texto("origen"),
      cotizacionId: texto("cotizacionId"),
      clienteId: texto("clienteId"),
      vehiculoId: texto("vehiculoId"),
      recordatorioId: texto("recordatorioId"),
      lineas: texto("lineas") || "[]",
      espacioId: texto("espacioId"),
      tecnicoId: texto("tecnicoId"),
      horaIngreso: texto("horaIngreso"),
      nota: texto("nota"),
    },
    fechas: { fechaInicio: texto("fechaInicio"), fechaFin: texto("fechaFin") },
    adelanto: datos.get("sinAdelanto") === "on" ? { sinAdelanto: true as const } : { sinAdelanto: false as const, monto: texto("adelanto"), metodo: texto("metodo") },
  };
}

export const esquemaAdelanto = adelanto;

/** Para consultar los espacios libres desde el formulario (datos sueltos: se validan). */
export const esquemaConsultaEspacios = z.object({ fechaInicio: z.string(), fechaFin: z.string(), excepto: id.optional() });

/** Reprogramar (HU-31): la reserva, sus nuevas fechas (las mismas reglas que al agendar) y el espacio. */
export const esquemaReprogramar = z.object({ id, espacioId: base.espacioId });

/** Cancelar (HU-31, RF-39): con motivo. */
export const esquemaCancelar = z.object({
  id,
  motivo: z.string().trim().min(1, "Escribe el motivo.").max(300, "Hasta 300 caracteres."),
});
