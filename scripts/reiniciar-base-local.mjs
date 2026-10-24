// Deja vacía la base de DESARROLLO y sus buckets (RustFS), para empezar de cero: por ejemplo, antes de cargar los
// datos de demostración (scripts/datos-demo.mjs). Solo trabaja sobre la base y el almacenamiento de esta computadora:
// si DATABASE_URL o S3_ENDPOINT no apuntan a localhost, no hace nada.
//
// Uso:  npm run db:reiniciar-local
// Después: npm run db:migrate, arrancar la app una vez (crea el dueño, src/lib/arranque.ts) y npm run datos:demo.
import { DeleteObjectsCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import pg from "pg";

const LOCALES = new Set(["localhost", "127.0.0.1", "::1"]);

const urlBase = new URL(process.env.DATABASE_URL ?? "");
const urlAlmacenamiento = new URL(process.env.S3_ENDPOINT ?? "");
if (!LOCALES.has(urlBase.hostname) || !LOCALES.has(urlAlmacenamiento.hostname)) {
  console.error("Solo se reinicia la base y el almacenamiento de esta computadora: DATABASE_URL y S3_ENDPOINT deben apuntar a localhost.");
  process.exit(1);
}

// La base: se borra y se crea vacía (las migraciones se aplican después, con npm run db:migrate)
const nombreBase = urlBase.pathname.slice(1);
const urlAdmin = new URL(urlBase);
urlAdmin.pathname = "/postgres";
const admin = new pg.Client({ connectionString: urlAdmin.toString() });
await admin.connect();
await admin.query(`drop database if exists "${nombreBase}" with (force)`);
await admin.query(`create database "${nombreBase}"`);
await admin.end();
console.log(`Base "${nombreBase}" vacía.`);

// Los buckets: sin las fotos y los PDF de antes (si quedaran, no los encontraría nadie)
const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION ?? "auto",
  credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY },
  forcePathStyle: true,
});
for (const bucket of [process.env.S3_BUCKET, process.env.S3_BUCKET_PRIVADO]) {
  let borrados = 0;
  let token;
  do {
    const pagina = await s3.send(new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token }));
    const claves = (pagina.Contents ?? []).map((o) => ({ Key: o.Key }));
    if (claves.length > 0) {
      await s3.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: claves } }));
      borrados += claves.length;
    }
    token = pagina.NextContinuationToken;
  } while (token);
  console.log(`Bucket "${bucket}": ${borrados} archivos borrados.`);
}
