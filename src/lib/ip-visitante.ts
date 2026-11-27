import { timingSafeEqual } from "node:crypto";
import { BlockList, isIP } from "node:net";

// La IP del visitante, para los límites por conexión (ingreso, reclamos). Aparte de conexion.ts para probarla sin Next.
//
// Sin Cloudflare: el proxy (Traefik, de Coolify) pone la IP de quien se conecta en x-real-ip (y descarta la que mande el
// visitante). x-forwarded-for solo se usa sin x-real-ip (en desarrollo), y de él la ÚLTIMA: la primera la puede inventar
// el visitante.
// Con el proxy de Cloudflare (la nube naranja, 14/11): quien se conecta es un servidor de Cloudflare, así que x-real-ip
// es una IP de Cloudflare, la misma para muchos visitantes, y la del visitante viene en CF-Connecting-IP. Ese encabezado
// se cree solo con DOS pruebas de que el pedido pasó por el proxy de NUESTRA zona:
//   1. x-real-ip es de Cloudflare.
//   2. Trae el secreto de origen (`x-origen-cloudflare`), que agrega una regla de Cloudflare (Transform Rule) solo al
//      tráfico que pasa por el proxy de la zona. Sin él, la IP no alcanza: WARP (la VPN de Cloudflare) y los Workers con
//      conexiones directas salen desde esos mismos rangos y pueden escribir CF-Connecting-IP a mano (revisión de
//      seguridad del 14/11). Sin el secreto configurado, CF-Connecting-IP nunca se usa.

/**
 * Los rangos de Cloudflare, de https://www.cloudflare.com/ips-v4 y /ips-v6 (copiados el 14/11/2026). Cambian muy de
 * tarde en tarde; si Cloudflare suma uno, se agrega aquí y en el firewall del servidor (07-preparacion/servidor.md).
 */
const RANGOS_CLOUDFLARE = {
  ipv4: [
    "173.245.48.0/20",
    "103.21.244.0/22",
    "103.22.200.0/22",
    "103.31.4.0/22",
    "141.101.64.0/18",
    "108.162.192.0/18",
    "190.93.240.0/20",
    "188.114.96.0/20",
    "197.234.240.0/22",
    "198.41.128.0/17",
    "162.158.0.0/15",
    "104.16.0.0/13",
    "104.24.0.0/14",
    "172.64.0.0/13",
    "131.0.72.0/22",
  ],
  ipv6: ["2400:cb00::/32", "2606:4700::/32", "2803:f800::/32", "2405:b500::/32", "2405:8100::/32", "2a06:98c0::/29", "2c0f:f248::/32"],
} as const;

const CLOUDFLARE = new BlockList();
for (const familia of ["ipv4", "ipv6"] as const) {
  for (const rango of RANGOS_CLOUDFLARE[familia]) {
    const [red, prefijo] = rango.split("/");
    CLOUDFLARE.addSubnet(red, Number(prefijo), familia);
  }
}

/**
 * Una IPv4 escrita como IPv6, en su forma corta: "::ffff:1.2.3.4" o en hexadecimal "::ffff:0102:0304" → "1.2.3.4".
 * Las demás, como llegan.
 */
function normalizar(ip: string): string {
  const conPuntos = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip);
  if (conPuntos) return conPuntos[1];
  const hexa = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i.exec(ip);
  if (hexa) {
    const [alto, bajo] = [parseInt(hexa[1], 16), parseInt(hexa[2], 16)];
    return [alto >> 8, alto & 255, bajo >> 8, bajo & 255].join(".");
  }
  return ip;
}

/** Si la IP es de un servidor de Cloudflare. */
export function esDeCloudflare(ip: string): boolean {
  const limpia = normalizar(ip);
  const familia = isIP(limpia);
  if (familia === 0) return false;
  return CLOUDFLARE.check(limpia, familia === 4 ? "ipv4" : "ipv6");
}

/** El secreto de origen, comparado sin dar pistas por el tiempo que tarda. */
function traeSecreto(recibido: string | null, secreto: string): boolean {
  if (!recibido || !secreto) return false;
  const a = Buffer.from(recibido);
  const b = Buffer.from(secreto);
  return a.length === b.length && timingSafeEqual(a, b);
}

type Encabezados = { get(nombre: string): string | null };

/**
 * La IP del visitante: la que da Cloudflare si el pedido pasó por el proxy de nuestra zona (IP de Cloudflare y el
 * secreto de origen); si no, la de quien se conecta. `secreto`: ORIGEN_CLOUDFLARE_SECRETO (vacío: Cloudflare no se usa).
 */
export function ipDelVisitante(h: Encabezados, secreto: string): string {
  const real = h.get("x-real-ip")?.trim();
  const directa = normalizar(real || h.get("x-forwarded-for")?.split(",").at(-1)?.trim() || "desconocida");
  const deCloudflare = normalizar(h.get("cf-connecting-ip")?.trim() ?? "");
  // Solo x-real-ip (lo pone Traefik) prueba de dónde viene la conexión; x-forwarded-for, sin Traefik, lo escribe cualquiera
  if (real && esDeCloudflare(real) && traeSecreto(h.get("x-origen-cloudflare"), secreto) && isIP(deCloudflare)) return deCloudflare;
  return directa;
}

/** Expande una IPv6 a sus 8 grupos de 4 cifras ("2800:cd0::1" → "2800:0cd0:0000:…:0001"). */
function expandirIpv6(ip: string): string[] {
  const [izquierda, derecha = ""] = ip.split("::");
  const a = izquierda ? izquierda.split(":") : [];
  const b = derecha ? derecha.split(":") : [];
  const ceros = ip.includes("::") ? Array(8 - a.length - b.length).fill("0") : [];
  return [...a, ...ceros, ...b].map((g) => g.padStart(4, "0").toLowerCase());
}

/**
 * Lo que cuenta como "una conexión" para los límites: la IPv4 entera y, de una IPv6, su bloque /64. Un proveedor le da a
 * cada cliente un /64 entero (2^64 direcciones): contadas de a una, cambiar de dirección en cada intento saltaba el
 * límite (revisión de seguridad del 14/11).
 */
export function claveDeConexion(ip: string): string {
  if (isIP(ip) !== 6) return ip;
  return `${expandirIpv6(ip).slice(0, 4).join(":")}::/64`;
}
