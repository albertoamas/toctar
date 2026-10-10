import "server-only";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

// Fotos y PDF en almacenamiento compatible con S3: Cloudflare R2 en pruebas y producción,
// RustFS (docker-compose.yml) en desarrollo. El código es el mismo; solo cambian las variables.

function variable(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre}`);
  return valor;
}

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

/** Guarda un archivo y devuelve su clave. Una clave nunca se reutiliza: los PDF enviados no cambian (RN-02). */
export async function subirArchivo(clave: string, contenido: Uint8Array, tipo: string): Promise<string> {
  await obtenerCliente().send(
    new PutObjectCommand({
      Bucket: variable("S3_BUCKET"),
      Key: clave,
      Body: contenido,
      ContentType: tipo,
    }),
  );
  return clave;
}

export async function borrarArchivo(clave: string): Promise<void> {
  await obtenerCliente().send(new DeleteObjectCommand({ Bucket: variable("S3_BUCKET"), Key: clave }));
}

/** URL pública de un archivo (fotos del sitio). */
export function urlArchivo(clave: string): string {
  return `${variable("S3_URL_PUBLICA").replace(/\/$/, "")}/${clave}`;
}
