import "server-only";
import { DeleteObjectCommand, GetObjectCommand, NoSuchKey, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
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

/**
 * Encabezado Content-Disposition: abrir o descargar, con el nombre del archivo. El nombre, solo con letras sin tildes,
 * números, punto, guion y guion bajo: nada que rompa el encabezado.
 */
export function disposicion(nombre: string, descargar = false): string {
  return `${descargar ? "attachment" : "inline"}; filename="${nombre.replace(/[^A-Za-z0-9._-]/g, "_")}"`;
}

/**
 * Enlace firmado y temporal a un archivo del bucket privado. Solo se genera después de verificar permisos.
 * `nombre`: con el que se guarda (un PDF); `descargar`: lo baja en vez de abrirlo en una pestaña.
 */
export async function urlArchivoPrivado(clave: string, opciones: { nombre?: string; descargar?: boolean } = {}): Promise<string> {
  const comando = new GetObjectCommand({
    Bucket: bucket("privado"),
    Key: clave,
    ResponseContentDisposition: opciones.nombre ? disposicion(opciones.nombre, opciones.descargar) : undefined,
  });
  return getSignedUrl(obtenerCliente(), comando, { expiresIn: SEGUNDOS_ENLACE_PRIVADO });
}

/** El contenido de un archivo, para armar documentos (el logo y las fotos del PDF de la cotización). */
export async function leerArchivo(clave: string, visibilidad: Visibilidad): Promise<Buffer> {
  const r = await obtenerCliente().send(new GetObjectCommand({ Bucket: bucket(visibilidad), Key: clave }));
  if (!r.Body) throw new Error(`El archivo ${clave} está vacío.`);
  return Buffer.from(await r.Body.transformToByteArray());
}

/** El contenido de un archivo privado como flujo, para entregarlo sin tenerlo entero en memoria; null si no está. */
export async function flujoArchivoPrivado(clave: string): Promise<ReadableStream | null> {
  try {
    const r = await obtenerCliente().send(new GetObjectCommand({ Bucket: bucket("privado"), Key: clave }));
    return r.Body ? r.Body.transformToWebStream() : null;
  } catch (error) {
    if (error instanceof NoSuchKey) return null;
    throw error;
  }
}
