import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";

/**
 * Código de la conexión del visitante, para los límites por conexión (ingreso, reclamos). No se guarda la IP.
 * En producción el proxy (Traefik, de Coolify) pone la IP real en x-real-ip y la agrega al FINAL de
 * x-forwarded-for: el primer valor de esa lista lo puede inventar el visitante, por eso no se usa.
 * Supone que a la app solo se llega por el proxy (el puerto 3000 no se publica): ver arquitectura, "Docker".
 */
export async function codigoDeConexion(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-real-ip")?.trim() || h.get("x-forwarded-for")?.split(",").at(-1)?.trim() || "desconocida";
  return createHash("sha256").update(`${process.env.BETTER_AUTH_SECRET ?? ""}:${ip}`).digest("hex");
}
