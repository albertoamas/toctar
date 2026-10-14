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
    trace: "on-first-retry",
  },
  projects: [
    // La mayoría usa el sistema desde el celular
    { name: "celular", use: { ...devices["Pixel 7"], channel: canal } },
    { name: "escritorio", use: { ...devices["Desktop Chrome"], channel: canal } },
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
    },
  },
});
