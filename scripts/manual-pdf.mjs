// El PDF del Manual del panel (A4, con los estilos de impresión de la página): lo saca de /panel/manual, con el dueño de
// .env (no imprime la contraseña), y lo deja en contenido/manual/manual-del-panel-toctar.pdf, que se baja desde el
// manual. Uso: con la app levantada, después de `npm run manual:armar`, `npm run manual:pdf`.

import path from "node:path";
import { chromium } from "@playwright/test";

const BASE = process.env.MANUAL_URL ?? "http://localhost:3000";
const usuario = process.env.DUENO_INICIAL_USUARIO;
const contrasena = process.env.DUENO_INICIAL_CONTRASENA;
if (!usuario || !contrasena) throw new Error("Faltan DUENO_INICIAL_USUARIO y DUENO_INICIAL_CONTRASENA en .env.");

const navegador = await chromium.launch({ channel: "chrome" });
const pagina = await (await navegador.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
await pagina.goto(`${BASE}/ingresar`);
await pagina.getByLabel("Usuario").fill(usuario);
await pagina.getByLabel("Contraseña", { exact: true }).fill(contrasena);
await pagina.getByRole("button", { name: "Ingresar", exact: true }).click();
await pagina.waitForURL(/\/panel/, { timeout: 60_000 });
await pagina.goto(`${BASE}/panel/manual`, { waitUntil: "networkidle" });
// Todas las capturas cargadas (las de abajo esperan a que se llegue a ellas) y las fuentes listas
await pagina.evaluate(async () => {
  for (const imagen of document.images) imagen.loading = "eager";
  await Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((listo) => (i.onload = i.onerror = listo)))));
  await document.fonts.ready;
});
await pagina.emulateMedia({ media: "print" });
const destino = path.join(process.cwd(), "contenido", "manual", "manual-del-panel-toctar.pdf");
await pagina.pdf({ path: destino, format: "A4", printBackground: true, preferCSSPageSize: true });
await navegador.close();
console.log("Listo: contenido/manual/manual-del-panel-toctar.pdf");
