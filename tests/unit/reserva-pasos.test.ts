import { describe, expect, test } from "vitest";
import { erroresServicios, PASO_FECHA, PASO_SERVICIOS, pasoDeCampoReserva, pasoInicialReserva, pasosNuevaReserva } from "@/modulos/agenda/pasos-reserva";

// Pedido 41: la nueva reserva en pasos. Especificación: docs/08-desarrollo/etapas/P41-reserva-en-pasos.md §9.

describe("los pasos de la reserva", () => {
  test("cuatro, y el último dice el adelanto solo a quien lo registra (RN-04)", () => {
    expect(pasosNuevaReserva(true)).toEqual(["Cliente", "Vehículo", "Servicios", "Fecha y adelanto"]);
    expect(pasosNuevaReserva(false)).toEqual(["Cliente", "Vehículo", "Servicios", "Fecha"]);
  });
});

describe("en qué paso está cada error", () => {
  test.each([
    ["lineas", PASO_SERVICIOS],
    ["lineas.0", PASO_SERVICIOS],
    ["lineas.3", PASO_SERVICIOS],
    ["fechaInicio", PASO_FECHA],
    ["fechaFin", PASO_FECHA],
    ["espacioId", PASO_FECHA],
    ["adelanto", PASO_FECHA],
    ["metodo", PASO_FECHA],
    ["nota", PASO_FECHA],
  ])("%s, en el paso %i", (campo, paso) => {
    expect(pasoDeCampoReserva(campo)).toBe(paso);
  });
});

describe("la revisión de los servicios", () => {
  test("sin servicios pide al menos uno", () => {
    expect(erroresServicios("[]")).toEqual({ lineas: "Agrega al menos un servicio." });
  });

  test("el error de una línea va con su número, como lo devuelve la acción", () => {
    expect(erroresServicios(JSON.stringify([{ varianteId: 3, precio: "450" }, { varianteId: 0, precio: "" }]))).toEqual({ "lineas.1": "Elige el servicio." });
    expect(erroresServicios(JSON.stringify([{ varianteId: 3, precio: "" }]))).toEqual({ "lineas.0": "Escribe el precio." });
  });

  test("con servicio y precio, sin errores", () => {
    expect(erroresServicios(JSON.stringify([{ varianteId: 3, precio: "450,50" }]))).toEqual({});
  });
});

describe("dónde empieza la reserva sin cotización", () => {
  test("sin servicios, en Servicios", () => {
    expect(pasoInicialReserva([])).toBe(PASO_SERVICIOS);
  });

  test("un mantenimiento con su precio, en la fecha; según evaluación (sin precio), en Servicios", () => {
    expect(pasoInicialReserva([{ varianteId: 7, precio: "350" }])).toBe(PASO_FECHA);
    expect(pasoInicialReserva([{ varianteId: 7, precio: "" }])).toBe(PASO_SERVICIOS);
  });
});
