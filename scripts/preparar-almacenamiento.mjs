// Crea el bucket de desarrollo en RustFS y lo deja con lectura pública (como las fotos del sitio en R2).
// Uso: npm run almacenamiento:preparar  (requiere docker compose up -d)
import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const bucket = process.env.S3_BUCKET;
const cliente = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION ?? "auto",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

try {
  await cliente.send(new HeadBucketCommand({ Bucket: bucket }));
  console.log(`El bucket "${bucket}" ya existe.`);
} catch {
  await cliente.send(new CreateBucketCommand({ Bucket: bucket }));
  console.log(`Bucket "${bucket}" creado.`);
}

await cliente.send(
  new PutBucketPolicyCommand({
    Bucket: bucket,
    Policy: JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: "*",
          Action: ["s3:GetObject"],
          Resource: [`arn:aws:s3:::${bucket}/*`],
        },
      ],
    }),
  }),
);
console.log("Lectura pública habilitada.");
