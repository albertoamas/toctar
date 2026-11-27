import { defineConfig } from "vitest/config";

// Pruebas unitarias de las reglas de negocio (RN). Las pantallas se prueban con Playwright.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
  },
});
