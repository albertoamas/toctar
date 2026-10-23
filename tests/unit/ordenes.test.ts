import { expect, test } from "vitest";
import { erroresDe } from "@/lib/formularios";
import { esquemaFotoOrden, esquemaRecibir } from "@/modulos/ordenes/esquemas";
import { puede, puedeVerOrden } from "@/lib/permisos";
import { esOrden, etapaAbierta, puedeRecibirse } from "@/modulos/ordenes/reglas";

// C4 Taller y entrega (HU-33): la reserva recibida es una orden (D-1), fotos por etapa (D-6) y el técnico solo con las
// suyas (RN-12).

test("una orden es una reserva ya recibida", () => {
  expect(["recibido", "en_proceso", "listo", "entregado"].every((e) => esOrden(e as never))).toBe(true);
  expect(esOrden("agendado")).toBe(false);
  expect(esOrden("cancelado")).toBe(false);
});

test("una reserva se recibe desde su día de ingreso, si sigue agendada", () => {
  expect(puedeRecibirse({ estado: "agendado", fechaInicio: "2026-10-22" }, "2026-10-22")).toBe(true);
  // El cliente llegó tarde: se recibe igual
  expect(puedeRecibirse({ estado: "agendado", fechaInicio: "2026-10-20" }, "2026-10-22")).toBe(true);
  // Llegó antes: primero se reprograma
  expect(puedeRecibirse({ estado: "agendado", fechaInicio: "2026-10-23" }, "2026-10-22")).toBe(false);
  expect(puedeRecibirse({ estado: "cancelado", fechaInicio: "2026-10-22" }, "2026-10-22")).toBe(false);
  expect(puedeRecibirse({ estado: "recibido", fechaInicio: "2026-10-22" }, "2026-10-22")).toBe(false);
});

test("las fotos de ingreso solo cambian mientras se recibe; las demás, hasta la entrega", () => {
  expect(etapaAbierta("ingreso", "agendado")).toBe(true);
  expect(etapaAbierta("ingreso", "recibido")).toBe(false);
  for (const etapa of ["antes", "durante", "despues"] as const) {
    expect(etapaAbierta(etapa, "agendado")).toBe(false);
    expect(etapaAbierta(etapa, "en_proceso")).toBe(true);
    expect(etapaAbierta(etapa, "listo")).toBe(true);
    expect(etapaAbierta(etapa, "entregado")).toBe(false);
  }
});

test("recibe el dueño o el encargado con Órdenes; el técnico no", () => {
  expect(puede({ rol: "dueno", permisos: [] }, "recibir_vehiculo")).toBe(true);
  expect(puede({ rol: "encargado", permisos: ["ordenes"] }, "recibir_vehiculo")).toBe(true);
  expect(puede({ rol: "encargado", permisos: ["agenda"] }, "recibir_vehiculo")).toBe(false);
  expect(puede({ rol: "tecnico", permisos: [] }, "recibir_vehiculo")).toBe(false);
});

test("el técnico solo ve sus órdenes; el dueño y el encargado, todas", () => {
  const tecnico = { id: "7", rol: "tecnico" as const, permisos: [] };
  expect(puedeVerOrden(tecnico, 7)).toBe(true);
  expect(puedeVerOrden(tecnico, 8)).toBe(false);
  expect(puedeVerOrden(tecnico, null)).toBe(false);
  expect(puedeVerOrden({ id: "1", rol: "dueno", permisos: [] }, 8)).toBe(true);
  expect(puedeVerOrden({ id: "2", rol: "encargado", permisos: ["ordenes"] }, null)).toBe(true);
});

test("recibir: técnico opcional y observaciones de hasta 2000", () => {
  expect(esquemaRecibir.parse({ id: "3", tecnicoId: "", observaciones: "  " })).toEqual({ id: 3, tecnicoId: null, observaciones: null });
  expect(esquemaRecibir.parse({ id: "3", tecnicoId: "5", observaciones: " Rayón en la puerta " })).toEqual({ id: 3, tecnicoId: 5, observaciones: "Rayón en la puerta" });
  const larga = esquemaRecibir.safeParse({ id: "3", tecnicoId: "", observaciones: "x".repeat(2001) });
  expect(!larga.success && erroresDe(larga.error)).toEqual({ observaciones: "Hasta 2000 caracteres." });
});

test("una foto de la orden dice su etapa", () => {
  expect(esquemaFotoOrden.safeParse({ trabajoId: "3", etapa: "antes" }).success).toBe(true);
  expect(esquemaFotoOrden.safeParse({ trabajoId: "3", etapa: "cualquiera" }).success).toBe(false);
});
