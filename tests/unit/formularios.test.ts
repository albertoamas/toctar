import { expect, test } from "vitest";
import { z } from "zod";
import { erroresDe, indiceUnicoViolado } from "@/lib/formularios";

// Ayudas comunes de las acciones del panel (src/lib/formularios.ts).

test("errores por campo: el primero de cada campo, y por fila en las listas", () => {
  const esquema = z.object({ nombre: z.string().min(2, "Corto.").max(3, "Largo."), pasos: z.array(z.string().min(1, "Vacío.")) });
  const r = esquema.safeParse({ nombre: "a", pasos: ["ok", ""] });
  expect(erroresDe(r.error!)).toEqual({ nombre: "Corto.", "pasos.1": "Vacío." });
});

test("índice único violado: reconoce el error de PostgreSQL, directo o envuelto por Drizzle", () => {
  expect(indiceUnicoViolado({ code: "23505", constraint: "servicio_slug_unique" })).toBe("servicio_slug_unique");
  expect(indiceUnicoViolado({ message: "Failed query", cause: { code: "23505", constraint: "servicio_nombre_unico" } })).toBe("servicio_nombre_unico");
  expect(indiceUnicoViolado({ code: "23503" })).toBeNull();
  expect(indiceUnicoViolado(new Error("otra cosa"))).toBeNull();
  expect(indiceUnicoViolado(undefined)).toBeNull();
});
