import type { Route } from "next";
import { MODULOS, puedeVerModulo, type Modulo, type SujetoPermisos } from "@/lib/permisos";

// Pedido 43 (etapas/P43-volver-al-origen.md): "Volver" lleva a la pantalla de la que se vino. Cada enlace que abre otra
// pantalla lleva `?volver=` con la dirección de donde sale (con la pestaña, los filtros y la búsqueda de una lista), y la
// pantalla que llega lo usa para su botón de volver. Sin "desde", o con uno que no sirve, vuelve a su lista de siempre.

/**
 * El parámetro con la pantalla de origen. No es `desde`: Nueva versión ya lo usa para la versión de la que parte, y
 * Cambiar de dueño para `desde=comprador`.
 */
export const PARAMETRO_VOLVER = "volver";

/** Hasta cuánto mide una dirección con su "desde": si se pasa, se quita el "desde" anidado más adentro. */
const LARGO_MAXIMO = 1000;
const BASE = "http://panel.local";

/** Las pantallas a las que se puede volver, con lo que dice debajo del título y su módulo (para el permiso). */
const PANTALLAS: { ruta: RegExp; texto: string; modulo: Modulo }[] = [
  { ruta: /^\/panel$/, texto: "Inicio", modulo: "inicio" },
  { ruta: /^\/panel\/agenda$/, texto: "Agenda", modulo: "agenda" },
  { ruta: /^\/panel\/agenda\/\d+$/, texto: "Reserva", modulo: "agenda" },
  { ruta: /^\/panel\/ordenes$/, texto: "Órdenes", modulo: "ordenes" },
  { ruta: /^\/panel\/ordenes\/\d+$/, texto: "Orden", modulo: "ordenes" },
  { ruta: /^\/panel\/cotizaciones$/, texto: "Cotizaciones", modulo: "cotizaciones" },
  { ruta: /^\/panel\/cotizaciones\/\d+$/, texto: "Cotización", modulo: "cotizaciones" },
  { ruta: /^\/panel\/clientes$/, texto: "Clientes", modulo: "clientes" },
  { ruta: /^\/panel\/clientes\/\d+$/, texto: "Cliente", modulo: "clientes" },
  { ruta: /^\/panel\/pagos$/, texto: MODULOS.pagos.nombreMenu, modulo: "pagos" },
  { ruta: /^\/panel\/mantenimientos$/, texto: "Mantenimientos", modulo: "mantenimientos" },
  { ruta: /^\/panel\/reclamos$/, texto: "Reclamos", modulo: "reclamos" },
  { ruta: /^\/panel\/catalogo$/, texto: "Catálogo y precios", modulo: "catalogo" },
  { ruta: /^\/panel\/catalogo\/\d+$/, texto: "Servicio del catálogo", modulo: "catalogo" },
  { ruta: /^\/panel\/sitio\/servicios$/, texto: "Servicios", modulo: "sitio" },
  { ruta: /^\/panel\/sitio\/servicios\/\d+$/, texto: "Su página en el sitio", modulo: "sitio" },
  { ruta: /^\/panel\/usuarios$/, texto: "Usuarios", modulo: "usuarios" },
];

const pantallaDe = (ruta: string) => PANTALLAS.find((p) => p.ruta.test(ruta)) ?? null;

/** Lo que dice debajo del título al volver a esa ruta (sin parámetros), o null si no es una pantalla a la que se vuelve. */
export function textoVolver(ruta: string): string | null {
  return pantallaDe(ruta)?.texto ?? null;
}

/**
 * La dirección de "desde", si sirve: del panel (sin otro sitio, esquema ni `//`), de una pantalla a la que se vuelve y de
 * hasta 1000 caracteres. Devuelve la ruta con sus parámetros, o null.
 */
export function leerDesde(valor: unknown): Route | null {
  if (typeof valor !== "string" || valor.length === 0 || valor.length > LARGO_MAXIMO) return null;
  if (!valor.startsWith("/panel") || valor.includes("//") || valor.includes("\\")) return null;
  let url: URL;
  try {
    url = new URL(valor, BASE);
  } catch {
    return null;
  }
  if (url.origin !== BASE || !pantallaDe(url.pathname)) return null;
  return `${url.pathname}${url.search}` as Route;
}

/** El "desde" que trae una dirección, ya validado, o null. */
function desdeDe(direccion: string): Route | null {
  return leerDesde(new URL(direccion, BASE).searchParams.get(PARAMETRO_VOLVER));
}

/** La dirección sin su "desde". */
function sinDesde(direccion: string): string {
  const url = new URL(direccion, BASE);
  url.searchParams.delete(PARAMETRO_VOLVER);
  return `${url.pathname}${url.search}`;
}

/**
 * El enlace con "desde" (codificado; si ya traía uno, se reemplaza). Si queda demasiado largo, se quita el "desde" que
 * venía dentro de "desde": se vuelve un paso, no toda la cadena.
 */
export function conDesde<T extends string>(href: T, desde: string | null | undefined): T {
  if (!desde) return href;
  const armar = (d: string) => {
    const url = new URL(href, BASE);
    url.searchParams.set(PARAMETRO_VOLVER, d);
    return `${url.pathname}${url.search}${url.hash}`;
  };
  const completo = armar(desde);
  return (completo.length <= LARGO_MAXIMO ? completo : armar(sinDesde(desde))) as T;
}

/**
 * La dirección actual de una pantalla del servidor (su ruta y sus parámetros), para los enlaces que salen de ella.
 * Los parámetros de una sola vez (avisos como `creado=1`) no se repiten al volver.
 */
export function aqui(ruta: string, parametros: Record<string, string | string[] | undefined> = {}): Route {
  const busqueda = new URLSearchParams();
  for (const [clave, valor] of Object.entries(parametros)) {
    if (UNA_SOLA_VEZ.has(clave) || valor === undefined) continue;
    for (const v of Array.isArray(valor) ? valor : [valor]) busqueda.append(clave, v);
  }
  const texto = busqueda.toString();
  return `${ruta}${texto ? `?${texto}` : ""}` as Route;
}

/** Parámetros que avisan algo una vez (al crear, guardar o recibir): no van en "desde". */
const UNA_SOLA_VEZ = new Set(["creado", "creada", "agendada", "recibido", "entregado", "publicado", "version", "sinpdf"]);

/**
 * Al terminar un paso de un trabajo (recibir, entregar, publicar), si "desde" es la propia reserva u orden de ese
 * trabajo, se usa el "desde" de esa pantalla: la orden recibida vuelve a donde se estaba antes de abrir la reserva, y no a
 * la reserva, que ahora lleva a la orden.
 */
export function sinElTrabajo(desde: string | null, trabajoId: number): Route | null {
  const valido = leerDesde(desde);
  if (!valido) return null;
  const { pathname } = new URL(valido, BASE);
  if (pathname === `/panel/agenda/${trabajoId}` || pathname === `/panel/ordenes/${trabajoId}`) return desdeDe(valido);
  return valido;
}

/** Lo mismo para una cotización: al versionarla, la cotización vuelve a donde se estaba antes de abrirla. */
export function sinLaCotizacion(desde: string | null, consultaId: number): Route | null {
  const valido = leerDesde(desde);
  if (!valido) return null;
  return new URL(valido, BASE).pathname === `/panel/cotizaciones/${consultaId}` ? desdeDe(valido) : valido;
}

export type Volver = { href: Route; texto: string };

/**
 * A dónde lleva "Volver": a "desde" si sirve y quien mira puede abrir esa pantalla (si no, sería un botón a "Sin
 * acceso"); si no, a la de siempre.
 */
export function volverDesde(desde: unknown, porDefecto: Volver, usuario: SujetoPermisos): Volver {
  const href = leerDesde(desde);
  if (!href) return porDefecto;
  const pantalla = pantallaDe(new URL(href, BASE).pathname)!;
  if (!puedeVerModulo(usuario, pantalla.modulo)) return porDefecto;
  return { href, texto: pantalla.texto };
}
