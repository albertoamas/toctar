import { describe, expect, test } from "vitest";
import { claveDeConexion, esDeCloudflare, ipDelVisitante } from "@/lib/ip-visitante";

// La IP del visitante para los límites por conexión (RNF-04 y el límite de reclamos), con y sin el proxy de Cloudflare
// (14/11), y lo que cuenta como una conexión.

const encabezados = (valores: Record<string, string>) => ({ get: (n: string) => valores[n.toLowerCase()] ?? null });
const SECRETO = "secreto-de-prueba-0123456789";

describe("las IPs de Cloudflare", () => {
  test("reconoce las de sus rangos, IPv4 e IPv6, también una IPv4 escrita como IPv6", () => {
    expect(esDeCloudflare("172.70.10.5")).toBe(true);
    expect(esDeCloudflare("104.23.255.1")).toBe(true);
    expect(esDeCloudflare("2606:4700:10::ac43:1")).toBe(true);
    expect(esDeCloudflare("::ffff:162.158.1.1")).toBe(true);
    // 172.70.10.5 en hexadecimal
    expect(esDeCloudflare("::ffff:ac46:a05")).toBe(true);
  });

  test("no confunde otras ni texto cualquiera", () => {
    expect(esDeCloudflare("200.87.10.20")).toBe(false);
    expect(esDeCloudflare("2001:db8::1")).toBe(false);
    expect(esDeCloudflare("desconocida")).toBe(false);
  });
});

describe("la IP del visitante", () => {
  test("sin Cloudflare, la que pone el proxy del servidor", () => {
    expect(ipDelVisitante(encabezados({ "x-real-ip": "200.87.10.20" }), SECRETO)).toBe("200.87.10.20");
  });

  test("sin x-real-ip (en desarrollo), la ÚLTIMA de x-forwarded-for: la primera la puede inventar el visitante", () => {
    expect(ipDelVisitante(encabezados({ "x-forwarded-for": "1.1.1.1, 200.87.10.20" }), SECRETO)).toBe("200.87.10.20");
  });

  test("por el proxy de nuestra zona (IP de Cloudflare y el secreto), la del visitante", () => {
    const pedido = { "x-real-ip": "172.70.10.5", "x-origen-cloudflare": SECRETO, "cf-connecting-ip": "200.87.10.20" };
    expect(ipDelVisitante(encabezados(pedido), SECRETO)).toBe("200.87.10.20");
    expect(ipDelVisitante(encabezados({ ...pedido, "x-real-ip": "2606:4700:10::ac43:1", "cf-connecting-ip": "2800:cd0::1" }), SECRETO)).toBe("2800:cd0::1");
  });

  test("desde WARP o un Worker (IP de Cloudflare, sin el secreto), CF-Connecting-IP escrito a mano no engaña al límite", () => {
    expect(ipDelVisitante(encabezados({ "x-real-ip": "104.28.5.9", "cf-connecting-ip": "9.9.9.9" }), SECRETO)).toBe("104.28.5.9");
    expect(ipDelVisitante(encabezados({ "x-real-ip": "104.28.5.9", "x-origen-cloudflare": "adivinado", "cf-connecting-ip": "9.9.9.9" }), SECRETO)).toBe("104.28.5.9");
  });

  test("quien entra directo al servidor, con el encabezado y hasta con el secreto, tampoco", () => {
    expect(ipDelVisitante(encabezados({ "x-real-ip": "200.87.10.20", "x-origen-cloudflare": SECRETO, "cf-connecting-ip": "9.9.9.9" }), SECRETO)).toBe("200.87.10.20");
  });

  test("una IP de Cloudflare inventada en x-forwarded-for (sin x-real-ip) no abre la puerta", () => {
    const pedido = { "x-forwarded-for": "172.70.10.5", "x-origen-cloudflare": SECRETO, "cf-connecting-ip": "9.9.9.9" };
    expect(ipDelVisitante(encabezados(pedido), SECRETO)).toBe("172.70.10.5");
  });

  test("sin el secreto configurado, CF-Connecting-IP nunca se usa", () => {
    expect(ipDelVisitante(encabezados({ "x-real-ip": "172.70.10.5", "x-origen-cloudflare": "", "cf-connecting-ip": "200.87.10.20" }), "")).toBe("172.70.10.5");
  });

  test("un CF-Connecting-IP que no es una IP (o varios juntos) no se usa", () => {
    const pedido = { "x-real-ip": "172.70.10.5", "x-origen-cloudflare": SECRETO };
    expect(ipDelVisitante(encabezados({ ...pedido, "cf-connecting-ip": "cualquier cosa" }), SECRETO)).toBe("172.70.10.5");
    expect(ipDelVisitante(encabezados({ ...pedido, "cf-connecting-ip": "1.1.1.1, 2.2.2.2" }), SECRETO)).toBe("172.70.10.5");
  });

  test("sin ningún encabezado, una sola conexión desconocida (en desarrollo)", () => {
    expect(ipDelVisitante(encabezados({}), SECRETO)).toBe("desconocida");
  });
});

describe("lo que cuenta como una conexión", () => {
  test("una IPv4, entera", () => {
    expect(claveDeConexion("200.87.10.20")).toBe("200.87.10.20");
  });

  test("una IPv6, su bloque /64: cambiar de dirección dentro de él no da otro límite", () => {
    expect(claveDeConexion("2800:cd0:1:2:aaaa::1")).toBe("2800:0cd0:0001:0002::/64");
    expect(claveDeConexion("2800:cd0:1:2:bbbb:cccc:dddd:eeee")).toBe("2800:0cd0:0001:0002::/64");
    expect(claveDeConexion("2800:cd0:1:3::1")).toBe("2800:0cd0:0001:0003::/64");
  });

  test("lo que no es una IP queda como está", () => {
    expect(claveDeConexion("desconocida")).toBe("desconocida");
  });
});
