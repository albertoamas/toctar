import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { archivo } from "@/db/esquema";
import { borrarArchivo, leerArchivo, subirArchivo, urlArchivo, urlArchivoPrivado, type Visibilidad } from "@/lib/almacenamiento";
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
  /**
   * Guarda además una versión de 640 px para tarjetas y grillas (`archivo.miniatura_clave`) y, si es del sitio (bucket
   * público), una de 1080 px para el celular (`archivo.mediana_clave`).
   */
  miniatura?: boolean;
  /** En el bucket privado: datos de clientes (por ejemplo, las fotos de un reclamo). Por defecto, público. */
  privado?: boolean;
};

const LADO_MINIATURA = 640;
/**
 * La versión del celular (pulido de rendimiento, 13/11): un celular de 390 a 412 px con pantalla de alta densidad
 * necesita unos 700 a 1000 px; con solo 640 y 1600, bajaba la de 1600 (más del doble). Misma calidad (WebP 85).
 */
const LADO_MEDIANA = 1080;

/** Si vale la pena una versión de 1080 px: la foto es bastante más grande que eso (si no, ella misma ya sirve). */
const MARGEN_MEDIANA = 1.15;
export const llevaMediana = (ancho: number | null, alto: number | null) => Math.max(ancho ?? 0, alto ?? 0) > LADO_MEDIANA * MARGEN_MEDIANA;

/** Convierte y sube una foto, y la registra en `archivo`. */
export async function guardarFoto(entrada: FormDataEntryValue | null, opciones: Opciones): Promise<ResultadoFoto> {
  if (!(entrada instanceof File) || entrada.size === 0) return { ok: false, motivo: "vacia" };
  if (entrada.size > BYTES_MAXIMOS_FOTO || !(TIPOS_FOTO as readonly string[]).includes(entrada.type)) {
    return { ok: false, motivo: "invalida" };
  }

  const original = Buffer.from(await entrada.arrayBuffer());
  const visibilidad: Visibilidad = opciones.privado ? "privado" : "publico";
  // La de 1080 solo para el sitio: las fotos privadas se ven en el panel, chicas o en el visor
  const conMediana = !!opciones.miniatura && visibilidad === "publico";
  const lados = opciones.miniatura ? [opciones.ladoMayor ?? 1600, LADO_MINIATURA, ...(conMediana ? [LADO_MEDIANA] : [])] : [opciones.ladoMayor ?? 1600];
  const versiones = await convertirAWebp(original, lados);
  if (!versiones) return { ok: false, motivo: "invalida" };
  const [imagen, chica, mediana] = versiones;

  const base = `${opciones.carpeta}/${opciones.prefijo ?? ""}${randomUUID()}`;
  // Se anota cada subida: si falla la segunda (la miniatura) o el registro, se borra lo que ya se subió (auditoría QA-04)
  const subidas: string[] = [];
  try {
    const clave = await subirArchivo(`${base}.webp`, imagen.data, "image/webp", visibilidad);
    subidas.push(clave);
    const miniaturaClave = chica ? await subirArchivo(`${base}-${LADO_MINIATURA}.webp`, chica.data, "image/webp", visibilidad) : null;
    if (miniaturaClave) subidas.push(miniaturaClave);
    const medianaClave = mediana && llevaMediana(imagen.info.width, imagen.info.height) ? await subirArchivo(`${base}-${LADO_MEDIANA}.webp`, mediana.data, "image/webp", visibilidad) : null;
    if (medianaClave) subidas.push(medianaClave);
    const [fila] = await db
      .insert(archivo)
      .values({
        clave,
        tipoMime: "image/webp",
        bytes: imagen.info.size,
        ancho: imagen.info.width,
        alto: imagen.info.height,
        miniaturaClave,
        medianaClave,
        privado: visibilidad === "privado",
        createdBy: opciones.autorId,
      })
      .returning({ id: archivo.id });
    return { ok: true, archivoId: fila.id, clave };
  } catch (error) {
    // Sin la fila en `archivo` nadie encontraría estos archivos para borrarlos: se borran ahora.
    await Promise.allSettled(subidas.map((c) => borrarArchivo(c, visibilidad)));
    throw error;
  }
}

/**
 * Copia una foto privada (de una orden) al bucket público como un archivo nuevo, con su miniatura (HU-41, RNF-05). La
 * original no cambia: sigue privada y es de la orden; la copia es de quien la use (la galería) y se borra sola.
 */
export async function copiarFotoAlPublico(archivoId: number, opciones: { carpeta: string; autorId: number }): Promise<number> {
  const [original] = await db.select().from(archivo).where(eq(archivo.id, archivoId));
  if (!original?.privado) throw new Error(`La foto ${archivoId} no es una foto privada.`);
  const base = `${opciones.carpeta}/${randomUUID()}`;
  const subidas: string[] = [];
  try {
    const copiar = async (clave: string, nueva: string) => {
      subidas.push(await subirArchivo(nueva, await leerArchivo(clave, "privado"), original.tipoMime, "publico"));
      return nueva;
    };
    const grande = await leerArchivo(original.clave, "privado");
    const clave = `${base}.webp`;
    subidas.push(await subirArchivo(clave, grande, original.tipoMime, "publico"));
    const miniaturaClave = original.miniaturaClave ? await copiar(original.miniaturaClave, `${base}-${LADO_MINIATURA}.webp`) : null;
    // La privada no tiene la de 1080 (no se usa en el panel): se hace ahora, desde la grande
    const medianaClave = original.miniaturaClave && llevaMediana(original.ancho, original.alto) ? await subirMedianaDe(grande, `${base}-${LADO_MEDIANA}.webp`, subidas) : null;
    const [fila] = await db
      .insert(archivo)
      .values({ clave, tipoMime: original.tipoMime, bytes: original.bytes, ancho: original.ancho, alto: original.alto, miniaturaClave, medianaClave, createdBy: opciones.autorId })
      .returning({ id: archivo.id });
    return fila.id;
  } catch (error) {
    // Sin la fila en `archivo` nadie encontraría las copias para borrarlas: se borran ahora
    await Promise.allSettled(subidas.map((c) => borrarArchivo(c, "publico")));
    throw error;
  }
}

/** Borra una foto que ya no usa nadie: la fila de `archivo` y sus versiones en el almacenamiento. */
export async function eliminarFoto(archivoId: number): Promise<void> {
  const [fila] = await db.delete(archivo).where(eq(archivo.id, archivoId)).returning();
  if (!fila) return;
  const visibilidad: Visibilidad = fila.privado ? "privado" : "publico";
  await Promise.all([fila.clave, fila.miniaturaClave, fila.medianaClave].filter((c): c is string => !!c).map((c) => borrarArchivo(c, visibilidad)));
}

/** La versión de 1080 de una foto que ya está en el bucket público, desde su grande. Anota la subida en `subidas`. */
async function subirMedianaDe(grande: Buffer, clave: string, subidas: string[]): Promise<string | null> {
  const [mediana] = (await convertirAWebp(grande, [LADO_MEDIANA])) ?? [];
  if (!mediana) return null;
  subidas.push(await subirArchivo(clave, mediana.data, "image/webp", "publico"));
  return clave;
}

/**
 * Las fotos del sitio subidas antes de la versión de 1080 (13/11) la reciben de a una, al arrancar y antes de atender
 * (src/lib/arranque.ts): así las páginas que guarda la caché ya salen con ella (renovar la caché desde el arranque no se
 * puede: Next lo permite solo dentro de un pedido). Hasta `hastaMs`, para que un despliegue no se demore: las que
 * quedan, en el próximo arranque. Si una falla, sigue con la próxima y lo intenta de nuevo la próxima vez.
 */
export async function completarMedianas(hastaMs: number): Promise<{ hechas: number; quedan: number }> {
  const limite = Date.now() + hastaMs;
  // Solo las que la llevan (la regla de llevaMediana, en SQL): las chicas no se vuelven a leer en cada arranque
  const pendientes = await db
    .select({ id: archivo.id, clave: archivo.clave })
    .from(archivo)
    .where(
      and(
        eq(archivo.privado, false),
        isNotNull(archivo.miniaturaClave),
        isNull(archivo.medianaClave),
        eq(archivo.tipoMime, "image/webp"),
        sql`greatest(coalesce(${archivo.ancho}, 0), coalesce(${archivo.alto}, 0)) > ${LADO_MEDIANA * MARGEN_MEDIANA}`,
      ),
    );
  let hechas = 0;
  let intentadas = 0;
  for (const p of pendientes) {
    if (Date.now() > limite) break;
    intentadas++;
    const subidas: string[] = [];
    try {
      // Un nombre propio de este intento: dos instancias a la vez (un despliegue) no se pisan ni se borran lo del otro
      const nueva = p.clave.replace(/\.webp$/, `-${LADO_MEDIANA}-${randomUUID().slice(0, 8)}.webp`);
      const clave = await subirMedianaDe(await leerArchivo(p.clave, "publico"), nueva, subidas);
      if (!clave) continue;
      const anotadas = await db
        .update(archivo)
        .set({ medianaClave: clave })
        .where(and(eq(archivo.id, p.id), isNull(archivo.medianaClave)))
        .returning({ id: archivo.id });
      // La foto se borró mientras tanto, u otra instancia anotó la suya: la de este intento sobra
      if (anotadas.length === 0) {
        await Promise.allSettled(subidas.map((c) => borrarArchivo(c, "publico")));
        continue;
      }
      hechas++;
    } catch (error) {
      await Promise.allSettled(subidas.map((c) => borrarArchivo(c, "publico")));
      console.error(`[fotos] No se pudo hacer la versión de ${LADO_MEDIANA} px de la foto ${p.id}`, error);
    }
  }
  return { hechas, quedan: pendientes.length - intentadas };
}

/**
 * Borra fotos que ya no usa nadie sin cortar lo que sigue: lo guardado en la base ya vale y el sitio ya se renovó. Si el
 * almacenamiento falla, queda en el registro del servidor (el archivo sobra en el bucket, pero ya no se muestra).
 */
export async function eliminarFotosSinFallar(ids: readonly (number | null | undefined)[], motivo: string): Promise<void> {
  const resultados = await Promise.allSettled(ids.filter((id): id is number => typeof id === "number").map((id) => eliminarFoto(id)));
  for (const r of resultados) if (r.status === "rejected") console.error(motivo, r.reason);
}

/** `mediana`: la versión de 1080 px, si la tiene (solo las fotos del sitio). */
export type UrlsFoto = { url: string; miniatura: string; mediana?: string; ancho: number | null; alto: number | null };

type FilaFoto = { clave: string; miniaturaClave: string | null; medianaClave?: string | null; ancho: number | null; alto: number | null };

/** Direcciones públicas de una foto del bucket público; sin miniatura, se usa la grande. */
export function urlsFoto(fila: FilaFoto): UrlsFoto {
  return {
    url: urlArchivo(fila.clave),
    miniatura: urlArchivo(fila.miniaturaClave ?? fila.clave),
    ...(fila.medianaClave ? { mediana: urlArchivo(fila.medianaClave) } : {}),
    ancho: fila.ancho,
    alto: fila.alto,
  };
}

/** Enlaces firmados y temporales de una foto privada. Llamarla solo después de verificar el permiso. */
export async function urlsFotoPrivada(fila: FilaFoto): Promise<UrlsFoto> {
  const [url, miniatura] = await Promise.all([urlArchivoPrivado(fila.clave), urlArchivoPrivado(fila.miniaturaClave ?? fila.clave)]);
  return { url, miniatura, ancho: fila.ancho, alto: fila.alto };
}
