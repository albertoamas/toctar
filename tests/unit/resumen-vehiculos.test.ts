import { describe, expect, it } from "vitest";
import { resumenDeVehiculo } from "@/modulos/clientes/resumen-vehiculos";

// Lo que dice cada vehículo en la ficha del cliente (26/11): su último trabajo, su próximo mantenimiento y lo que pide
// atención.

const hoy = "2026-11-26";
const ahora = new Date("2026-11-26T15:00:00Z");
const vacio = { reservas: [], mantenimientos: [], cotizaciones: [], umbral: 7, hoy, ahora };

describe("resumen de un vehículo", () => {
  it("el último trabajo es el más reciente sin cancelar; una reserva es para el día", () => {
    const reservas = [
      { placa: "1111AAA", estado: "entregado" as const, fechaInicio: "2026-11-17" },
      { placa: "1111AAA", estado: "cancelado" as const, fechaInicio: "2026-11-20" },
      { placa: "2222BBB", estado: "entregado" as const, fechaInicio: "2026-11-25" },
    ];
    expect(resumenDeVehiculo("1111AAA", { ...vacio, reservas }).lineas).toEqual(["Último trabajo: 17 nov., entregada"]);
    const conReserva = [...reservas, { placa: "1111AAA", estado: "agendado" as const, fechaInicio: "2026-12-03" }];
    expect(resumenDeVehiculo("1111AAA", { ...vacio, reservas: conReserva }).lineas).toEqual(["Reservado para el 3 dic."]);
  });
  it("el próximo mantenimiento es el abierto más cercano; uno pasado está vencido", () => {
    const mantenimientos = [
      { placa: "1111AAA", estado: "hecho" as const, fechaProgramada: "2026-07-08" },
      { placa: "1111AAA", estado: "pendiente" as const, fechaProgramada: "2027-02-21" },
    ];
    expect(resumenDeVehiculo("1111AAA", { ...vacio, mantenimientos }).lineas).toEqual(["Próximo mantenimiento: 21 feb. 2027"]);
    const vencido = [{ placa: "1111AAA", estado: "avisado" as const, fechaProgramada: "2026-08-21" }];
    expect(resumenDeVehiculo("1111AAA", { ...vacio, mantenimientos: vencido }).lineas).toEqual(["Mantenimiento vencido el 21 ago."]);
  });
  it("avisa una cotización sin fecha antes que una sin respuesta; sin permisos, no dice nada", () => {
    const vieja = new Date("2026-11-10T15:00:00Z");
    const cotizaciones = [
      { placa: "1111AAA", estado: "cotizado" as const, sinFecha: false, ultimoMovimientoAt: vieja },
      { placa: "1111AAA", estado: "confirmado" as const, sinFecha: true, ultimoMovimientoAt: vieja },
    ];
    expect(resumenDeVehiculo("1111AAA", { ...vacio, cotizaciones }).aviso).toEqual({ texto: "Cotización sin fecha", tipo: "fecha" });
    expect(resumenDeVehiculo("1111AAA", { ...vacio, cotizaciones: cotizaciones.slice(0, 1) }).aviso).toEqual({ texto: "Cotización sin respuesta", tipo: "tiempo" });
    expect(resumenDeVehiculo("1111AAA", { reservas: null, mantenimientos: null, cotizaciones: null, umbral: 7, hoy })).toEqual({ lineas: [], aviso: null });
  });
});
