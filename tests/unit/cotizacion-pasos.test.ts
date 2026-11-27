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
    ["interesadoTamanoId", PASO_VEHICULO],
    ["interesadoPlaca", PASO_VEHICULO],
    ["foto", PASO_VEHICULO],
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

  // Pedido 31, parte 2 (P31b): alguien nuevo es un interesado, sin registrarlo: solo su nombre y su WhatsApp
  test("alguien nuevo: su nombre y su WhatsApp, con las reglas de Clientes", () => {
    expect(erroresDelPaso(PASO_CLIENTE, cliente, true)).toEqual({});
    expect(erroresDelPaso(PASO_CLIENTE, { ...cliente, nombre: "", telefono: "712" }, true)).toEqual({
      nombre: expect.any(String),
      telefono: "Escribe los 8 dígitos del celular.",
    });
    // El correo ya no se pide: no frena el paso
    expect(erroresDelPaso(PASO_CLIENTE, { ...cliente, correo: "no-es-correo" }, true)).toEqual({});
  });

  test("con un cliente registrado, el paso del cliente ya está", () => {
    expect(erroresDelPaso(PASO_CLIENTE, {}, false)).toEqual({});
  });

  test("el vehículo de alguien nuevo: la placa y el tamaño (22/11)", () => {
    const delInteresado = { ...cliente, interesadoPlaca: "4321 bcd", interesadoTamanoId: "2" };
    expect(erroresDelPaso(PASO_VEHICULO, delInteresado, true)).toEqual({});
    expect(erroresDelPaso(PASO_VEHICULO, { ...delInteresado, interesadoPlaca: "", interesadoTamanoId: "" }, true)).toEqual({
      interesadoPlaca: "Escribe la placa.",
      interesadoTamanoId: "Elige el tamaño.",
    });
    expect(erroresDelPaso(PASO_VEHICULO, { ...delInteresado, interesadoPlaca: "12-*" }, true)).toEqual({ interesadoPlaca: "La placa lleva solo letras y números." });
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
