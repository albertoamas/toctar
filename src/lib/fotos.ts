import "server-only";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { archivo } from "@/db/esquema";
import { borrarArchivo, subirArchivo, urlArchivo, urlArchivoPrivado, type Visibilidad } from "@/lib/almacenamiento";
import { BYTES_MAXIMOS_FOTO, TIPOS_FOTO } from "@/lib/formato-fotos";
import { convertirAWebp } from "@/lib/imagen";

// Fotos subidas desde el panel (logo, servicios, galería) y desde el sitio (reclamos). El tipo que dice el navegador no basta:
// sharp confirma que de verdad es PNG, JPG o WebP (src/lib/imagen.ts). Se guardan en WebP, derechas según la cámara.

export type ResultadoFoto = { ok: true; archivoId: number; clave: string } | { ok: false; motivo: "vacia" | "invalida" };

type Opciones = {
  /** Carpeta en el almacenamiento, por ejemplo "negocio" o "servicios". */
  carpeta: string;
  /** Inicio del nombre del archivo, por ejemplo "logo-". */
  prefijo?: string;
  /** Quién la sube; null si viene del sitio público (por ejemplo, las fotos de un reclamo). */
  autorId: number | null;
  /** Lado mayor en píxeles. */
  ladoMayor?: number;
  /** Guarda además una versión de 640 px para tarjetas y grillas (`archivo.miniatura_clave`). */
  miniatura?: boolean;
  /** En el bucket privado: datos de clientes (por ejemplo, las fotos de un reclamo). Por defecto, público. */
  privado?: boolean;
};

const LADO_MINIATURA = 640;

/** Convierte y sube una foto, y la registra en `archivo`. */
export async function guardarFoto(entrada: FormDataEntryValue | null, opciones: Opciones): Promise<ResultadoFoto> {
  if (!(entrada instanceof File) || entrada.size === 0) return { ok: false, motivo: "vacia" };
  if (entrada.size > BYTES_MAXIMOS_FOTO || !(TIPOS_FOTO as readonly string[]).includes(entrada.type)) {
    return { ok: false, motivo: "invalida" };
  }

  const original = Buffer.from(await entrada.arrayBuffer());
  const versiones = await convertirAWebp(original, opciones.miniatura ? [opciones.ladoMayor ?? 1600, LADO_MINIATURA] : [opciones.ladoMayor ?? 1600]);
  if (!versiones) return { ok: false, motivo: "invalida" };
  const [imagen, chica] = versiones;

  const visibilidad: Visibilidad = opciones.privado ? "privado" : "publico";
  const base = `${opciones.carpeta}/${opciones.prefijo ?? ""}${randomUUID()}`;
  const clave = await subirArchivo(`${base}.webp`, imagen.data, "image/webp", visibilidad);
  const miniaturaClave = chica ? await subirArchivo(`${base}-${LADO_MINIATURA}.webp`, chica.data, "image/webp", visibilidad) : null;
  try {
    const [fila] = await db
      .insert(archivo)
      .values({
        clave,
        tipoMime: "image/webp",
        bytes: imagen.info.size,
        ancho: imagen.info.width,
        alto: imagen.info.height,
        miniaturaClave,
        privado: visibilidad === "privado",
        createdBy: opciones.autorId,
      })
      .returning({ id: archivo.id });
    return { ok: true, archivoId: fila.id, clave };
  } catch (error) {
    // Sin la fila en `archivo` nadie encontraría estos archivos para borrarlos: se borran ahora.
    await Promise.allSettled([clave, miniaturaClave].filter((c): c is string => !!c).map((c) => borrarArchivo(c, visibilidad)));
    throw error;
  }
}

/** Borra una foto que ya no usa nadie: la fila de `archivo` y sus versiones en el almacenamiento. */
export async function eliminarFoto(archivoId: number): Promise<void> {
  const [fila] = await db.delete(archivo).where(eq(archivo.id, archivoId)).returning();
  if (!fila) return;
  const visibilidad: Visibilidad = fila.privado ? "privado" : "publico";
  await Promise.all([fila.clave, fila.miniaturaClave].filter((c): c is string => !!c).map((c) => borrarArchivo(c, visibilidad)));
}

export type UrlsFoto = { url: string; miniatura: string; ancho: number | null; alto: number | null };

type FilaFoto = { clave: string; miniaturaClave: string | null; ancho: number | null; alto: number | null };

/** Direcciones públicas de una foto del bucket público; sin miniatura, se usa la grande. */
export function urlsFoto(fila: FilaFoto): UrlsFoto {
  return {
    url: urlArchivo(fila.clave),
    miniatura: urlArchivo(fila.miniaturaClave ?? fila.clave),
    ancho: fila.ancho,
    alto: fila.alto,
  };
}

/** Enlaces firmados y temporales de una foto privada. Llamarla solo después de verificar el permiso. */
export async function urlsFotoPrivada(fila: FilaFoto): Promise<UrlsFoto> {
  const [url, miniatura] = await Promise.all([urlArchivoPrivado(fila.clave), urlArchivoPrivado(fila.miniaturaClave ?? fila.clave)]);
  return { url, miniatura, ancho: fila.ancho, alto: fila.alto };
}
