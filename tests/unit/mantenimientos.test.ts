import { expect, test } from "vitest";
import { erroresDe } from "@/lib/formularios";
import { esquemaAvisarMantenimiento, esquemaCerrarMantenimiento } from "@/modulos/mantenimientos/esquemas";
import { mesYAnio } from "@/lib/fechas";
import { agruparPorMes, seccionMantenimiento, textoVencimiento } from "@/modulos/mantenimientos/reglas";
import { PLANTILLAS } from "@/modulos/configuracion/plantillas";
import { mensajeMantenimiento } from "@/modulos/ordenes/mensajes";

// HU-38 (RF-50, RN-08): a quién le toca volver. Especificación: docs/08-desarrollo/etapas/C4-taller-entrega.md §9.

const hoy = "2026-10-23";

test("vencido si ya pasó; próximo desde hoy hasta dentro de 15 días; después, todavía no", () => {
  expect(seccionMantenimiento("2026-10-22", hoy)).toBe("vencido");
  expect(seccionMantenimiento("2025-12-01", hoy)).toBe("vencido");
  expect(seccionMantenimiento(hoy, hoy)).toBe("proximo");
  expect(seccionMantenimiento("2026-11-07", hoy)).toBe("proximo");
  expect(seccionMantenimiento("2026-11-08", hoy)).toBeNull();
});

test("dice cuánto falta o cuánto pasó", () => {
  expect(textoVencimiento("2026-10-13", hoy)).toBe("venció hace 10 días");
  expect(textoVencimiento("2026-10-22", hoy)).toBe("venció ayer");
  expect(textoVencimiento(hoy, hoy)).toBe("vence hoy");
  expect(textoVencimiento("2026-10-24", hoy)).toBe("vence mañana");
  expect(textoVencimiento("2026-11-02", hoy)).toBe("vence en 10 días");
});

test("el mensaje saluda, nombra el vehículo y el servicio, y ofrece agendar", () => {
  const datos = { plantilla: PLANTILLAS.mantenimiento.original, negocio: "TocTar Detailing", cliente: "Ana María Rojas", vehiculo: { marca: "Toyota", modelo: "Hilux", placa: "2345XYZ" }, servicio: "Nano cerámico" };
  expect(mensajeMantenimiento(datos)).toBe(
    "Hola Ana, te escribimos de TocTar Detailing: a tu Toyota Hilux (placa 2345XYZ) le toca el mantenimiento de Nano cerámico. ¿Te agendamos un día?",
  );
  expect(mensajeMantenimiento({ ...datos, cliente: " ", vehiculo: { marca: null, modelo: null, placa: "2345XYZ" } })).toMatch(/^Hola, te escribimos de TocTar Detailing: a tu vehículo \(placa 2345XYZ\)/);
});

test("avisar y cerrar validan lo que llega; la nota es opcional y corta", () => {
  expect(esquemaAvisarMantenimiento.safeParse({ id: "x" }).success).toBe(false);
  expect(esquemaCerrarMantenimiento.parse({ id: "4", nota: "  " })).toEqual({ id: 4, nota: null });
  expect(esquemaCerrarMantenimiento.parse({ id: "4", nota: " Vendió el auto " })).toEqual({ id: 4, nota: "Vendió el auto" });
  expect(erroresDe(esquemaCerrarMantenimiento.safeParse({ id: "4", nota: "a".repeat(301) }).error!)).toEqual({ nota: "Hasta 300 caracteres." });
});

test("Más adelante: agrupa por mes, en el orden en que llegan, y titula el mes (pedido 20)", () => {
  expect(mesYAnio("2026-12-05")).toBe("Diciembre 2026");
  expect(mesYAnio("2027-01-31")).toBe("Enero 2027");
  expect(mesYAnio("2026-09-01")).toBe("Septiembre 2026");
  const lista = [{ f: "2026-11-30" }, { f: "2026-12-01" }, { f: "2026-12-20" }, { f: "2027-01-02" }];
  expect(agruparPorMes(lista, (e) => e.f)).toEqual([
    { mes: "2026-11", titulo: "Noviembre 2026", elementos: [{ f: "2026-11-30" }] },
    { mes: "2026-12", titulo: "Diciembre 2026", elementos: [{ f: "2026-12-01" }, { f: "2026-12-20" }] },
    { mes: "2027-01", titulo: "Enero 2027", elementos: [{ f: "2027-01-02" }] },
  ]);
  expect(agruparPorMes([], (e: { f: string }) => e.f)).toEqual([]);
});
