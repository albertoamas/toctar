import { expect, test } from "vitest";
import { diaYHora, fechaCorta, textoHace } from "@/lib/fechas";
import { nombreVehiculo, primerNombre, vehiculoEnLista } from "@/modulos/clientes/reglas";
import { PLANTILLAS } from "@/modulos/configuracion/plantillas";
import { mensajeCotizacion, mensajeListo, mensajeSaldo, textoVehiculo } from "@/modulos/ordenes/mensajes";

// C4 (HU-35, RF-48): el mensaje de "listo" lleva nombre, vehículo y, si hay y quien avisa lo ve, el saldo. Con la
// plantilla original de la HU-40 da el mismo texto que antes de que fuera editable (C5 §9).

const listo = { plantilla: PLANTILLAS.listo.original };
const base = { negocio: "TocTar Detailing", cliente: "Juan Pérez", vehiculo: { marca: "Toyota", modelo: "Corolla", placa: "1234ABC" } };

test("saluda por el primer nombre y nombra el vehículo", () => {
  expect(primerNombre("  Juan  Pérez ")).toBe("Juan");
  expect(primerNombre("   ")).toBe("");
  expect(nombreVehiculo({ marca: " Toyota ", modelo: "  " })).toBe("Toyota");
  expect(textoVehiculo({ marca: "Toyota", modelo: "Corolla", placa: "1234ABC" })).toBe("Toyota Corolla (placa 1234ABC)");
  expect(textoVehiculo({ marca: null, modelo: null, placa: "1234ABC" })).toBe("vehículo (placa 1234ABC)");
});

test("con saldo pendiente, lo dice; sin saldo, a favor o sin permiso, no", () => {
  expect(mensajeListo({ ...listo, ...base, saldo: "350.00" })).toBe(
    "Hola Juan, tu Toyota Corolla (placa 1234ABC) ya está listo en TocTar Detailing. Saldo pendiente: 350 Bs. Te esperamos en el taller.",
  );
  const sinSaldo = "Hola Juan, tu Toyota Corolla (placa 1234ABC) ya está listo en TocTar Detailing. Te esperamos en el taller.";
  expect(mensajeListo({ ...listo, ...base, saldo: "0.00" })).toBe(sinSaldo);
  expect(mensajeListo({ ...listo, ...base, saldo: "-50.00" })).toBe(sinSaldo);
  // Quien avisa no ve pagos: el monto no va
  expect(mensajeListo({ ...listo, ...base, saldo: null })).toBe(sinSaldo);
});

test("sin nombre, saluda igual; el aviso dice día y hora en Bolivia", () => {
  expect(mensajeListo({ ...listo, ...base, cliente: "  ", saldo: null })).toMatch(/^Hola, tu Toyota Corolla/);
  // 19:40 UTC son las 15:40 en Bolivia (UTC−4)
  expect(diaYHora(new Date("2026-10-30T19:40:00Z"))).toBe("30/10 a las 15:40");
  // Del 1 al 9, el día también con dos cifras (ICU lo escribe con una en es-BO)
  expect(diaYHora(new Date("2026-11-01T14:46:00Z"))).toBe("01/11 a las 10:46");
});

test("el mensaje de saldo dice cuánto, de qué vehículo y cómo pagarlo (HU-37)", () => {
  expect(mensajeSaldo({ plantilla: PLANTILLAS.saldo.original, ...base, saldo: "300.50" })).toBe(
    "Hola Juan, te escribimos de TocTar Detailing por el saldo de 300,50 Bs del servicio de tu Toyota Corolla (placa 1234ABC). Puedes pagarlo en el taller, por QR o por transferencia.",
  );
});

test("hace cuánto: hoy, ayer o hace N días", () => {
  expect(textoHace("2026-10-24", "2026-10-24")).toBe("hoy");
  expect(textoHace("2026-10-23", "2026-10-24")).toBe("ayer");
  expect(textoHace("2026-09-24", "2026-10-24")).toBe("hace 30 días");
});

test("fecha corta: sin el año si es de este año; el vehículo en una lista", () => {
  expect(fechaCorta("2026-10-15", "2026-10-24")).toBe("15/10");
  expect(fechaCorta("2025-10-15", "2026-10-24")).toBe("15/10/2025");
  expect(vehiculoEnLista({ marca: "Toyota", modelo: "Corolla", placa: "1234ABC" })).toBe("Toyota Corolla, 1234ABC");
  expect(vehiculoEnLista({ marca: null, modelo: null, placa: "1234ABC" })).toBe("1234ABC");
});

test("la cotización va con su número y su enlace; si la plantilla perdió el enlace, va al final (pedido 47)", () => {
  const datos = {
    negocio: "TocTar",
    cliente: "Gabriela Soliz",
    vehiculo: { marca: "Mazda", modelo: "3", placa: "3901MZD" },
    numero: "2026-0006",
    enlace: "https://toctardetailing.com/c/0123456789abcdef0123456789abcdef",
  };
  expect(mensajeCotizacion({ ...datos, plantilla: PLANTILLAS.cotizacion.original })).toBe(
    "Hola Gabriela, te mandamos la cotización 2026-0006 de TocTar para tu Mazda 3 (placa 3901MZD): https://toctardetailing.com/c/0123456789abcdef0123456789abcdef",
  );
  expect(mensajeCotizacion({ ...datos, plantilla: "Hola {nombre}, aquí va tu cotización." })).toBe(
    "Hola Gabriela, aquí va tu cotización. https://toctardetailing.com/c/0123456789abcdef0123456789abcdef",
  );
});
