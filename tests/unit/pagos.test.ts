import { expect, test } from "vitest";
import { erroresDe } from "@/lib/formularios";
import { fechaEnBolivia, sumarDias } from "@/lib/fechas";
import { esquemaAnularPago, esquemaPago } from "@/modulos/pagos/esquemas";
import { normalizarBusqueda } from "@/modulos/clientes/reglas";
import { estaPagada, filtrarSaldos, ordenarSaldos, saldoPendiente } from "@/modulos/pagos/reglas";

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

test("una reserva está pagada con saldo cero o a favor del cliente", () => {
  expect(estaPagada("0.00")).toBe(true);
  expect(estaPagada("-50.00")).toBe(true);
  expect(estaPagada("0.01")).toBe(false);
});

test("lo que debe un cliente, como en Saldos pendientes: lo entregado sin pagar", () => {
  const con = (estado: string, saldo: string) => ({ estado, saldo: { total: "0", pagado: "0", saldo } });
  expect(saldoPendiente([])).toBeNull();
  expect(saldoPendiente([con("entregado", "0.00")])).toBeNull();
  expect(saldoPendiente([con("entregado", "900.00"), con("entregado", "150.50"), con("entregado", "0.00")])).toBe("1050.50");
  // Una reserva por venir, un trabajo en el taller o una cancelada todavía no se deben
  expect(saldoPendiente([con("agendado", "900.00"), con("en_proceso", "300.00"), con("listo", "200.00"), con("cancelado", "500.00")])).toBeNull();
  // Un saldo negativo (pagó de más) no resta
  expect(saldoPendiente([con("entregado", "-20.00"), con("entregado", "100.00")])).toBe("100.00");
  // Quien no ve pagos no tiene saldos calculados
  expect(saldoPendiente([{ estado: "entregado", saldo: null }])).toBeNull();
});

// Pedido 30: buscar y ordenar los saldos pendientes.

const saldos = [
  { id: 1, cliente: "José Pérez", telefono: "59170010001", placa: "2345KLM", saldo: "300.00", entregadoAt: new Date("2026-09-01T15:00:00Z") },
  { id: 2, cliente: "Ana Vaca", telefono: "59170020002", placa: "4567BDF", saldo: "1200.50", entregadoAt: new Date("2026-10-01T15:00:00Z") },
  { id: 3, cliente: "Carlos Ríos", telefono: "59170030003", placa: "6789TRS", saldo: "300.00", entregadoAt: new Date("2026-08-01T15:00:00Z") },
];
const buscar = (q: string) => filtrarSaldos(saldos, normalizarBusqueda(q)).map((s) => s.id);

test("se buscan por cliente (sin importar tildes), teléfono o placa; sin búsqueda, todos", () => {
  expect(buscar("jose")).toEqual([1]);
  expect(buscar("RÍOS")).toEqual([3]);
  expect(buscar("0020002")).toEqual([2]);
  expect(buscar("4567 bdf")).toEqual([2]);
  expect(buscar("")).toEqual([1, 2, 3]);
  expect(buscar("nadie")).toEqual([]);
  // Espacios de más en el nombre guardado; dos letras no buscan placas ("an" no trae 4567BDF por la placa)
  expect(filtrarSaldos([{ ...saldos[0], cliente: "José  Pérez " }], normalizarBusqueda("jose perez")).length).toBe(1);
  expect(buscar("kl")).toEqual([]);
});

test("se ordenan por la más antigua, el mayor monto o el cliente; a igualdad, la más antigua primero", () => {
  const ids = (orden: Parameters<typeof ordenarSaldos>[1]) => ordenarSaldos(saldos, orden).map((s) => s.id);
  expect(ids("antiguas")).toEqual([3, 1, 2]);
  expect(ids("monto")).toEqual([2, 3, 1]);
  expect(ids("cliente")).toEqual([2, 3, 1]);
});
