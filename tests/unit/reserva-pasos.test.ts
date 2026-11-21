import { describe, expect, test } from "vitest";
import { erroresClienteNuevo, erroresVehiculoNuevo, erroresFecha, erroresServicios, PASO_ADELANTO, PASO_CLIENTE, PASO_FECHA, PASO_SERVICIOS, PASO_VEHICULO, pasoDeCampoReserva, pasoInicialReserva, pasosNuevaReserva } from "@/modulos/agenda/pasos-reserva";

// Pedido 41: la nueva reserva en pasos. Especificación: docs/08-desarrollo/etapas/P41-reserva-en-pasos.md §9.

describe("los pasos de la reserva", () => {
  test("el adelanto, en su propio paso y solo para quien lo registra (RN-04; 20/11)", () => {
    expect(pasosNuevaReserva(true)).toHaveLength(5);
    expect(pasosNuevaReserva(false)).toHaveLength(4);
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
    ["adelanto", PASO_ADELANTO],
    ["metodo", PASO_ADELANTO],
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

test("la fecha y el adelanto van en pasos separados; el adelanto, solo para quien ve pagos (20/11)", () => {
  expect(pasosNuevaReserva(true)).toEqual(["Cliente", "Vehículo", "Servicios", "Fecha", "Adelanto"]);
  expect(pasosNuevaReserva(false)).toEqual(["Cliente", "Vehículo", "Servicios", "Fecha"]);
  expect(pasoDeCampoReserva("dejoAdelanto")).toBe(PASO_ADELANTO);
  expect(pasoDeCampoReserva("metodo")).toBe(PASO_ADELANTO);
  expect(pasoDeCampoReserva("espacioId")).toBe(PASO_FECHA);
  expect(pasoDeCampoReserva("lineas.0")).toBe(PASO_SERVICIOS);
});

test("para pasar al adelanto hace falta la fecha de ingreso y el espacio", () => {
  expect(erroresFecha({ fechaInicio: "", fechaFin: "" })).toMatchObject({ fechaInicio: "Elige el día de ingreso." });
  const manana = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
  expect(erroresFecha({ fechaInicio: manana, fechaFin: manana })).toEqual({});
});

test("los errores de un cliente o un vehículo nuevos vuelven a su paso (20/11)", () => {
  expect(pasoDeCampoReserva("nombre")).toBe(PASO_CLIENTE);
  expect(pasoDeCampoReserva("telefono")).toBe(PASO_CLIENTE);
  expect(pasoDeCampoReserva("vehiculo-placa")).toBe(PASO_VEHICULO);
});

test("el cliente y el vehículo nuevos se revisan con los esquemas de Clientes (20/11)", () => {
  expect(erroresClienteNuevo({ nombre: "", telefono: "" })).toHaveProperty("nombre");
  expect(erroresClienteNuevo({ nombre: "Ana Pérez", telefono: "71234567", correo: "", nit: "", razonSocial: "", notas: "" })).toEqual({});
  const vehiculo = erroresVehiculoNuevo({});
  expect(Object.keys(vehiculo).every((c) => c.startsWith("vehiculo-"))).toBe(true);
  expect(vehiculo).toHaveProperty("vehiculo-placa");
});
