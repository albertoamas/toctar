import { defineConfig, devices } from "@playwright/test";

// Pruebas de punta a punta de los flujos críticos (docs/05-analisis/diagramas-de-secuencia).
// Corren contra el build de producción, como recomienda Next.js, con una base propia
// (toctar_e2e) que se recrea vacía en cada corrida. Requiere `docker compose up -d`.
const puerto = 3200;

// En Windows, Control de aplicaciones bloquea el Chromium de Playwright (no firmado);
// se usa el Google Chrome instalado. En Linux (CI, servidor) se usa el de Playwright.
const canal = process.platform === "win32" ? "chrome" : undefined;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${puerto}`,
    // En el CI, el registro completo (red, pantalla y pasos) del primer intento que falla, aunque el reintento pase: una
    // prueba intermitente deja así qué pasó (antes solo quedaba el del reintento, que pasaba). Graba todas las pruebas: en
    // una PC con 6 en paralelo la carga sube (6,8 a 8,9 min) y hace fallar las que esperan 5 s; en local, solo el reintento
    trace: process.env.CI ? "retain-on-first-failure" : "on-first-retry",
    // Como los usuarios reales: español de Bolivia y su hora. Sin esto, en CI (Linux, en inglés y en UTC) las horas se
    // ven con AM/PM y las fechas en otro formato que en la PC y en el teléfono del taller.
    locale: "es-BO",
    timezoneId: "America/La_Paz",
  },
  projects: [
    // Datos que el sitio necesita y que se cargan por el panel (tests/e2e/preparar.setup.ts)
    { name: "preparar", testMatch: /preparar\.setup\.ts/, use: { ...devices["Desktop Chrome"], channel: canal } },
    // La mayoría usa el sistema desde el celular
    { name: "celular", use: { ...devices["Pixel 7"], channel: canal }, dependencies: ["preparar"], testIgnore: /iphone\.spec\.ts/ },
    { name: "escritorio", use: { ...devices["Desktop Chrome"], channel: canal }, dependencies: ["preparar"], testIgnore: /iphone\.spec\.ts/ },
    // Lo que se ve distinto en el iPhone: WebKit, el motor de Safari y de todos los navegadores del iPhone (03/11). Después
    // de escritorio: sube su propio logo, y hu-04 (solo en escritorio) comprueba que el logo anterior se borra. En Windows
    // el WebKit de Playwright sí corre (el Chromium no); se instala una vez con `npx playwright install webkit`.
    { name: "iphone", testMatch: /iphone\.spec\.ts/, use: { ...devices["iPhone 14"] }, dependencies: ["escritorio"] },
  ],
  webServer: {
    command: `node scripts/reiniciar-base-e2e.mjs && npm run build && npx next start -p ${puerto}`,
    url: `http://localhost:${puerto}/api/salud`,
    // Siempre un servidor nuevo: la base se recrea en cada corrida.
    reuseExistingServer: false,
    timeout: 240_000,
    env: {
      DATABASE_URL: "postgres://toctar:toctar@localhost:5432/toctar_e2e",
      BETTER_AUTH_URL: `http://localhost:${puerto}`,
      DUENO_INICIAL_USUARIO: "dueno",
      DUENO_INICIAL_NOMBRE: "Dueño de prueba",
      DUENO_INICIAL_CONTRASENA: "dueno-e2e-123",
      // Como en producción: el sitio se indexa (HU-18)
      SITIO_URL: `http://localhost:${puerto}`,
      SITIO_INDEXABLE: "true",
      // El secreto de origen de Cloudflare (guía de despliegue, paso 3b): un valor de prueba, no el de los entornos
      ORIGEN_CLOUDFLARE_SECRETO: "secreto-e2e-de-cloudflare",
    },
  },
});
