// Dirección pública del sitio y si Google puede indexarlo (HU-18).
// SITIO_URL: el dominio en producción, pruebas.<dominio> en pruebas, localhost en desarrollo.
// SITIO_INDEXABLE: "true" solo en producción; el entorno de pruebas no se indexa (arquitectura, "Entornos").

export function urlSitio(): string {
  return (process.env.SITIO_URL || "http://localhost:3000").replace(/\/+$/, "");
}

export function sitioIndexable(): boolean {
  return process.env.SITIO_INDEXABLE === "true";
}

export type EnlaceSitio = { href: string; texto: string };

/** Páginas principales del sitio: la barra del encabezado y la primera parte del menú del celular. */
export const PAGINAS_PRINCIPALES: EnlaceSitio[] = [
  { href: "/servicios", texto: "Servicios" },
  { href: "/galeria", texto: "Galería" },
  { href: "/nosotros", texto: "Nosotros" },
  { href: "/contacto", texto: "Contacto" },
];

/** Páginas de consulta: en la computadora van solo en el pie; en el celular, también en el menú. */
export const PAGINAS_SECUNDARIAS: EnlaceSitio[] = [
  { href: "/preguntas-frecuentes", texto: "Preguntas frecuentes" },
  { href: "/garantia", texto: "Garantía y reclamos" },
];

/** Páginas legales (pedido 49): solo en el pie, no en el menú del celular. Se consultan, no se navegan. */
export const PAGINAS_LEGALES: EnlaceSitio[] = [{ href: "/privacidad", texto: "Política de privacidad" }];

/** Todas las páginas fijas del sitio público (para el mapa del sitio). */
export const PAGINAS_SITIO = ["/", ...[...PAGINAS_PRINCIPALES, ...PAGINAS_SECUNDARIAS, ...PAGINAS_LEGALES].map((p) => p.href)];

/** Lo que nunca va a Google: el panel, el ingreso y la API. */
// "/c/": los enlaces de las cotizaciones que se mandan a cada cliente (pedido 47)
export const RUTAS_PRIVADAS = ["/panel", "/ingresar", "/api", "/c/"] as const;
