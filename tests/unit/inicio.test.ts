import { expect, test } from "vitest";
import { fechaConDia } from "@/lib/fechas";
import { cantidad } from "@/lib/cantidad";
import { numerosDelDia, repartirDia, textoEntregaAtrasada, textoIngresoAtrasado } from "@/modulos/inicio/reglas";

// HU-39 Pantalla del día (RF-52). Especificación: docs/08-desarrollo/etapas/C5-cierre-entrega-2.md §5 y §8.

const hoy = "2026-10-23";

test("la fecha del título lleva el día de la semana", () => {
  expect(fechaConDia(hoy)).toBe("Viernes 23 de octubre");
  expect(fechaConDia("2026-11-01")).toBe("Domingo 1 de noviembre");
});

test("un ingreso de un día pasado dice desde cuándo se lo espera; uno de hoy, nada", () => {
  expect(textoIngresoAtrasado("2026-10-21", hoy)).toBe("Atrasada: debía ingresar el 21/10");
  expect(textoIngresoAtrasado("2025-12-30", hoy)).toBe("Atrasada: debía ingresar el 30/12/2025");
  expect(textoIngresoAtrasado(hoy, hoy)).toBeNull();
});

test("una orden que se debía entregar antes de hoy está atrasada; una lista que espera al cliente, no", () => {
  expect(textoEntregaAtrasada({ estado: "en_proceso", fechaFin: "2026-10-22" }, hoy)).toBe("Atrasada: debía entregarse el 22/10");
  expect(textoEntregaAtrasada({ estado: "recibido", fechaFin: hoy }, hoy)).toBeNull();
  expect(textoEntregaAtrasada({ estado: "listo", fechaFin: "2026-10-20" }, hoy)).toBeNull();
});

test("la cantidad con su palabra", () => {
  expect(cantidad(1, "vencido", "vencidos")).toBe("1 vencido");
  expect(cantidad(0, "vencido", "vencidos")).toBe("0 vencidos");
  expect(cantidad(3, "pendiente", "pendientes")).toBe("3 pendientes");
});

test("Urgente es lo atrasado; Hoy, solo lo de hoy y las listas por avisar, sin repetir órdenes (19/11)", () => {
  const ingresos = [
    { id: 1, placa: "1111AAA", cliente: "Ana", espacio: "Espacio 1", fechaInicio: "2026-10-21", horaIngreso: null },
    { id: 2, placa: "2222BBB", cliente: "Beto", espacio: "Espacio 2", fechaInicio: hoy, horaIngreso: "a las 8:30" },
  ];
  const abiertas = [
    { id: 3, placa: "3333CCC", cliente: "Caro", estado: "en_proceso" as const, fechaFin: "2026-10-22", sinAvisar: false },
    { id: 4, placa: "4444DDD", cliente: "Dani", estado: "listo" as const, fechaFin: hoy, sinAvisar: true },
    { id: 5, placa: "5555EEE", cliente: "Eli", estado: "listo" as const, fechaFin: "2026-10-20", sinAvisar: true },
    { id: 6, placa: "6666FFF", cliente: "Fer", estado: "en_proceso" as const, fechaFin: "2026-10-25", sinAvisar: false },
    { id: 7, placa: "7777GGG", cliente: "Gabi", estado: "recibido" as const, fechaFin: hoy, sinAvisar: false },
    { id: 8, placa: "8888HHH", cliente: "Hugo", estado: "listo" as const, fechaFin: hoy, sinAvisar: false },
    { id: 9, placa: "9999III", cliente: "Iris", estado: "listo" as const, fechaFin: "2026-10-19", sinAvisar: false },
  ];
  const { urgentes, hoy: deHoy } = repartirDia(ingresos, abiertas, hoy);
  // La reserva que no llegó y la orden atrasada, con su atraso; una lista que espera al cliente no está atrasada
  expect(urgentes.map((f) => f.id)).toEqual([1, 3]);
  expect(urgentes[0]).toMatchObject({ estado: "agendado", aviso: "Atrasada: debía ingresar el 21/10", detalle: "Reservada, por recibir, Espacio 1", paso: "recibir" });
  expect(urgentes[1]).toMatchObject({ aviso: "Atrasada: debía entregarse el 22/10", detalle: "En proceso", paso: null });
  // Hoy: lo que llega, las listas sin avisar (aunque sean de antes), lo que se entrega hoy; la avisada que se entrega hoy, a entregar
  expect(deHoy.map((f) => f.id)).toEqual([2, 4, 5, 7, 8]);
  expect(deHoy[0]).toMatchObject({ aviso: null, detalle: "Reservada, llega a las 8:30, Espacio 2", paso: "recibir" });
  expect(deHoy[1]).toMatchObject({ aviso: "Sin avisar", detalle: "Lista, se entrega hoy", paso: "avisar" });
  expect(deHoy[2]).toMatchObject({ aviso: "Sin avisar", detalle: "Lista", paso: "avisar" });
  expect(deHoy[3]).toMatchObject({ aviso: null, detalle: "Recibida, se entrega hoy", paso: null });
  expect(deHoy[4]).toMatchObject({ aviso: null, detalle: "Lista, se entrega hoy", paso: "entregar" });
});

test("los números del día: en el taller, llegan hoy y se entregan hoy; sin el módulo, nada", () => {
  const ingresos = [{ fechaInicio: "2026-10-21" }, { fechaInicio: hoy }];
  const abiertas = [{ fechaFin: hoy }, { fechaFin: "2026-10-25" }, { fechaFin: hoy }];
  expect(numerosDelDia(ingresos, abiertas, hoy)).toEqual({ enTaller: 3, lleganHoy: 1, seEntreganHoy: 2 });
  expect(numerosDelDia(null, null, hoy)).toEqual({ enTaller: null, lleganHoy: null, seEntreganHoy: null });
});
