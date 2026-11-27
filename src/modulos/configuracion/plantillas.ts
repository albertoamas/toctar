import { z } from "zod";

// Plantillas de los mensajes de WhatsApp (HU-40, C5 §4 y §6). Reglas puras: las usan el editor, la acción y los
// mensajes de C4 (src/modulos/ordenes/mensajes.ts). Sin imports con "@/": el esquema de la base toma las claves de aquí
// y drizzle-kit no conoce el alias.
//
// El texto original vive solo aquí. La tabla `plantilla_mensaje` guarda el que el dueño cambió; volver al original
// borra la fila. Así el original no se repite en una migración.

/** Lo que significa cada campo, para la lista del editor. */
const CAMPOS = {
  nombre: "El primer nombre del cliente. Si no tiene, se quita.",
  vehiculo: "Marca, modelo y placa: «Toyota Corolla (placa 1234ABC)».",
  negocio: "El nombre del negocio, el de Configuración > Negocio.",
  saldo: "«Saldo pendiente: 350 Bs.» si debe algo y quien avisa ve los pagos. Si no, se quita.",
  monto: "Lo que debe: «350 Bs».",
  servicio: "El servicio que toca mantener.",
  numero: "El número de la cotización: «2026-0042».",
  enlace: "El enlace para ver la cotización en PDF. Si lo quitas, va al final del mensaje.",
} as const;
export type Campo = keyof typeof CAMPOS;

export const PLANTILLAS = {
  listo: {
    titulo: "Vehículo listo",
    cuando: "Se envía desde la orden, cuando el vehículo está listo.",
    campos: ["nombre", "vehiculo", "negocio", "saldo"],
    original: "Hola {nombre}, tu {vehiculo} ya está listo en {negocio}. {saldo} Te esperamos en el taller.",
  },
  saldo: {
    titulo: "Saldo pendiente",
    cuando: "Se envía desde Saldos pendientes, a quien se llevó el vehículo sin pagar todo.",
    campos: ["nombre", "vehiculo", "negocio", "monto"],
    original:
      "Hola {nombre}, te escribimos de {negocio} por el saldo de {monto} del servicio de tu {vehiculo}. Puedes pagarlo en el taller, por QR o por transferencia.",
  },
  cotizacion: {
    titulo: "Cotización",
    cuando: "Se envía desde la cotización, con el enlace para verla en PDF.",
    campos: ["nombre", "vehiculo", "negocio", "numero", "enlace"],
    original: "Hola {nombre}, te mandamos la cotización {numero} de {negocio} para tu {vehiculo}: {enlace}",
  },
  mantenimiento: {
    titulo: "Mantenimiento",
    cuando: "Se envía desde Mantenimientos, cuando a un vehículo le toca volver.",
    campos: ["nombre", "vehiculo", "negocio", "servicio"],
    original: "Hola {nombre}, te escribimos de {negocio}: a tu {vehiculo} le toca el mantenimiento de {servicio}. ¿Te agendamos un día?",
  },
} as const satisfies Record<string, { titulo: string; cuando: string; campos: readonly Campo[]; original: string }>;

export type ClavePlantilla = keyof typeof PLANTILLAS;
export const CLAVES_PLANTILLA = Object.keys(PLANTILLAS) as [ClavePlantilla, ...ClavePlantilla[]];
export type Plantillas = Record<ClavePlantilla, string>;

export const LARGO_MAXIMO_PLANTILLA = 1000;

/** Los campos de una plantilla con lo que significa cada uno. */
export const camposDe = (clave: ClavePlantilla) => PLANTILLAS[clave].campos.map((c) => ({ campo: c, significa: CAMPOS[c] }));

/** Un campo es una palabra entre llaves, sin espacios: {nombre}. */
const CAMPO = /\{([^{}\s]+)\}/g;
/** Marca de un campo vacío mientras se arma el mensaje: un carácter que no se escribe en un mensaje. */
const VACIO = "\u0000";

/** Los campos del texto que no son de esa plantilla, sin repetir, en el orden en que aparecen. */
export function camposDesconocidos(texto: string, permitidos: readonly string[]): string[] {
  const encontrados = Array.from(texto.matchAll(CAMPO), (m) => m[1]);
  return [...new Set(encontrados.filter((c) => !permitidos.includes(c)))];
}

/**
 * Reemplaza los campos por sus valores. Un campo vacío se quita con el espacio de antes ("Hola {nombre}, tu…" sin
 * nombre da "Hola, tu…") o, si empieza la línea, con el de después. Un campo que no está en los valores queda como
 * está (la acción no deja guardarlo).
 */
export function armarMensaje(plantilla: string, valores: Partial<Record<Campo, string>>): string {
  return plantilla
    .replace(CAMPO, (todo, campo: string) => (Object.hasOwn(valores, campo) ? valores[campo as Campo]?.trim() || VACIO : todo))
    .replaceAll(` ${VACIO}`, "")
    .replace(new RegExp(`${VACIO} ?`, "g"), "")
    .trim();
}

/** Lo que el mensaje dice además de los campos: sin eso, con los campos vacíos saldría en blanco. */
const tieneTextoPropio = (texto: string) => /[^\s\p{P}]/u.test(texto.replace(CAMPO, ""));

/** El área de texto manda los saltos de línea como \r\n: se guardan y se comparan como \n. */
export const unirSaltos = (texto: string) => texto.replace(/\r\n?/g, "\n");

const llaves = (campos: readonly string[]) => campos.map((c) => `{${c}}`);

export const esquemaClavePlantilla = z.object({ clave: z.enum(CLAVES_PLANTILLA, "Ese mensaje no existe. Recarga la página.") });

export const esquemaPlantilla = esquemaClavePlantilla
  .extend({
    // Con los saltos como \n y contando caracteres como la base (un emoji es uno, no dos)
    texto: z
      .string()
      .transform(unirSaltos)
      .pipe(
        z
          .string()
          .trim()
          .min(1, "Escribe el mensaje.")
          .refine((t) => [...t].length <= LARGO_MAXIMO_PLANTILLA, `Hasta ${LARGO_MAXIMO_PLANTILLA} caracteres.`),
      ),
  })
  .superRefine(({ clave, texto }, ctx) => {
    const desconocidos = camposDesconocidos(texto, PLANTILLAS[clave].campos);
    if (desconocidos.length > 0) {
      const cuales = desconocidos.length === 1 ? "no es un campo" : "no son campos";
      ctx.addIssue({
        code: "custom",
        path: ["texto"],
        message: `${new Intl.ListFormat("es").format(llaves(desconocidos))} ${cuales} de este mensaje. Usa: ${llaves(PLANTILLAS[clave].campos).join(", ")}.`,
      });
    } else if (!tieneTextoPropio(texto)) {
      ctx.addIssue({ code: "custom", path: ["texto"], message: "Escribe algo más que campos: si quedan vacíos, el mensaje sale en blanco." });
    }
  });

/** Las plantillas vigentes: la guardada si el dueño la cambió; si no, la original. */
export function plantillasVigentes(guardadas: { clave: string; texto: string }[]): Plantillas {
  const porClave = new Map(guardadas.map((g) => [g.clave, g.texto]));
  return Object.fromEntries(CLAVES_PLANTILLA.map((c) => [c, porClave.get(c) ?? PLANTILLAS[c].original])) as Plantillas;
}
