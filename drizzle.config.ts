import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// Carga .env igual que Next.js, para que drizzle-kit vea DATABASE_URL
loadEnvConfig(process.cwd());

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/esquema.ts",
  out: "./src/db/migraciones",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
