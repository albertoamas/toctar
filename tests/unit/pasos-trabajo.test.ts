import { describe, expect, test } from "vitest";
import { PASOS_TRABAJO, PRIMER_PASO_SIN_COTIZACION, pasoDelTrabajo, pasoSiguiente } from "@/modulos/agenda/pasos";

// Los pasos de un trabajo, de la cotización a la entrega (pedido 31, P31-flujo-de-un-trabajo.md §2).

describe("pasoDelTrabajo", () => {
  test("seis pasos, en el orden del taller", () => {
    expect(PASOS_TRABAJO).toEqual(["Cotizada", "Aceptada", "Reservada", "En el taller", "Lista", "Entregada"]);
    expect(PASOS_TRABAJO[PRIMER_PASO_SIN_COTIZACION]).toBe("Reservada");
  });

  test("sin reserva, manda la cotización: pendiente, aceptada sin fecha; una rechazada no está en ningún paso", () => {
    expect(pasoDelTrabajo({ cotizacion: "cotizado" })).toBe(0);
    expect(pasoDelTrabajo({ cotizacion: "confirmado" })).toBe(1);
    expect(pasoDelTrabajo({ cotizacion: "perdido" })).toBeNull();
    expect(pasoDelTrabajo({ cotizacion: "consulto" })).toBeNull();
  });

  test("con una reserva activa, manda el trabajo, tenga o no cotización", () => {
    expect(pasoDelTrabajo({ cotizacion: "confirmado", trabajo: "agendado" })).toBe(2);
    expect(pasoDelTrabajo({ trabajo: "agendado" })).toBe(2);
    expect(pasoDelTrabajo({ trabajo: "recibido" })).toBe(3);
    expect(pasoDelTrabajo({ trabajo: "en_proceso" })).toBe(3);
    expect(pasoDelTrabajo({ trabajo: "listo" })).toBe(4);
    expect(pasoDelTrabajo({ trabajo: "entregado" })).toBe(5);
  });

  test("una reserva cancelada no cuenta: vale lo que diga la cotización", () => {
    expect(pasoDelTrabajo({ cotizacion: "cotizado", trabajo: "cancelado" })).toBe(0);
    expect(pasoDelTrabajo({ trabajo: "cancelado" })).toBeNull();
  });
});

test("el paso siguiente de un trabajo del día dice lo mismo que el botón de su pantalla", () => {
  expect(pasoSiguiente("agendado", false)).toBe("Recibir vehículo");
  expect(pasoSiguiente("recibido", false)).toBe("Empezar trabajo");
  expect(pasoSiguiente("en_proceso", false)).toBe("Marcar listo");
  expect(pasoSiguiente("listo", true)).toBe("Avisar por WhatsApp");
  expect(pasoSiguiente("listo", false)).toBe("Entregar vehículo");
  expect(pasoSiguiente("entregado", false)).toBeNull();
  expect(pasoSiguiente("cancelado", false)).toBeNull();
});
