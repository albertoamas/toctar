import { describe, expect, test } from "vitest";
import { erroresDelPaso, PASO_CLIENTE, PASO_SERVICIOS, PASO_VEHICULO, pasoDeCampo, primerPasoConError } from "@/modulos/cotizaciones/pasos";

// Pedido 40: la nueva cotización en pasos. Especificación: docs/08-desarrollo/etapas/P40-cotizacion-en-pasos.md §9.

describe("en qué paso está cada error", () => {
  test.each([
    ["nombre", PASO_CLIENTE],
    ["telefono", PASO_CLIENTE],
    ["correo", PASO_CLIENTE],
    ["nit", PASO_CLIENTE],
    ["vehiculo", PASO_VEHICULO],
    ["vehiculo-placa", PASO_VEHICULO],
    ["vehiculo-tamanoId", PASO_VEHICULO],
    ["modo", PASO_SERVICIOS],
    ["lineas", PASO_SERVICIOS],
    ["descuento", PASO_SERVICIOS],
  ])("%s, en el paso %i", (campo, paso) => {
    expect(pasoDeCampo(campo)).toBe(paso);
  });

  test("la pantalla vuelve al primer paso con un error", () => {
    expect(primerPasoConError({ modo: "Elige cómo se cotizó.", "vehiculo-placa": "Escribe la placa." })).toBe(PASO_VEHICULO);
    expect(primerPasoConError({ telefono: "Ese número ya es de Marta.", modo: "x" })).toBe(PASO_CLIENTE);
    expect(primerPasoConError({})).toBeNull();
    expect(primerPasoConError({ nombre: undefined })).toBeNull();
  });
});

describe("cada paso se revisa al seguir", () => {
  const cliente = { nombre: "Marta Vaca", telefono: "71234567", correo: "", nit: "", razonSocial: "", notas: "" };
  const vehiculo = { "vehiculo-placa": "4321bcd", "vehiculo-tamanoId": "2", "vehiculo-marca": "", "vehiculo-modelo": "", "vehiculo-anio": "", "vehiculo-color": "" };

  test("el cliente nuevo, con el esquema de Clientes", () => {
    expect(erroresDelPaso(PASO_CLIENTE, cliente, true)).toEqual({});
    expect(erroresDelPaso(PASO_CLIENTE, { ...cliente, nombre: "", telefono: "712" }, true)).toEqual({
      nombre: expect.any(String),
      telefono: "Escribe los 8 dígitos del celular.",
    });
    expect(erroresDelPaso(PASO_CLIENTE, { ...cliente, correo: "no-es-correo" }, true)).toEqual({ correo: "Escribe un correo válido." });
  });

  test("con un cliente registrado, el paso del cliente ya está", () => {
    expect(erroresDelPaso(PASO_CLIENTE, {}, false)).toEqual({});
  });

  test("el vehículo nuevo, con el esquema del vehículo y sus campos con prefijo", () => {
    expect(erroresDelPaso(PASO_VEHICULO, vehiculo, true)).toEqual({});
    expect(erroresDelPaso(PASO_VEHICULO, { ...vehiculo, "vehiculo-placa": "", "vehiculo-tamanoId": "" }, true)).toEqual({
      "vehiculo-placa": "Escribe la placa.",
      "vehiculo-tamanoId": expect.any(String),
    });
  });

  test("con un cliente registrado: uno de sus vehículos, u otro con sus datos", () => {
    expect(erroresDelPaso(PASO_VEHICULO, { vehiculo: "12" }, false)).toEqual({});
    expect(erroresDelPaso(PASO_VEHICULO, { vehiculo: "" }, false)).toEqual({ vehiculo: "Elige el vehículo." });
    expect(erroresDelPaso(PASO_VEHICULO, { vehiculo: "otro", ...vehiculo, "vehiculo-placa": "" }, false)).toEqual({ "vehiculo-placa": "Escribe la placa." });
  });

  test("los servicios los revisa la acción al crear", () => {
    expect(erroresDelPaso(PASO_SERVICIOS, {}, true)).toEqual({});
  });
});
