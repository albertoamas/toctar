import "server-only";
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, NotFound, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Fotos y PDF en almacenamiento compatible con S3: Cloudflare R2 en pruebas y producción,
// RustFS (docker-compose.yml) en desarrollo. El código es el mismo; solo cambian las variables.
//
// Dos buckets:
// - público (S3_BUCKET): lo que muestra el sitio (servicios, galería, logo). Se sirve desde S3_URL_PUBLICA.
// - privado (S3_BUCKET_PRIVADO): datos de clientes, como las fotos de los reclamos. Sin acceso público:
//   el panel las muestra con enlaces firmados que vencen.

function variable(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre}`);
  return valor;
}

export type Visibilidad = "publico" | "privado";

/** Cuánto dura un enlace firmado a un archivo privado. */
const SEGUNDOS_ENLACE_PRIVADO = 15 * 60;

let cliente: S3Client | undefined;

function obtenerCliente(): S3Client {
  cliente ??= new S3Client({
    endpoint: variable("S3_ENDPOINT"),
    region: process.env.S3_REGION ?? "auto",
    credentials: {
      accessKeyId: variable("S3_ACCESS_KEY_ID"),
      secretAccessKey: variable("S3_SECRET_ACCESS_KEY"),
    },
    // RustFS solo acepta rutas del tipo endpoint/bucket/clave; R2 acepta ambas.
    forcePathStyle: true,
  });
  return cliente;
}

function bucket(visibilidad: Visibilidad): string {
  return variable(visibilidad === "privado" ? "S3_BUCKET_PRIVADO" : "S3_BUCKET");
}

/** Guarda un archivo y devuelve su clave. Una clave nunca se reutiliza: los PDF enviados no cambian (RN-02). */
export async function subirArchivo(clave: string, contenido: Uint8Array, tipo: string, visibilidad: Visibilidad = "publico"): Promise<string> {
  await obtenerCliente().send(new PutObjectCommand({ Bucket: bucket(visibilidad), Key: clave, Body: contenido, ContentType: tipo }));
  return clave;
}

export async function borrarArchivo(clave: string, visibilidad: Visibilidad = "publico"): Promise<void> {
  await obtenerCliente().send(new DeleteObjectCommand({ Bucket: bucket(visibilidad), Key: clave }));
}

/** URL pública de un archivo del bucket público (fotos del sitio). */
export function urlArchivo(clave: string): string {
  return `${variable("S3_URL_PUBLICA").replace(/\/$/, "")}/${clave}`;
}

/** Cuánto dura el permiso para subir un archivo directo desde el navegador. */
const SEGUNDOS_SUBIDA_DIRECTA = 10 * 60;

/**
 * Permiso firmado para que el navegador suba un archivo directo al bucket privado (videos de consultas: una acción del
 * servidor acepta hasta 6 MB). El tipo y el tamaño van firmados: con otros, el almacenamiento rechaza la subida.
 * Necesita CORS en el bucket (scripts/preparar-almacenamiento.mjs; en R2, docs/08-desarrollo/despliegue.md).
 */
export async function urlSubidaPrivada(clave: string, tipo: string, bytes: number): Promise<string> {
  return getSignedUrl(obtenerCliente(), new PutObjectCommand({ Bucket: bucket("privado"), Key: clave, ContentType: tipo, ContentLength: bytes }), {
    expiresIn: SEGUNDOS_SUBIDA_DIRECTA,
  });
}

/** Tipo y tamaño de un archivo del bucket privado, o null si no está (por ejemplo, la subida no terminó). */
export async function datosArchivoPrivado(clave: string): Promise<{ tipo: string; bytes: number } | null> {
  try {
    const r = await obtenerCliente().send(new HeadObjectCommand({ Bucket: bucket("privado"), Key: clave }));
    return { tipo: r.ContentType ?? "", bytes: r.ContentLength ?? 0 };
  } catch (error) {
    if (error instanceof NotFound) return null;
    throw error;
  }
}

/** Enlace firmado y temporal a un archivo del bucket privado. Solo se genera después de verificar permisos. */
export async function urlArchivoPrivado(clave: string): Promise<string> {
  return getSignedUrl(obtenerCliente(), new GetObjectCommand({ Bucket: bucket("privado"), Key: clave }), { expiresIn: SEGUNDOS_ENLACE_PRIVADO });
}
