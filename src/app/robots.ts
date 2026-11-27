import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { RUTAS_PRIVADAS, sitioIndexable, urlSitio } from "@/lib/sitio";

// HU-18: el panel, el ingreso y la API nunca van a Google (RNF-12). El entorno de pruebas no se indexa entero.
// Las variables se leen al pedirlo, no en el build.
export default async function robots(): Promise<MetadataRoute.Robots> {
  await connection();
  if (!sitioIndexable()) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: [...RUTAS_PRIVADAS] },
    sitemap: `${urlSitio()}/sitemap.xml`,
  };
}
