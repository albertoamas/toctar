import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { claveDeConexion, ipDelVisitante } from "@/lib/ip-visitante";

/**
 * Código de la conexión del visitante, para los límites por conexión (ingreso, reclamos). No se guarda la IP.
 * De dónde sale la IP, con y sin el proxy de Cloudflare: `ipDelVisitante` (src/lib/ip-visitante.ts).
 * Supone que a la app solo se llega por el proxy (el puerto 3000 no se publica): ver arquitectura, "Docker".
 */
export async function codigoDeConexion(): Promise<string> {
  // La IPv4 entera o el bloque /64 de una IPv6 (`claveDeConexion`)
  const ip = claveDeConexion(ipDelVisitante(await headers(), process.env.ORIGEN_CLOUDFLARE_SECRETO ?? ""));
  return createHash("sha256").update(`${process.env.BETTER_AUTH_SECRET ?? ""}:${ip}`).digest("hex");
}
