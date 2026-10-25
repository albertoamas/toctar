import { expect, test } from "vitest";
import { fechaConDia } from "@/lib/fechas";
import { cantidad, textoEntregaAtrasada, textoIngresoAtrasado } from "@/modulos/inicio/reglas";

// HU-39 Pantalla del día (RF-52). Especificación: docs/08-desarrollo/etapas/C5-cierre-entrega-2.md §5 y §8.

const hoy = "2026-10-23";

test("la fecha del título lleva el día de la semana", () => {
  expect(fechaConDia(hoy)).toBe("Viernes 23 de octubre");
  expect(fechaConDia("2026-11-01")).toBe("Domingo 1 de noviembre");
});

test("un ingreso de un día pasado dice desde cuándo se lo espera; uno de hoy, nada", () => {
  expect(textoIngresoAtrasado("2026-10-21", hoy)).toBe("Debía ingresar el 21/10");
  expect(textoIngresoAtrasado("2025-12-30", hoy)).toBe("Debía ingresar el 30/12/2025");
  expect(textoIngresoAtrasado(hoy, hoy)).toBeNull();
});

test("una orden que se debía entregar antes de hoy está atrasada; una lista que espera al cliente, no", () => {
  expect(textoEntregaAtrasada({ estado: "en_proceso", fechaFin: "2026-10-22" }, hoy)).toBe("Atrasada desde el 22/10");
  expect(textoEntregaAtrasada({ estado: "recibido", fechaFin: hoy }, hoy)).toBeNull();
  expect(textoEntregaAtrasada({ estado: "listo", fechaFin: "2026-10-20" }, hoy)).toBeNull();
});

test("la cantidad con su palabra", () => {
  expect(cantidad(1, "vencido", "vencidos")).toBe("1 vencido");
  expect(cantidad(0, "vencido", "vencidos")).toBe("0 vencidos");
  expect(cantidad(3, "pendiente", "pendientes")).toBe("3 pendientes");
});
