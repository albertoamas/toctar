import { expect, test } from "vitest";
import { fechaConDia } from "@/lib/fechas";
import { cantidad } from "@/lib/cantidad";
import { ordenesDelDia, paraHoy, textoEntregaAtrasada, textoIngresoAtrasado } from "@/modulos/inicio/reglas";

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

test("las entregas del día son las de hoy y las atrasadas; una lista, solo si se entrega hoy; las listas sin avisar aparte", () => {
  const o = (id: number, estado: "recibido" | "en_proceso" | "listo", fechaFin: string, sinAvisar = false) => ({ id, estado, fechaFin, sinAvisar });
  const abiertas = [
    o(1, "en_proceso", "2026-10-20"),
    o(2, "recibido", hoy),
    o(3, "recibido", "2026-10-24"),
    o(4, "listo", "2026-09-23", true),
    o(5, "listo", hoy),
  ];
  const { entregas, listas } = ordenesDelDia(abiertas, hoy);
  expect(entregas.map((e) => e.id)).toEqual([1, 2, 5]);
  expect(listas.map((l) => l.id)).toEqual([4]);
});

test("la cantidad con su palabra", () => {
  expect(cantidad(1, "vencido", "vencidos")).toBe("1 vencido");
  expect(cantidad(0, "vencido", "vencidos")).toBe("0 vencidos");
  expect(cantidad(3, "pendiente", "pendientes")).toBe("3 pendientes");
});

test("Para hoy junta lo que llega, las entregas y las listas sin avisar, sin repetir órdenes (pedido 26)", () => {
  const ingresos = [
    { id: 1, placa: "1111AAA", cliente: "Ana", espacio: "Espacio 1", fechaInicio: "2026-10-21", horaIngreso: null },
    { id: 2, placa: "2222BBB", cliente: "Beto", espacio: "Espacio 2", fechaInicio: hoy, horaIngreso: "a las 8:30" },
  ];
  const abiertas = [
    { id: 3, placa: "3333CCC", cliente: "Caro", estado: "en_proceso" as const, fechaFin: "2026-10-22", sinAvisar: false },
    { id: 4, placa: "4444DDD", cliente: "Dani", estado: "listo" as const, fechaFin: hoy, sinAvisar: true },
    { id: 5, placa: "5555EEE", cliente: "Eli", estado: "listo" as const, fechaFin: "2026-10-20", sinAvisar: true },
    { id: 6, placa: "6666FFF", cliente: "Fer", estado: "en_proceso" as const, fechaFin: "2026-10-25", sinAvisar: false },
  ];
  const filas = paraHoy(ingresos, abiertas, hoy);
  expect(filas.map((f) => f.id)).toEqual([1, 2, 3, 4, 5]);
  expect(filas[0]).toMatchObject({ estado: "agendado", avisos: ["Debía ingresar el 21/10"], cuando: "Llega hoy, Espacio 1" });
  expect(filas[1]).toMatchObject({ avisos: [], cuando: "Llega a las 8:30, Espacio 2" });
  expect(filas[2]).toMatchObject({ estado: "en_proceso", avisos: ["Atrasada desde el 22/10"], cuando: "Entrega ayer" });
  // Entrega de hoy y lista sin avisar: una vez, con su aviso
  expect(filas[3]).toMatchObject({ estado: "listo", avisos: ["Sin avisar"], cuando: "Entrega hoy" });
  // Lista desde antes, sin avisar: no está atrasada (el trabajo ya se hizo)
  expect(filas[4]).toMatchObject({ avisos: ["Sin avisar"] });
  // La que se entrega más adelante no es de hoy
  expect(paraHoy([], [abiertas[3]], hoy)).toEqual([]);
});
