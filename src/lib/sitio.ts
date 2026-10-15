// Dirección pública del sitio y si Google puede indexarlo (HU-18).
// SITIO_URL: el dominio en producción, pruebas.<dominio> en pruebas, localhost en desarrollo.
// SITIO_INDEXABLE: "true" solo en producción; el entorno de pruebas no se indexa (arquitectura, "Entornos").

export function urlSitio(): string {
  return (process.env.SITIO_URL || "http://localhost:3000").replace(/\/+$/, "");
}

export function sitioIndexable(): boolean {
  return process.env.SITIO_INDEXABLE === "true";
}

/** Páginas fijas del sitio público, en el orden del menú. */
export const PAGINAS_SITIO = ["/", "/servicios", "/galeria", "/nosotros", "/preguntas-frecuentes", "/contacto", "/garantia"] as const;

/** Lo que nunca va a Google: el panel, el ingreso y la API. */
export const RUTAS_PRIVADAS = ["/panel", "/ingresar", "/api"] as const;
