import { z } from "zod";

// Textos editables del sitio (HU-08, RF-10). Cada página tiene sus campos aquí; el valor vive en
// `contenido_pagina` y el inicial entra por migración (0009_datos_contenido). Se usa en el formulario y en el servidor.

type CampoTexto = { tipo: "linea" | "parrafo"; clave: string; etiqueta: string; ayuda?: string; vacio: string; max: number };
type CampoLista = { tipo: "lista"; clave: string; etiqueta: string; ayuda?: string; vacio: string; max: number; maxItems: number; agregar: string };
export type CampoContenido = CampoTexto | CampoLista;

export const PAGINAS = {
  inicio: {
    titulo: "Portada",
    descripcion: "Lo primero que ve quien entra al sitio.",
    campos: [
      { tipo: "linea", clave: "lema", etiqueta: "Lema", vacio: "Escribe el lema.", max: 80, ayuda: "La frase grande de la portada." },
      { tipo: "parrafo", clave: "presentacion", etiqueta: "Presentación", vacio: "Escribe la presentación.", max: 400, ayuda: "Dos o tres frases: quiénes son y qué hacen." },
    ],
  },
  nosotros: {
    titulo: "Nosotros",
    descripcion: "Quiénes son, cómo trabajan y por qué elegirlos.",
    campos: [
      { tipo: "parrafo", clave: "historia", etiqueta: "Historia", vacio: "Escribe la historia.", max: 2000 },
      { tipo: "parrafo", clave: "como_trabajamos", etiqueta: "Cómo trabajamos", vacio: "Escribe cómo trabajan.", max: 2000 },
      {
        tipo: "lista",
        clave: "por_que_elegirnos",
        etiqueta: "Por qué elegirnos",
        vacio: "Agrega al menos un motivo.",
        max: 160,
        maxItems: 6,
        agregar: "Agregar motivo",
        ayuda: "Frases cortas. Sin precios ni testimonios.",
      },
    ],
  },
  contacto: {
    titulo: "Contacto",
    descripcion: "La dirección, el horario y el WhatsApp salen de Configuración.",
    campos: [{ tipo: "parrafo", clave: "bienvenida", etiqueta: "Texto de bienvenida", vacio: "Escribe el texto de bienvenida.", max: 300 }],
  },
} as const satisfies Record<string, { titulo: string; descripcion: string; campos: readonly CampoContenido[] }>;

export type Pagina = keyof typeof PAGINAS;
export const CLAVES_PAGINA = Object.keys(PAGINAS) as Pagina[];

export const PORTADA = "inicio" satisfies Pagina;

/**
 * Las páginas con foto (`contenido_pagina.foto_archivo_id`): la portada lleva la foto del taller detrás del lema (HU-08),
 * y Nosotros la del equipo al lado de la historia (pedido de YankoSoft del 24/10). Sus textos en el panel.
 */
export const FOTOS_DE_PAGINA = {
  inicio: {
    titulo: "Foto del taller",
    ayuda: "Va detrás del lema, oscurecida para que se lea el texto. Horizontal y con buena luz.",
    vacia: "Sin foto: detrás del lema queda el fondo negro.",
    quitada: "Foto quitada. Detrás del lema queda el fondo negro.",
    alt: "Foto del taller",
    carpeta: "portada",
  },
  nosotros: {
    titulo: "Foto del equipo",
    ayuda: "Va al lado de la historia (en el celular, debajo). Mejor horizontal.",
    vacia: "Sin foto: la historia va sola.",
    quitada: "Foto quitada. La historia va sola.",
    alt: "El equipo de TocTar",
    carpeta: "nosotros",
  },
} as const satisfies Partial<Record<Pagina, { titulo: string; ayuda: string; vacia: string; quitada: string; alt: string; carpeta: string }>>;

export type PaginaConFoto = keyof typeof FOTOS_DE_PAGINA;
export const PAGINAS_CON_FOTO = Object.keys(FOTOS_DE_PAGINA) as [PaginaConFoto, ...PaginaConFoto[]];
/** Las acciones de la foto reciben la página suelta: se valida (cualquiera puede llamarlas). */
export const esquemaPaginaConFoto = z.enum(PAGINAS_CON_FOTO);

export function llevaFoto(pagina: Pagina): pagina is PaginaConFoto {
  return Object.hasOwn(FOTOS_DE_PAGINA, pagina);
}

function esquemaCampo(c: CampoContenido) {
  const texto = z.string().trim().min(1, c.vacio).max(c.max, `Hasta ${c.max} caracteres.`);
  if (c.tipo !== "lista") return texto;
  return z
    .array(z.string().trim().min(1, "Escribe el texto o quita la fila.").max(c.max, `Hasta ${c.max} caracteres.`))
    .min(1, c.vacio)
    .max(c.maxItems, `Hasta ${c.maxItems}.`);
}

/** Esquema de los datos ya armados (listas como arreglos). */
export function esquemaPagina(pagina: Pagina) {
  const campos = PAGINAS[pagina].campos as readonly CampoContenido[];
  return z.object(Object.fromEntries(campos.map((c) => [c.clave, esquemaCampo(c)])));
}

/** Lo que llega del formulario: los campos de lista vienen como JSON. */
export function datosDelFormulario(pagina: Pagina, formulario: Record<string, string>): Record<string, unknown> {
  const campos = PAGINAS[pagina].campos as readonly CampoContenido[];
  return Object.fromEntries(
    campos.map((c) => {
      const crudo = formulario[c.clave] ?? "";
      if (c.tipo !== "lista") return [c.clave, crudo];
      try {
        return [c.clave, JSON.parse(crudo || "[]")];
      } catch {
        return [c.clave, null];
      }
    }),
  );
}

export type ContenidoPagina = Record<string, string | string[]>;

/** Lee lo guardado. Si falta o es inválido, es un error de datos: falta la migración. */
export function leerContenido(pagina: Pagina, datos: unknown): ContenidoPagina {
  const r = esquemaPagina(pagina).safeParse(datos);
  if (!r.success) throw new Error(`El contenido de "${pagina}" falta o es inválido: aplica las migraciones.`);
  return r.data as ContenidoPagina;
}

export const esquemaPregunta = z.object({
  id: z.coerce.number().int().positive().optional(),
  pregunta: z.string().trim().min(1, "Escribe la pregunta.").max(160, "Hasta 160 caracteres."),
  respuesta: z.string().trim().min(1, "Escribe la respuesta.").max(1000, "Hasta 1000 caracteres."),
});
