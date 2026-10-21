import { expect, test } from "vitest";
import { erroresDe } from "@/lib/formularios";
import { fechaEnBolivia, sumarDias } from "@/lib/fechas";
import { esquemaCotizacion } from "@/modulos/cotizaciones/esquemas";
import {
  anioCotizacion,
  calcularTotales,
  claveCorrelativo,
  descripcionLinea,
  fechaValidez,
  leerMontoOCero,
  numeroCotizacion,
  precioSugerido,
} from "@/modulos/cotizaciones/reglas";

// C2 Cotizaciones (HU-25): totales, número, precio sugerido, validez y la validación del formulario (RF-31, RN-02).

test("calcularTotales suma en centavos, descuenta y nunca da negativo", () => {
  expect(calcularTotales(["450.00", "200.50"], "50.00")).toEqual({ subtotal: "650.50", descuento: "50.00", total: "600.50" });
  // Con coma flotante, 0,1 + 0,2 no da 0,3
  expect(calcularTotales(["0.10", "0.20"], "0.00").total).toBe("0.30");
  expect(calcularTotales(["100.00"], "150.00").total).toBe("0.00");
  expect(calcularTotales([], "0.00")).toEqual({ subtotal: "0.00", descuento: "0.00", total: "0.00" });
});

test("el número es año y correlativo de 4 cifras; el año es el de Bolivia", () => {
  expect(numeroCotizacion(2026, 42)).toBe("2026-0042");
  expect(numeroCotizacion(2026, 12345)).toBe("2026-12345");
  expect(claveCorrelativo(2026)).toBe("cotizacion-2026");
  // 31/12 a las 22:00 en La Paz ya es 1/1 en UTC: la cotización es del año que termina
  expect(anioCotizacion(new Date("2027-01-01T02:00:00Z"))).toBe(2026);
  expect(anioCotizacion(new Date("2027-01-01T04:30:00Z"))).toBe(2027);
});

test("precioSugerido: vigente, según evaluación o sin cargar", () => {
  const vigentes = new Map<number, string | null>([
    [1, "450.00"],
    [2, null],
  ]);
  expect(precioSugerido(vigentes, 1)).toEqual({ tipo: "monto", monto: "450.00" });
  expect(precioSugerido(vigentes, 2)).toEqual({ tipo: "evaluacion" });
  expect(precioSugerido(vigentes, 3)).toEqual({ tipo: "sin_cargar" });
});

test("la validez sugerida es hoy en Bolivia más los días de Configuración", () => {
  // 20/10 a las 23:30 en La Paz (ya 21/10 en UTC): la cuenta parte del 20
  expect(fechaValidez(new Date("2026-10-21T03:30:00Z"), 15)).toBe("2026-11-04");
});

test("la descripción copia servicio y variante; la variante «Única» no se repite", () => {
  expect(descripcionLinea("Pulido y nano cerámico", "5 años")).toBe("Pulido y nano cerámico — 5 años");
  expect(descripcionLinea("Pulido de vidrios", "Única")).toBe("Pulido de vidrios");
});

test("descuento y adelanto aceptan cero o vacío", () => {
  expect(["", "0", "0,00", "0.0"].map(leerMontoOCero)).toEqual(["0.00", "0.00", "0.00", "0.00"]);
  expect(leerMontoOCero("50,5")).toBe("50.50");
  expect(leerMontoOCero("-5")).toBeUndefined();
  expect(leerMontoOCero("1.250,00")).toBeUndefined();
});

const hoy = fechaEnBolivia();
const valida = {
  consultaId: "7",
  desde: "",
  lineas: JSON.stringify([
    { varianteId: 3, precio: "450" },
    { varianteId: 4, precio: "200,50" },
  ]),
  descuento: "50",
  adelanto: "200",
  validaHasta: sumarDias(hoy, 15),
  esEstimado: true,
  fotos: ["10", "11"],
};

test("una cotización válida se lee con los montos normalizados", () => {
  expect(esquemaCotizacion.parse(valida)).toEqual({
    consultaId: 7,
    desde: null,
    lineas: [
      { varianteId: 3, precio: "450.00" },
      { varianteId: 4, precio: "200.50" },
    ],
    descuento: "50.00",
    adelanto: "200.00",
    validaHasta: sumarDias(hoy, 15),
    esEstimado: true,
    fotos: [10, 11],
  });
  expect(esquemaCotizacion.parse({ ...valida, desde: "12" }).desde).toBe(12);
});

const errores = (cambio: Partial<typeof valida>) => {
  const r = esquemaCotizacion.safeParse({ ...valida, ...cambio });
  return r.success ? {} : erroresDe(r.error);
};

test("cada línea necesita servicio y precio; los errores van a su fila", () => {
  expect(errores({ lineas: "[]" })).toEqual({ lineas: "Agrega al menos un servicio." });
  expect(errores({ lineas: JSON.stringify([{ varianteId: 3, precio: "450" }, { varianteId: 4, precio: "" }]) })).toEqual({ "lineas.1": "Escribe el precio." });
  expect(errores({ lineas: JSON.stringify([{ varianteId: 0, precio: "450" }]) })).toEqual({ "lineas.0": "Elige el servicio." });
  expect(errores({ lineas: JSON.stringify([{ varianteId: 3, precio: "0" }]) })["lineas.0"]).toMatch(/^Revisa el precio/);
  expect(errores({ lineas: "no es json" })).toEqual({ lineas: "No se pudo leer la lista de servicios. Recarga la página." });
});

test("descuento, adelanto, validez y fotos (RN-04, S-5)", () => {
  expect(errores({ descuento: "700" })).toEqual({ descuento: "El descuento no puede ser mayor que el subtotal." });
  expect(errores({ adelanto: "600.51" })).toEqual({ adelanto: "El adelanto no puede ser mayor que el total." });
  expect(errores({ adelanto: "600.50" })).toEqual({});
  expect(errores({ validaHasta: sumarDias(hoy, -1) })).toEqual({ validaHasta: "La validez no puede ser anterior a hoy." });
  expect(errores({ validaHasta: hoy })).toEqual({});
  expect(errores({ fotos: ["1", "2", "3", "4", "5"] })).toEqual({ fotos: "Hasta 4 fotos." });
  expect(errores({ fotos: ["1", "1"] })).toEqual({ fotos: "Revisa las fotos elegidas." });
});
