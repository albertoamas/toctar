import { z } from "zod";
import { esquemaHorarios } from "@/lib/horarios";
import { leerEnlaceMapa, leerMapaInsertado } from "@/lib/ubicacion";
import { normalizarWhatsApp } from "@/lib/whatsapp";

// Validación de la configuración (HU-04): el mismo esquema en el formulario y en el servidor.

/** Texto optativo: vacío se guarda como null. */
const optativo = (max: number, mensaje: string) =>
  z
    .string()
    .trim()
    .max(max, mensaje)
    .transform((v) => v || null);

const DOMINIOS_RED = {
  facebook: { nombre: "Facebook", dominios: ["facebook.com", "fb.com", "fb.me"] },
  instagram: { nombre: "Instagram", dominios: ["instagram.com"] },
  tiktok: { nombre: "TikTok", dominios: ["tiktok.com"] },
} as const;
export type Red = keyof typeof DOMINIOS_RED;
export const REDES = Object.keys(DOMINIOS_RED) as Red[];
export const NOMBRE_RED: Record<Red, string> = {
  facebook: DOMINIOS_RED.facebook.nombre,
  instagram: DOMINIOS_RED.instagram.nombre,
  tiktok: DOMINIOS_RED.tiktok.nombre,
};

/** Enlace a una red social: se acepta sin "https://" y debe ser de esa red. */
export function normalizarEnlaceRed(red: Red, texto: string): string | null {
  const limpio = texto.trim();
  try {
    const url = new URL(/^https?:\/\//i.test(limpio) ? limpio : `https://${limpio}`);
    const host = url.hostname.toLowerCase();
    const valido = DOMINIOS_RED[red].dominios.some((d) => host === d || host.endsWith(`.${d}`));
    if (!valido || url.pathname.length < 2) return null;
    url.protocol = "https:";
    return url.toString();
  } catch {
    return null;
  }
}

const enlaceRed = (red: Red) =>
  z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (!v) return null;
      const enlace = normalizarEnlaceRed(red, v);
      if (!enlace) {
        ctx.addIssue({ code: "custom", message: `Revisa el enlace de ${NOMBRE_RED[red]}: cópialo desde la página del negocio.` });
        return z.NEVER;
      }
      return enlace;
    });

export const esquemaNegocio = z.object({
  nombre: z.string().trim().min(2, "Escribe el nombre del negocio.").max(80, "Hasta 80 caracteres."),
  whatsapp: z
    .string()
    .trim()
    .transform((v, ctx) => {
      const numero = normalizarWhatsApp(v);
      if (!numero) {
        ctx.addIssue({ code: "custom", message: "Escribe los 8 dígitos del celular." });
        return z.NEVER;
      }
      return numero;
    }),
  correo: z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (!v) return null;
      if (!z.email().safeParse(v).success) {
        ctx.addIssue({ code: "custom", message: "Revisa el correo, por ejemplo toctartarija@gmail.com." });
        return z.NEVER;
      }
      return v.toLowerCase();
    }),
  direccion: z.string().trim().min(5, "Escribe la dirección del taller.").max(200, "Hasta 200 caracteres."),
  // Pedido 38: lo que da la ficha en "Compartir"
  enlaceMapa: z.string().transform((v, ctx) => {
    const r = leerEnlaceMapa(v);
    if (!r.ok) {
      ctx.addIssue({ code: "custom", message: r.error });
      return z.NEVER;
    }
    return r.valor;
  }),
  mapaInsertado: z.string().transform((v, ctx) => {
    const r = leerMapaInsertado(v);
    if (!r.ok) {
      ctx.addIssue({ code: "custom", message: r.error });
      return z.NEVER;
    }
    return r.valor;
  }),
  horarios: z
    .string()
    .transform((v, ctx) => {
      try {
        return JSON.parse(v) as unknown;
      } catch {
        ctx.addIssue({ code: "custom", message: "Revisa los horarios." });
        return z.NEVER;
      }
    })
    .pipe(esquemaHorarios),
  facebook: enlaceRed("facebook"),
  instagram: enlaceRed("instagram"),
  tiktok: enlaceRed("tiktok"),
  nit: z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (!v) return null;
      if (!/^\d{5,15}$/.test(v)) {
        ctx.addIssue({ code: "custom", message: "El NIT lleva solo números." });
        return z.NEVER;
      }
      return v;
    }),
  razonSocial: optativo(120, "Hasta 120 caracteres."),
});

export const CAMPOS_NEGOCIO = Object.keys(esquemaNegocio.shape) as (keyof typeof esquemaNegocio.shape)[];

