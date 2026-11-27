// Genera los íconos PNG de la app instalable (HU-06) desde el ícono de la marca
// (public/marca/toctar-icono-app.svg: monograma sobre negro). Uso: node scripts/generar-iconos.mjs
// Se vuelve a correr solo si cambia el logo; los PNG quedan en el repositorio.
import { mkdir, readFile } from "node:fs/promises";
import sharp from "sharp";

const svg = await readFile("public/marca/toctar-icono-app.svg");
const negro = { r: 0, g: 0, b: 0, alpha: 1 };
await mkdir("public/iconos", { recursive: true });

const png = (tamano) => sharp(svg, { density: 300 }).resize(tamano, tamano).png({ compressionLevel: 9 });

for (const tamano of [192, 512]) await png(tamano).toFile(`public/iconos/icono-${tamano}.png`);

// Ícono "maskable": Android lo recorta en círculo o en gota; el monograma va más chico
// para quedar dentro de la zona segura (el 80 % central).
const interior = await png(400).toBuffer();
await sharp(interior).extend({ top: 56, bottom: 56, left: 56, right: 56, background: negro }).png({ compressionLevel: 9 }).toFile("public/iconos/icono-maskable-512.png");

// iPhone: "Agregar a inicio" usa el apple-icon (convención de Next.js en src/app).
await png(180).toFile("src/app/apple-icon.png");

// La imagen al compartir un enlace del sitio por WhatsApp o Facebook (og:image, 1200 x 630, pulido de SEO del 13/11):
// el logo con su lema sobre negro, y la línea roja de la marca abajo. Se vuelve a correr solo si cambia el logo.
const logo = await sharp(await readFile("public/marca/toctar-horizontal-sobre-oscuro.svg"), { density: 300 }).resize({ width: 760 }).png().toBuffer();
const { height: altoLogo } = await sharp(logo).metadata();
const linea = await sharp({ create: { width: 1200, height: 10, channels: 4, background: { r: 227, g: 6, b: 19, alpha: 1 } } }).png().toBuffer();
await sharp({ create: { width: 1200, height: 630, channels: 4, background: negro } })
  .composite([
    { input: logo, top: Math.round((630 - altoLogo) / 2) - 10, left: 220 },
    { input: linea, top: 620, left: 0 },
  ])
  .jpeg({ quality: 90 })
  .toFile("public/compartir.jpg");

console.log("Íconos generados en public/iconos y src/app/apple-icon.png; la imagen para compartir, en public/compartir.jpg");
