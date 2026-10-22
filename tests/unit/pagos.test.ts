import { expect, test } from "vitest";
import { erroresDe } from "@/lib/formularios";
import { fechaEnBolivia, sumarDias } from "@/lib/fechas";
import { esquemaAnularPago, esquemaPago } from "@/modulos/pagos/esquemas";

// C3 Pagos (HU-32, RF-45): validación del pago y de su anulación. El saldo (calcularSaldo) se prueba en agenda.test.ts.

const valido = { trabajoId: "7", monto: "300", tipo: "saldo", metodo: "qr", fecha: fechaEnBolivia() };

test("un pago válido sale con el monto en dos decimales", () => {
  const r = esquemaPago.safeParse({ ...valido, monto: "300,5" });
  expect(r.success && r.data).toEqual({ trabajoId: 7, monto: "300.50", tipo: "saldo", metodo: "qr", fecha: valido.fecha });
});

test("el pago pide monto, tipo, método y una fecha que no sea futura", () => {
  const vacio = esquemaPago.safeParse({ trabajoId: "7", monto: "", tipo: "", metodo: "", fecha: "" });
  expect(!vacio.success && erroresDe(vacio.error)).toEqual({
    monto: "Escribe el monto.",
    tipo: "Elige si es adelanto o saldo.",
    metodo: "Elige cómo pagó.",
    fecha: "Elige el día del pago.",
  });
  const futura = esquemaPago.safeParse({ ...valido, fecha: sumarDias(fechaEnBolivia(), 1) });
  expect(!futura.success && erroresDe(futura.error)).toEqual({ fecha: "La fecha del pago no puede ser futura." });
  const rara = esquemaPago.safeParse({ ...valido, fecha: "2026-02-30" });
  expect(!rara.success && erroresDe(rara.error)).toEqual({ fecha: "Elige el día del pago." });
});

test("el monto es un número mayor a cero", () => {
  for (const monto of ["0", "-5", "abc", "1.234,50"]) {
    const r = esquemaPago.safeParse({ ...valido, monto });
    expect(!r.success && erroresDe(r.error).monto).toBe("Revisa el monto: un número mayor a cero, como 300 o 300,50.");
  }
});

test("anular pide el motivo", () => {
  const sin = esquemaAnularPago.safeParse({ id: "3", motivo: "   " });
  expect(!sin.success && erroresDe(sin.error)).toEqual({ motivo: "Escribe el motivo." });
  const con = esquemaAnularPago.safeParse({ id: "3", motivo: " Se cargó dos veces " });
  expect(con.success && con.data).toEqual({ id: 3, motivo: "Se cargó dos veces" });
});
