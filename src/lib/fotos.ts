import "server-only";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { archivo } from "@/db/esquema";
import { borrarArchivo, subirArchivo, urlArchivo } from "@/lib/almacenamiento";
import { BYTES_MAXIMOS_FOTO, TIPOS_FOTO } from "@/lib/formato-fotos";

// Fotos subidas desde el panel (logo, servicios, galería). El tipo que dice el navegador no basta:
// sharp confirma que de verdad es PNG, JPG o WebP. Se guardan en WebP, derechas según la cámara.

export type ResultadoFoto = { ok: true; archivoId: number; clave: string } | { ok: false; motivo: "vacia" | "invalida" };

type Opciones = {
  /** Carpeta en el almacenamiento, por ejemplo "negocio" o "servicios". */
  carpeta: string;
  /** Inicio del nombre del archivo, por ejemplo "logo-". */
  prefijo?: string;
  autorId: number;
  /** Lado mayor en píxeles. */
  ladoMayor?: number;
  /** Guarda además una versión de 640 px para tarjetas y grillas (`archivo.miniatura_clave`). */
  miniatura?: boolean;
};

export const LADO_MINIATURA = 640;

/** Convierte y sube una foto, y la registra en `archivo`. */
export async function guardarFoto(entrada: FormDataEntryValue | null, opciones: Opciones): Promise<ResultadoFoto> {
  if (!(entrada instanceof File) || entrada.size === 0) return { ok: false, motivo: "vacia" };
  if (entrada.size > BYTES_MAXIMOS_FOTO || !(TIPOS_FOTO as readonly string[]).includes(entrada.type)) {
    return { ok: false, motivo: "invalida" };
  }

  const original = Buffer.from(await entrada.arrayBuffer());
  const imagen = await convertir(original, opciones.ladoMayor ?? 1600);
  if (!imagen) return { ok: false, motivo: "invalida" };

  const base = `${opciones.carpeta}/${opciones.prefijo ?? ""}${randomUUID()}`;
  const clave = await subirArchivo(`${base}.webp`, imagen.data, "image/webp");
  let miniaturaClave: string | null = null;
  if (opciones.miniatura) {
    const chica = await convertir(original, LADO_MINIATURA);
    if (chica) miniaturaClave = await subirArchivo(`${base}-${LADO_MINIATURA}.webp`, chica.data, "image/webp");
  }
  const [fila] = await db
    .insert(archivo)
    .values({
      clave,
      tipoMime: "image/webp",
      bytes: imagen.info.size,
      ancho: imagen.info.width,
      alto: imagen.info.height,
      miniaturaClave,
      createdBy: opciones.autorId,
    })
    .returning({ id: archivo.id });
  return { ok: true, archivoId: fila.id, clave };
}

/** WebP con el lado mayor como máximo, o null si no es de verdad PNG, JPG o WebP. */
async function convertir(original: Buffer, ladoMayor: number) {
  try {
    const { format } = await sharp(original).metadata();
    if (!format || !["png", "jpeg", "webp"].includes(format)) return null;
    return await sharp(original)
      .rotate()
      .resize({ width: ladoMayor, height: ladoMayor, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer({ resolveWithObject: true });
  } catch {
    return null;
  }
}

/** Borra una foto que ya no usa nadie: la fila de `archivo` y sus versiones en el almacenamiento. */
export async function eliminarFoto(archivoId: number): Promise<void> {
  const [fila] = await db.delete(archivo).where(eq(archivo.id, archivoId)).returning();
  if (!fila) return;
  await Promise.all([fila.clave, fila.miniaturaClave].filter((c): c is string => !!c).map((c) => borrarArchivo(c)));
}

export type UrlsFoto = { url: string; miniatura: string; ancho: number | null; alto: number | null };

/** Direcciones públicas de una foto; sin miniatura, se usa la grande. */
export function urlsFoto(fila: { clave: string; miniaturaClave: string | null; ancho: number | null; alto: number | null }): UrlsFoto {
  return {
    url: urlArchivo(fila.clave),
    miniatura: urlArchivo(fila.miniaturaClave ?? fila.clave),
    ancho: fila.ancho,
    alto: fila.alto,
  };
}
