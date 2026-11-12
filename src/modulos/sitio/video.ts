import "server-only";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { archivo } from "@/db/esquema";
import { borrarArchivo, subirArchivo } from "@/lib/almacenamiento";
import { eliminarFoto } from "@/lib/fotos";
import type { TipoVideo } from "@/lib/formato-videos";
import { cambiarArchivoDePagina } from "./archivo-de-pagina";
import { PORTADA } from "./contenido";

// El video de "Mira cómo trabajamos" en la portada (pedido 48, `etapas/P48-video-tiktok.md`). Lo sube la ruta
// /panel/sitio/video (las server actions tienen un tope de 6 MB) y lo quita una acción. Quien llama ya verificó el
// permiso de Sitio web. Va al bucket público: es contenido del sitio, como las fotos de la galería.

const EXTENSION: Record<TipoVideo, string> = { "video/mp4": "mp4", "video/webm": "webm" };

export const BORRAR_VIDEO_FALLO = "No se pudo borrar del almacenamiento el video de la portada";

/** Pone el video de la portada (o ninguno) y devuelve el que tenía (`cambiarArchivoDePagina`). */
export function cambiarVideoDePortada(videoArchivoId: number | null, autorId: number): Promise<number | null> {
  return cambiarArchivoDePagina(PORTADA, "videoArchivoId", videoArchivoId, autorId);
}

/**
 * Sube un video ya revisado (tipo por su firma y tope de bytes), lo registra y lo pone en la portada; el anterior se
 * borra. Si algo falla después de subirlo, se borra lo subido para que no quede suelto en el almacenamiento.
 */
export async function guardarVideoDePortada(contenido: Uint8Array, tipo: TipoVideo, autorId: number): Promise<void> {
  const clave = await subirArchivo(`portada/video-${randomUUID()}.${EXTENSION[tipo]}`, contenido, tipo);
  let anterior: number | null;
  try {
    const [fila] = await db.insert(archivo).values({ clave, tipoMime: tipo, bytes: contenido.byteLength, createdBy: autorId }).returning({ id: archivo.id });
    try {
      anterior = await cambiarVideoDePortada(fila.id, autorId);
    } catch (error) {
      await db.delete(archivo).where(eq(archivo.id, fila.id));
      throw error;
    }
  } catch (error) {
    await borrarArchivo(clave).catch((e) => console.error(BORRAR_VIDEO_FALLO, e));
    throw error;
  }
  if (anterior) await eliminarFoto(anterior).catch((e) => console.error(BORRAR_VIDEO_FALLO, e));
}
