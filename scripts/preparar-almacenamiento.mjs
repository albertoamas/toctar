// Crea los buckets de desarrollo en RustFS, como en R2:
// - S3_BUCKET: público (fotos del sitio), con lectura pública.
// - S3_BUCKET_PRIVADO: privado (datos de clientes, como las fotos de reclamos), sin lectura pública.
// Uso: npm run almacenamiento:preparar  (requiere docker compose up -d). Se puede correr de nuevo sin problema.
import {
  CreateBucketCommand,
  DeleteBucketPolicyCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const publico = process.env.S3_BUCKET;
const privado = process.env.S3_BUCKET_PRIVADO;
if (!publico || !privado) throw new Error("Faltan S3_BUCKET o S3_BUCKET_PRIVADO en .env (ver .env.example).");

const cliente = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION ?? "auto",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

async function crear(bucket) {
  try {
    await cliente.send(new HeadBucketCommand({ Bucket: bucket }));
    console.log(`El bucket "${bucket}" ya existe.`);
  } catch {
    await cliente.send(new CreateBucketCommand({ Bucket: bucket }));
    console.log(`Bucket "${bucket}" creado.`);
  }
}

await crear(publico);
await cliente.send(
  new PutBucketPolicyCommand({
    Bucket: publico,
    Policy: JSON.stringify({
      Version: "2012-10-17",
      Statement: [{ Effect: "Allow", Principal: "*", Action: ["s3:GetObject"], Resource: [`arn:aws:s3:::${publico}/*`] }],
    }),
  }),
);
console.log(`"${publico}": lectura pública habilitada.`);

await crear(privado);
try {
  await cliente.send(new DeleteBucketPolicyCommand({ Bucket: privado }));
} catch {
  // Sin política: ya es privado.
}
console.log(`"${privado}": sin lectura pública.`);
