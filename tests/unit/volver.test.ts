import { expect, test } from "vitest";
import { aqui, conDesde, leerDesde, sinElTrabajo, sinLaCotizacion, textoVolver, volverDesde } from "@/lib/volver";

// Pedido 43 (etapas/P43-volver-al-origen.md): "Volver" a la pantalla de origen, sin desvíos a otro sitio.

const dueno = { rol: "dueno" as const, permisos: [] };
const encargadoSinPagos = { rol: "encargado" as const, permisos: ["ordenes", "agenda"] };
const ORDENES = { href: "/panel/ordenes" as const, texto: "Órdenes" };

test("leerDesde acepta las pantallas del panel, con sus parámetros", () => {
  expect(leerDesde("/panel")).toBe("/panel");
  expect(leerDesde("/panel/ordenes?filtro=listo&q=abc")).toBe("/panel/ordenes?filtro=listo&q=abc");
  expect(leerDesde("/panel/clientes/8")).toBe("/panel/clientes/8");
  expect(leerDesde("/panel/agenda?semana=2026-11-09&dia=2026-11-10")).toBe("/panel/agenda?semana=2026-11-09&dia=2026-11-10");
});

test("leerDesde rechaza otro sitio, esquemas, rutas fuera del panel o desconocidas y lo demasiado largo", () => {
  for (const malo of [
    "//otro.com",
    "https://otro.com/panel",
    "/\\otro.com",
    "/panel//otro.com",
    "javascript:alert(1)",
    "/sitio",
    "/panelito",
    "/panel/configuracion/negocio",
    "/panel/ordenes/5/entregar",
    "",
    `/panel/ordenes?q=${"a".repeat(1000)}`,
    undefined,
    ["/panel"],
  ]) {
    expect(leerDesde(malo), String(malo)).toBeNull();
  }
});

test("textoVolver dice a dónde se vuelve", () => {
  expect(textoVolver("/panel")).toBe("Inicio");
  expect(textoVolver("/panel/pagos")).toBe("Saldos pendientes");
  expect(textoVolver("/panel/agenda/3")).toBe("Reserva");
  expect(textoVolver("/panel/ordenes/3")).toBe("Orden");
  expect(textoVolver("/panel/cotizaciones/3")).toBe("Cotización");
  expect(textoVolver("/panel/clientes/3")).toBe("Cliente");
  expect(textoVolver("/panel/catalogo/3")).toBe("Servicio del catálogo");
  expect(textoVolver("/panel/sitio/servicios/3")).toBe("Su página en el sitio");
  expect(textoVolver("/panel/usuarios/3")).toBeNull();
});

test("conDesde codifica, reemplaza el anterior y recorta lo anidado si queda largo", () => {
  expect(conDesde("/panel/ordenes/5", "/panel/ordenes?filtro=listo")).toBe("/panel/ordenes/5?desde=%2Fpanel%2Fordenes%3Ffiltro%3Dlisto");
  expect(conDesde("/panel/ordenes/5?x=1", "/panel")).toBe("/panel/ordenes/5?x=1&desde=%2Fpanel");
  expect(conDesde("/panel/ordenes/5?desde=%2Fpanel", "/panel/pagos")).toBe("/panel/ordenes/5?desde=%2Fpanel%2Fpagos");
  expect(conDesde("/panel/ordenes/5", null)).toBe("/panel/ordenes/5");
  // Ida y vuelta: lo que se pone se lee igual
  const href = conDesde("/panel/clientes/8", "/panel/ordenes/5?desde=%2Fpanel");
  expect(leerDesde(new URL(href, "http://x").searchParams.get("desde"))).toBe("/panel/ordenes/5?desde=%2Fpanel");
  // Largo: se quita el "desde" de adentro
  const largo = `/panel/ordenes/5?desde=${encodeURIComponent(`/panel/ordenes?q=${"a".repeat(950)}`)}`;
  expect(conDesde("/panel/clientes/8", largo)).toBe("/panel/clientes/8?desde=%2Fpanel%2Fordenes%2F5");
});

test("aqui arma la dirección actual sin los avisos de una sola vez", () => {
  expect(aqui("/panel/ordenes", { filtro: "listo", q: "abc" })).toBe("/panel/ordenes?filtro=listo&q=abc");
  expect(aqui("/panel/clientes/8", { creado: "1", desde: "/panel" })).toBe("/panel/clientes/8?desde=%2Fpanel");
  expect(aqui("/panel")).toBe("/panel");
});

test("al terminar un paso del trabajo, se vuelve a donde se estaba antes de abrirlo", () => {
  expect(sinElTrabajo("/panel/agenda/7?desde=%2Fpanel%2Fagenda", 7)).toBe("/panel/agenda");
  expect(sinElTrabajo("/panel/ordenes/7?desde=%2Fpanel", 7)).toBe("/panel");
  expect(sinElTrabajo("/panel/ordenes/7", 7)).toBeNull();
  expect(sinElTrabajo("/panel/clientes/3", 7)).toBe("/panel/clientes/3");
  expect(sinElTrabajo("https://otro.com", 7)).toBeNull();
  expect(sinLaCotizacion("/panel/cotizaciones/4?desde=%2Fpanel%2Fclientes%2F3", 4)).toBe("/panel/clientes/3");
});

test("volverDesde respeta el permiso del módulo y si no, vuelve a la de siempre", () => {
  expect(volverDesde("/panel/pagos", ORDENES, dueno)).toEqual({ href: "/panel/pagos", texto: "Saldos pendientes" });
  expect(volverDesde("/panel/pagos", ORDENES, encargadoSinPagos)).toEqual(ORDENES);
  expect(volverDesde("/panel/agenda?semana=2026-11-09", ORDENES, encargadoSinPagos)).toEqual({ href: "/panel/agenda?semana=2026-11-09", texto: "Agenda" });
  expect(volverDesde("https://otro.com", ORDENES, dueno)).toEqual(ORDENES);
  expect(volverDesde(undefined, ORDENES, dueno)).toEqual(ORDENES);
});
