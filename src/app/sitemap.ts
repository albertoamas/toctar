import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { PAGINAS_SITIO, urlSitio } from "@/lib/sitio";
import { serviciosPublicos } from "@/modulos/sitio/publico";

// HU-18: mapa del sitio para Google, con las páginas fijas y los servicios visibles.
// Se arma al pedirlo (el build no tiene base de datos); los servicios salen de la caché del sitio.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const url = urlSitio();
  const servicios = await serviciosPublicos();
  return [
    ...PAGINAS_SITIO.map((p) => ({ url: `${url}${p === "/" ? "" : p}`, priority: p === "/" ? 1 : 0.7 })),
    ...servicios.map((s) => ({ url: `${url}/servicios/${s.slug}`, priority: 0.8 })),
  ];
}
