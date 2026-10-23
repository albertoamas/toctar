import { expect, test } from "vitest";
import { mensajeListo, primerNombre, textoVehiculo } from "@/modulos/ordenes/mensajes";

// C4 (HU-35, RF-48): el mensaje de "listo" lleva nombre, vehículo y, si hay y quien avisa lo ve, el saldo.

const base = { negocio: "TocTar Detailing", cliente: "Juan Pérez", vehiculo: { marca: "Toyota", modelo: "Corolla", placa: "1234ABC" } };

test("saluda por el primer nombre y nombra el vehículo", () => {
  expect(primerNombre("  Juan  Pérez ")).toBe("Juan");
  expect(textoVehiculo({ marca: "Toyota", modelo: "Corolla", placa: "1234ABC" })).toBe("Toyota Corolla (placa 1234ABC)");
  expect(textoVehiculo({ marca: null, modelo: null, placa: "1234ABC" })).toBe("vehículo (placa 1234ABC)");
});

test("con saldo pendiente, lo dice; sin saldo, a favor o sin permiso, no", () => {
  expect(mensajeListo({ ...base, saldo: "350.00" })).toBe(
    "Hola Juan, tu Toyota Corolla (placa 1234ABC) ya está listo en TocTar Detailing. Saldo pendiente: 350 Bs. Te esperamos en el taller.",
  );
  const sinSaldo = "Hola Juan, tu Toyota Corolla (placa 1234ABC) ya está listo en TocTar Detailing. Te esperamos en el taller.";
  expect(mensajeListo({ ...base, saldo: "0.00" })).toBe(sinSaldo);
  expect(mensajeListo({ ...base, saldo: "-50.00" })).toBe(sinSaldo);
  // Quien avisa no ve pagos: el monto no va
  expect(mensajeListo({ ...base, saldo: null })).toBe(sinSaldo);
});
