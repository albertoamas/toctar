"use server";

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import sharp from "sharp";
import { db } from "@/db";
import { archivo, negocio, sucursal } from "@/db/esquema";
import { subirArchivo } from "@/lib/almacenamiento";
import { exigirModulo } from "@/lib/sesion";
import { whatsAppLocal } from "@/lib/whatsapp";
import { ETIQUETA_NEGOCIO, obtenerConfiguracionNegocio } from "./consultas";
import {
  BYTES_MAXIMOS_LOGO,
  CAMPOS_NEGOCIO,
  erroresDe,
  esquemaNegocio,
  TIPOS_LOGO,
  type EstadoFormulario,
} from "./esquemas";

// Configuración del negocio (HU-04). Solo el dueño entra al módulo "configuracion".
// Al guardar se invalida la etiqueta "negocio": el sitio muestra los datos nuevos sin volver a desplegar.

const RUTA = "/panel/configuracion";

function valoresDe(datos: FormData): Record<string, string> {
  return Object.fromEntries(CAMPOS_NEGOCIO.map((c) => [c, String(datos.get(c) ?? "")]));
}

export async function guardarNegocio(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const autor = await exigirModulo("configuracion");
  const entrada = esquemaNegocio.safeParse(valoresDe(datos));
  if (!entrada.success) return { errores: erroresDe(entrada.error), valores: valoresDe(datos) };
  const d = entrada.data;
  const autorId = Number(autor.id);
  const { sucursalId } = await obtenerConfiguracionNegocio();

  await db.transaction(async (tx) => {
    await tx
      .update(negocio)
      .set({
        nombre: d.nombre,
        correo: d.correo,
        redes: {
          ...(d.facebook && { facebook: d.facebook }),
          ...(d.instagram && { instagram: d.instagram }),
          ...(d.tiktok && { tiktok: d.tiktok }),
        },
        nit: d.nit,
        razonSocial: d.razonSocial,
        updatedAt: new Date(),
        updatedBy: autorId,
      })
      .where(eq(negocio.id, 1));
    await tx
      .update(sucursal)
      .set({
        direccion: d.direccion,
        lat: d.ubicacion?.lat ?? null,
        lng: d.ubicacion?.lng ?? null,
        horarios: d.horarios,
        telefonoWhatsapp: d.whatsapp,
        updatedAt: new Date(),
        updatedBy: autorId,
      })
      .where(eq(sucursal.id, sucursalId));
  });

  updateTag(ETIQUETA_NEGOCIO);
  revalidatePath(RUTA);
  // Se devuelven los valores ya normalizados: el formulario muestra lo que quedó guardado.
  return {
    ok: true,
    mensaje: "Cambios guardados.",
    valores: {
      ...valoresDe(datos),
      whatsapp: whatsAppLocal(d.whatsapp),
      correo: d.correo ?? "",
      ubicacion: d.ubicacion ? `${d.ubicacion.lat}, ${d.ubicacion.lng}` : "",
      facebook: d.facebook ?? "",
      instagram: d.instagram ?? "",
      tiktok: d.tiktok ?? "",
    },
  };
}

const ERROR_LOGO = "El logo debe ser PNG, JPG o WebP de hasta 5 MB.";

/** Logo para el PDF de cotización y otros documentos. Se guarda en WebP de hasta 1600 px, con transparencia. */
export async function subirLogo(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const autor = await exigirModulo("configuracion");
  const archivoSubido = datos.get("logo");
  if (!(archivoSubido instanceof File) || archivoSubido.size === 0) return { errores: { logo: "Elige una imagen." } };
  if (archivoSubido.size > BYTES_MAXIMOS_LOGO || !(TIPOS_LOGO as readonly string[]).includes(archivoSubido.type)) {
    return { errores: { logo: ERROR_LOGO } };
  }

  const imagen = await convertirLogo(Buffer.from(await archivoSubido.arrayBuffer()));
  if (!imagen) return { errores: { logo: ERROR_LOGO } };

  const clave = await subirArchivo(`negocio/logo-${randomUUID()}.webp`, imagen.data, "image/webp");
  await db.transaction(async (tx) => {
    const [nuevo] = await tx
      .insert(archivo)
      .values({
        clave,
        tipoMime: "image/webp",
        bytes: imagen.info.size,
        ancho: imagen.info.width,
        alto: imagen.info.height,
        createdBy: Number(autor.id),
      })
      .returning({ id: archivo.id });
    await tx
      .update(negocio)
      .set({ logoArchivoId: nuevo.id, updatedAt: new Date(), updatedBy: Number(autor.id) })
      .where(eq(negocio.id, 1));
  });

  updateTag(ETIQUETA_NEGOCIO);
  revalidatePath(RUTA);
  return { ok: true, mensaje: "Logo actualizado." };
}

/** WebP de hasta 1600 px, o null si el archivo no es de verdad PNG, JPG o WebP (el tipo que dice el navegador no basta). */
async function convertirLogo(original: Buffer) {
  try {
    const { format } = await sharp(original).metadata();
    if (!format || !["png", "jpeg", "webp"].includes(format)) return null;
    return await sharp(original)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 90 })
      .toBuffer({ resolveWithObject: true });
  } catch {
    return null;
  }
}
