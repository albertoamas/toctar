import type { Metadata } from "next";
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

/** La imagen al compartir un enlace del sitio (og:image): el logo sobre negro, `scripts/generar-iconos.mjs`. */
const IMAGEN_COMPARTIR = { url: "/compartir.jpg", width: 1200, height: 630, alt: "TocTar Detailing" };

/**
 * Los metadatos de una página del sitio (pulido de SEO, 13/11): título y descripción, la dirección canónica (que Google
 * no cuente dos veces la misma página, con o sin `www` o con parámetros) y la tarjeta que muestran WhatsApp y Facebook
 * al compartir el enlace, con su foto o, si no tiene, la imagen del logo. Next no mezcla `openGraph` entre el layout y
 * la página (la de la página reemplaza toda la del layout): por eso cada página arma la suya entera aquí.
 */
export function metadatosPagina(p: {
  /** El título de la pestaña: con la plantilla del sitio ("Servicios · TocTar Detailing") o `{ absolute }`. */
  titulo: string | { absolute: string };
  descripcion: string;
  /** La dirección de la página, desde la raíz ("/contacto"). */
  ruta: string;
  /** Su foto para compartir (un servicio), con sus medidas; sin ella, la del logo. */
  imagen?: { url: string; ancho: number | null; alto: number | null } | null;
}): Metadata {
  const titulo = typeof p.titulo === "string" ? `${p.titulo} · TocTar Detailing` : p.titulo.absolute;
  // La foto del servicio es WebP: algún lector de enlaces no lo muestra, y entonces usa la segunda, la del logo (JPG)
  const imagenes = p.imagen
    ? [{ url: p.imagen.url, ...(p.imagen.ancho && p.imagen.alto ? { width: p.imagen.ancho, height: p.imagen.alto } : {}) }, IMAGEN_COMPARTIR]
    : [IMAGEN_COMPARTIR];
  return {
    title: p.titulo,
    description: p.descripcion,
    alternates: { canonical: p.ruta },
    openGraph: { type: "website", locale: "es_BO", siteName: "TocTar Detailing", url: p.ruta, title: titulo, description: p.descripcion, images: imagenes },
    twitter: { card: "summary_large_image", title: titulo, description: p.descripcion, images: imagenes.map((i) => i.url) },
  };
}
