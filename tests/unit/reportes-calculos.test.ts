import { describe, expect, test } from "vitest";
import {
  clientesQueMasPagaron,
  cobradoPorMetodo,
  cobradoPorServicio,
  gastadoPorCategoria,
  hastaLaHora,
  horasConMovimiento,
  indicadores,
  ordenesPorEstado,
  porTramo,
  serviciosRealizados,
} from "@/modulos/reportes/calculos";
import type { DatosDelPeriodo } from "@/modulos/reportes/datos";
import { tramosPorHora } from "@/modulos/reportes/reglas";

// Reportes v2 (19/11): lo que se calcula de los datos de unas fechas. Lo cobrado es lo que entró (pagos), no lo vendido.

const datos: DatosDelPeriodo = {
  cobros: [
    // La orden 1 (un pulido de 1000 y un lavado de 200) pagó 600 de adelanto y 600 al entregar
    { fecha: "2026-11-02", hora: "09:30", monto: 600, metodo: "efectivo", trabajoId: 1, clienteId: 10 },
    { fecha: "2026-11-04", hora: "17:10", monto: 600, metodo: "qr", trabajoId: 1, clienteId: 10 },
    // La orden 2 (un lavado de 200), de otro cliente
    { fecha: "2026-11-04", hora: "11:00", monto: 200, metodo: "qr", trabajoId: 2, clienteId: 20 },
    // Una orden sin líneas: va a "Otros"
    { fecha: "2026-11-05", hora: "10:00", monto: 50, metodo: "transferencia", trabajoId: 3, clienteId: 20 },
  ],
  gastos: [
    { fecha: "2026-11-01", hora: "08:00", monto: 2000, categoria: "Alquiler del local" },
    { fecha: "2026-11-03", hora: "12:00", monto: 300, categoria: "Insumos y productos" },
    { fecha: "2026-11-04", hora: "16:00", monto: 150, categoria: "Insumos y productos" },
  ],
  ordenes: [
    { id: 1, clienteId: 10, estado: "entregado", recibido: "2026-11-02", horaRecibido: "09:00", entregado: "2026-11-04", horaEntregado: "17:00", dias: 2.33 },
    { id: 2, clienteId: 20, estado: "entregado", recibido: "2026-11-03", horaRecibido: "10:00", entregado: "2026-11-04", horaEntregado: "11:00", dias: 1.04 },
    { id: 4, clienteId: 30, estado: "listo", recibido: "2026-11-04", horaRecibido: "15:00", entregado: null, horaEntregado: null, dias: null },
    { id: 5, clienteId: 30, estado: "en_proceso", recibido: "2026-11-05", horaRecibido: "09:00", entregado: null, horaEntregado: null, dias: null },
  ],
  lineas: [
    { trabajoId: 1, servicioId: 100, servicio: "Pulido", precio: 1000 },
    { trabajoId: 1, servicioId: 200, servicio: "Lavado", precio: 200 },
    { trabajoId: 2, servicioId: 200, servicio: "Lavado", precio: 200 },
  ],
};
// El cliente 10 ya había venido en octubre; el 20, por primera vez en noviembre
const primeras = new Map([
  [10, "2026-10-12"],
  [20, "2026-11-04"],
]);

describe("los indicadores", () => {
  test("lo cobrado, las órdenes cobradas, el ticket, lo gastado y el resultado", () => {
    const i = indicadores(datos, "2026-11-01", "2026-11-30", primeras);
    expect(i).toMatchObject({ ingresos: 1450, cobradas: 3, gastos: 2450, movimientos: 3, resultado: -1000, recibidas: 4, completadas: 2 });
    expect(i.ticket).toBeCloseTo(1450 / 3);
  });
  test("los días en el taller, de las completadas", () => {
    expect(indicadores(datos, "2026-11-01", "2026-11-30", primeras).diasPromedio).toBeCloseTo((2.33 + 1.04) / 2);
    expect(indicadores({ ...datos, ordenes: [] }, "2026-11-01", "2026-11-30", primeras).diasPromedio).toBeNull();
  });
  test("clientes atendidos (con una orden completada): nuevo si su primera entrega cae en las fechas", () => {
    expect(indicadores(datos, "2026-11-01", "2026-11-30", primeras)).toMatchObject({ clientes: 2, nuevos: 1, volvieron: 1 });
  });
});

describe("hoy hasta la misma hora", () => {
  test("se cortan los cobros, los gastos, las recepciones y las entregas de después", () => {
    const d = hastaLaHora(datos, "11:00");
    expect(d.cobros.map((c) => c.monto)).toEqual([600, 200, 50]);
    expect(d.gastos.map((g) => g.monto)).toEqual([2000]);
    expect(d.ordenes.find((o) => o.id === 1)).toMatchObject({ recibido: "2026-11-02", entregado: null });
    expect(d.ordenes.find((o) => o.id === 2)).toMatchObject({ recibido: "2026-11-03", entregado: "2026-11-04" });
    expect(hastaLaHora(datos)).toBe(datos);
  });
  test("las horas del gráfico: de la primera con movimiento a la de ahora", () => {
    const dia: DatosDelPeriodo = { ...datos, cobros: datos.cobros.filter((c) => c.fecha === "2026-11-04"), ordenes: [] };
    expect(horasConMovimiento(dia, "18:30")).toEqual([11, 18]);
    expect(horasConMovimiento({ cobros: [], gastos: [], ordenes: [], lineas: [] }, "18:30")).toBeNull();
  });
});

describe("por tramo", () => {
  test("por día: lo cobrado, lo gastado, las órdenes y los clientes de cada día", () => {
    const tramos = ["2026-11-04", "2026-11-05"].map((d) => ({ desde: d, hasta: d, corto: d.slice(8), nombre: d }));
    expect(porTramo(datos, tramos)).toEqual([
      { ingresos: 800, gastos: 150, cobradas: 2, recibidas: 1, completadas: 2, clientes: 2 },
      { ingresos: 50, gastos: 0, cobradas: 1, recibidas: 1, completadas: 0, clientes: 0 },
    ]);
  });
  test("por hora: los gastos no tienen hora y quedan en cero", () => {
    const [h11, , , , , , h17] = porTramo(datos, tramosPorHora("2026-11-04", 11, 17), true);
    expect(h11).toMatchObject({ ingresos: 200, completadas: 1, gastos: 0 });
    expect(h17).toMatchObject({ ingresos: 600, completadas: 1 });
  });
});

describe("repartos y rankings", () => {
  test("lo cobrado por servicio, según el precio de sus líneas; sin líneas, a Otros", () => {
    expect(cobradoPorServicio(datos.cobros, datos.lineas)).toEqual([
      { servicioId: 100, nombre: "Pulido", total: 1000, veces: 1 },
      { servicioId: 200, nombre: "Lavado", total: 400, veces: 2 },
      { servicioId: null, nombre: "Otros", total: 50, veces: 1 },
    ]);
  });
  test("por forma de pago y por categoría, de mayor a menor", () => {
    expect(cobradoPorMetodo(datos.cobros)).toEqual([
      { metodo: "qr", total: 800 },
      { metodo: "efectivo", total: 600 },
      { metodo: "transferencia", total: 50 },
    ]);
    expect(gastadoPorCategoria(datos.gastos)).toEqual([
      { categoria: "Alquiler del local", total: 2000, movimientos: 1 },
      { categoria: "Insumos y productos", total: 450, movimientos: 2 },
    ]);
  });
  test("los servicios realizados: las veces, lo que suman y sus días promedio", () => {
    const s = serviciosRealizados(datos, "2026-11-01", "2026-11-30");
    expect(s.map((x) => [x.nombre, x.veces, x.monto])).toEqual([
      ["Lavado", 2, 400],
      ["Pulido", 1, 1000],
    ]);
    expect(s[0].diasPromedio).toBeCloseTo((2.33 + 1.04) / 2);
  });
  test("las recibidas en las fechas, según cómo están hoy", () => {
    expect(ordenesPorEstado(datos, "2026-11-01", "2026-11-30")).toEqual({ entregadas: 2, listas: 1, enTaller: 1 });
  });
  test("los clientes que más pagaron, con sus órdenes", () => {
    expect(clientesQueMasPagaron(datos.cobros)).toEqual([
      { clienteId: 10, total: 1200, ordenes: 1 },
      { clienteId: 20, total: 250, ordenes: 2 },
    ]);
  });
});
