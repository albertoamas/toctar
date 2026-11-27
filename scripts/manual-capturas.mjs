// Las capturas del Manual del panel, en una tablet apaisada (1180 × 820), con la posición de cada número que señala algo
// en la pantalla. Lee los temas de scripts/manual/contenido.mjs y deja las fotos en contenido/manual/capturas/ y las
// posiciones en contenido/manual/marcas.json, que usa `npm run manual:armar`.
//
// Uso: con la app levantada (`npm run dev`) y los datos de demostración, `npm run manual:capturas` (todas) o
// `npm run manual:capturas -- 11-cotizacion 13-reserva` (solo esas). Entra con el dueño de .env y no imprime la
// contraseña. Solo mira: abre ventanas y menús, nunca guarda nada.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import { CAPITULOS } from "./manual/contenido.mjs";

const BASE = process.env.MANUAL_URL ?? "http://localhost:3000";
const ANCHO = 1180;
const ALTO = 820;
const SALIDA = path.join(process.cwd(), "contenido", "manual");
const CAPTURAS = path.join(SALIDA, "capturas");
const MARCAS = path.join(SALIDA, "marcas.json");

const pedidas = new Set(process.argv.slice(2));
const temas = CAPITULOS.flatMap((c) => c.temas).filter((t) => t.captura && (pedidas.size === 0 || pedidas.has(t.captura.id)));
if (temas.length === 0) throw new Error("No hay capturas con esos nombres.");

/** El elemento de una marca, según cómo se la describió en contenido.mjs. */
function ubicar(pagina, en) {
  if (en.etiqueta) return pagina.getByLabel(en.etiqueta, { exact: true }).first();
  if (en.texto) return pagina.getByText(en.texto, { exact: en.exacto ?? false }).first();
  if (en.css) return pagina.locator(en.css).first();
  return pagina.getByRole(en.rol, { name: en.nombre, exact: en.exacto ?? false }).first();
}

const cargada = () => !!document.querySelector("h1") && !document.querySelector(".tt-cargando, .animate-pulse, [data-slot='skeleton']");

/**
 * Hasta que la pantalla tenga su título y no quede ningún esqueleto de carga (ni en el menú). Si no termina, la vuelve a
 * pedir una vez; si tampoco, falla: nunca se guarda una captura a medio cargar.
 */
async function lista(pagina) {
  for (let intento = 0; ; intento++) {
    await pagina.waitForLoadState("networkidle", { timeout: 120_000 }).catch(() => {});
    const ok = await pagina.waitForFunction(cargada, null, { timeout: 90_000 }).then(() => true, () => false);
    if (ok) break;
    if (intento > 0) throw new Error(`la pantalla no terminó de cargar: ${pagina.url()}`);
    await pagina.reload({ waitUntil: "domcontentloaded" });
  }
  // El botón del modo de desarrollo de Next no va en el manual
  await pagina.addStyleTag({ content: "nextjs-portal{display:none!important}" }).catch(() => {});
  await pagina.waitForTimeout(800);
}

const usuario = process.env.DUENO_INICIAL_USUARIO;
const contrasena = process.env.DUENO_INICIAL_CONTRASENA;
if (!usuario || !contrasena) throw new Error("Faltan DUENO_INICIAL_USUARIO y DUENO_INICIAL_CONTRASENA en .env.");

mkdirSync(CAPTURAS, { recursive: true });
let marcas = {};
try {
  marcas = JSON.parse(readFileSync(MARCAS, "utf8"));
} catch {
  // Primera vez: sin marcas guardadas
}

const navegador = await chromium.launch({ channel: "chrome" });
const contexto = await navegador.newContext({ viewport: { width: ANCHO, height: ALTO }, hasTouch: true, isMobile: true, deviceScaleFactor: 1.25 });
const pagina = await contexto.newPage();

async function ingresar() {
  await pagina.goto(`${BASE}/ingresar`, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await lista(pagina);
  await pagina.getByLabel("Usuario").fill(usuario);
  await pagina.getByLabel("Contraseña", { exact: true }).fill(contrasena);
  await pagina.getByRole("button", { name: "Ingresar", exact: true }).click();
  await pagina.waitForURL(/\/panel/, { timeout: 60_000 });
}

let conSesion = false;
let fallas = 0;
// Primero las que van sin sesión (el ingreso)
for (const tema of [...temas.filter((t) => t.captura.sinSesion), ...temas.filter((t) => !t.captura.sinSesion)]) {
  const c = tema.captura;
  try {
    if (!c.sinSesion && !conSesion) {
      await ingresar();
      conSesion = true;
    }
    await pagina.goto(BASE + c.ruta, { waitUntil: "domcontentloaded", timeout: 180_000 });
    await lista(pagina);
    for (const paso of c.pasos ?? []) {
      if (paso.clic) {
        await ubicar(pagina, paso.clic).click();
        await lista(pagina);
      }
    }
    // `alto`: una pantalla larga se saca en una ventana más alta que la tablet, para que entre lo que se explica; la foto
    // y las posiciones salen de la misma ventana
    const alto = c.alto ?? ALTO;
    if (c.alto) {
      await pagina.setViewportSize({ width: ANCHO, height: alto });
      await pagina.waitForTimeout(600);
    }
    if (c.ver) {
      await ubicar(pagina, c.ver).evaluate((e) => e.scrollIntoView({ block: "start" }));
      await pagina.evaluate(() => window.scrollBy(0, -24));
      await pagina.waitForTimeout(400);
    }
    await pagina.screenshot({ path: path.join(CAPTURAS, `${c.id}.jpg`), type: "jpeg", quality: 72 });
    // Cada número va justo a la izquierda de lo que señala, a media altura: así no tapa el texto (si no hay lugar, sobre
    // su borde)
    const puestos = [];
    for (const [i, m] of c.marcas.entries()) {
      const caja = await ubicar(pagina, m.en).boundingBox({ timeout: 3000 }).catch(() => null);
      const dentro = caja && caja.y + caja.height > 0 && caja.y < alto && caja.x < ANCHO;
      if (!dentro) {
        console.log(`  ✗ ${c.id}: no se ve la marca ${i + 1} (${m.texto.slice(0, 40)}…)`);
        fallas++;
        puestos.push(null);
        continue;
      }
      // `lado: "arriba"`: encima, al centro (para un botón entre otros o un texto que el número taparía)
      const arriba = m.lado === "arriba";
      const x = Math.min(Math.max(arriba ? caja.x + caja.width / 2 : caja.x - 20, 14), ANCHO - 14);
      const y = Math.min(Math.max(arriba ? caja.y - 16 : caja.y + Math.min(caja.height, 60) / 2, 14), alto - 14);
      puestos.push({ x: +((x / ANCHO) * 100).toFixed(2), y: +((y / alto) * 100).toFixed(2) });
    }
    marcas[c.id] = { ancho: ANCHO, alto, puntos: puestos };
    if (c.alto) await pagina.setViewportSize({ width: ANCHO, height: ALTO });
    console.log(`ok ${c.id}`);
  } catch (error) {
    console.log(`FALLA ${c.id}: ${String(error).split("\n")[0].slice(0, 200)}`);
    fallas++;
  }
}
await navegador.close();
writeFileSync(MARCAS, `${JSON.stringify(marcas, null, 2)}\n`);
console.log(fallas ? `\n${fallas} problemas: revisa las marcas en scripts/manual/contenido.mjs.` : "\nListo.");
