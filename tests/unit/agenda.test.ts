import { expect, test } from "vitest";
import { erroresDe } from "@/lib/formularios";
import { fechaEnBolivia, sumarDias } from "@/lib/fechas";
import { esquemaAdelanto, esquemaFechas, esquemaReserva } from "@/modulos/agenda/esquemas";
import { bloquesDeLaSemana, diaDeLaSemana, diasDeLaSemana, fechaEntregaSugerida, lunesDeLaSemana, ocupaEspacio, seCruzan } from "@/modulos/agenda/reglas";
import { calcularSaldo } from "@/modulos/pagos/reglas";

// C3 Agenda y pagos (HU-30): semanas, entrega sugerida, cruces (RN-06), saldo (RF-46) y validación de la reserva.

test("la semana va de lunes a domingo", () => {
  expect(diaDeLaSemana("2026-10-19")).toBe(1); // lunes
  expect(diaDeLaSemana("2026-10-25")).toBe(7); // domingo
  expect(lunesDeLaSemana("2026-10-25")).toBe("2026-10-19");
  expect(lunesDeLaSemana("2026-10-19")).toBe("2026-10-19");
  expect(lunesDeLaSemana("2026-11-01")).toBe("2026-10-26"); // cruza de mes
  expect(diasDeLaSemana("2026-12-28")).toEqual(["2026-12-28", "2026-12-29", "2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02", "2027-01-03"]);
});

test("la entrega sugerida cuenta el día de ingreso y toma la mayor duración", () => {
  expect(fechaEntregaSugerida("2026-10-24", [1])).toBe("2026-10-24");
  expect(fechaEntregaSugerida("2026-10-24", [2])).toBe("2026-10-25");
  expect(fechaEntregaSugerida("2026-10-24", [1, 3, 2])).toBe("2026-10-26");
  expect(fechaEntregaSugerida("2026-10-24", [])).toBe("2026-10-24");
});

test("dos reservas se cruzan si comparten algún día, bordes incluidos (como la base)", () => {
  expect(seCruzan({ inicio: "2026-10-20", fin: "2026-10-24" }, { inicio: "2026-10-24", fin: "2026-10-25" })).toBe(true);
  expect(seCruzan({ inicio: "2026-10-20", fin: "2026-10-23" }, { inicio: "2026-10-24", fin: "2026-10-25" })).toBe(false);
  expect(seCruzan({ inicio: "2026-10-22", fin: "2026-10-22" }, { inicio: "2026-10-20", fin: "2026-10-25" })).toBe(true);
  expect(["agendado", "recibido", "en_proceso", "listo"].every((e) => ocupaEspacio(e as never))).toBe(true);
  expect(ocupaEspacio("cancelado")).toBe(false);
  expect(ocupaEspacio("entregado")).toBe(false);
});

test("los bloques del tablero se recortan a la semana", () => {
  const lunes = "2026-10-19";
  const bloques = bloquesDeLaSemana(
    [
      { id: 1, inicio: "2026-10-21", fin: "2026-10-22" },
      { id: 2, inicio: "2026-10-16", fin: "2026-10-20" },
      { id: 3, inicio: "2026-10-25", fin: "2026-10-28" },
      { id: 4, inicio: "2026-10-27", fin: "2026-10-27" },
    ],
    lunes,
  );
  expect(bloques.map((b) => [b.id, b.columna, b.dias, b.empiezaAntes, b.terminaDespues])).toEqual([
    [1, 2, 2, false, false],
    [2, 0, 2, true, false],
    [3, 6, 1, false, true],
  ]);
});

test("el saldo descuenta los pagos no anulados y el descuento de la cotización", () => {
  expect(calcularSaldo(["450.00", "200.50"], "50.00", [])).toEqual({ total: "600.50", pagado: "0.00", saldo: "600.50" });
  expect(
    calcularSaldo(["450.00", "200.50"], "50.00", [
      { monto: "200.00", anulado: false },
      { monto: "100.00", anulado: true },
      { monto: "0.10", anulado: false },
    ]),
  ).toEqual({ total: "600.50", pagado: "200.10", saldo: "400.40" });
});

const hoy = fechaEnBolivia();
const fechas = (cambio: Partial<{ fechaInicio: string; fechaFin: string }> = {}) => {
  const r = esquemaFechas.safeParse({ fechaInicio: sumarDias(hoy, 1), fechaFin: sumarDias(hoy, 2), ...cambio });
  return r.success ? {} : erroresDe(r.error);
};

test("fechas: desde hoy, la entrega no antes del ingreso, y que existan", () => {
  expect(fechas()).toEqual({});
  expect(fechas({ fechaInicio: hoy, fechaFin: hoy })).toEqual({});
  expect(fechas({ fechaInicio: sumarDias(hoy, -1) })).toEqual({ fechaInicio: "El ingreso no puede ser antes de hoy." });
  expect(fechas({ fechaFin: hoy })).toEqual({ fechaFin: "La entrega no puede ser antes del ingreso." });
  expect(fechas({ fechaInicio: "2026-02-31" })).toEqual({ fechaInicio: "Elige el día de ingreso." });
  expect(fechas({ fechaInicio: sumarDias(hoy, 366), fechaFin: sumarDias(hoy, 366) })).toEqual({ fechaInicio: "Se agenda hasta un año adelante." });
  expect(fechas({ fechaFin: sumarDias(hoy, 62) })).toEqual({ fechaFin: "Una reserva dura hasta 60 días." });
});

test("una reserva directa lleva cliente, vehículo, servicios y espacio; desde una cotización, solo la cotización", () => {
  const directa = { origen: "directa", clienteId: "3", vehiculoId: "4", lineas: JSON.stringify([{ varianteId: 7, precio: "450" }]), espacioId: "1", tecnicoId: "", horaIngreso: " a las 9 ", nota: "" };
  expect(esquemaReserva.parse(directa)).toMatchObject({ origen: "directa", clienteId: 3, lineas: [{ varianteId: 7, precio: "450.00" }], tecnicoId: null, horaIngreso: "a las 9", nota: null });
  expect(erroresDe(esquemaReserva.safeParse({ ...directa, espacioId: "" }).error!)).toEqual({ espacioId: "Elige el espacio." });
  expect(erroresDe(esquemaReserva.safeParse({ ...directa, lineas: "[]" }).error!)).toEqual({ lineas: "Agrega al menos un servicio." });
  expect(esquemaReserva.parse({ origen: "cotizacion", cotizacionId: "9", espacioId: "2", tecnicoId: "5", horaIngreso: "", nota: "" })).toMatchObject({ cotizacionId: 9, tecnicoId: 5 });
});

test("el adelanto: un monto y su método, o sin adelanto", () => {
  expect(esquemaAdelanto.parse({ sinAdelanto: true })).toEqual({ sinAdelanto: true });
  expect(esquemaAdelanto.parse({ sinAdelanto: false, monto: "200", metodo: "qr" })).toEqual({ sinAdelanto: false, monto: "200.00", metodo: "qr" });
  expect(erroresDe(esquemaAdelanto.safeParse({ sinAdelanto: false, monto: "", metodo: "" }).error!)).toEqual({
    monto: "Escribe el adelanto, como 200 o 200,50.",
    metodo: "Elige cómo pagó.",
  });
});
