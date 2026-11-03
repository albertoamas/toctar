import { describe, expect, test } from "vitest";
import { EnlaceTikTok } from "@/componentes/sitio/enlace-tiktok";
import { usuarioDeTikTok } from "@/lib/tiktok";

// Pedido de la demo del 24/10 (registro de cambios 2): el acceso a TikTok solo con el enlace cargado.

describe("acceso a TikTok", () => {
  test("sin enlace cargado no aparece", () => {
    expect(EnlaceTikTok({})).toBeNull();
    expect(EnlaceTikTok({ enlace: "" })).toBeNull();
  });

  test("con enlace, lleva al perfil", () => {
    expect(EnlaceTikTok({ enlace: "https://www.tiktok.com/@toctar" })?.props.href).toBe("https://www.tiktok.com/@toctar");
  });
});

describe("el usuario de TikTok del bloque de la portada (pedido 35)", () => {
  test("sale del enlace del perfil, con o sin www y con lo que venga después", () => {
    expect(usuarioDeTikTok("https://www.tiktok.com/@toctar.detailing")).toBe("@toctar.detailing");
    expect(usuarioDeTikTok("https://tiktok.com/@toctar_tarija?lang=es")).toBe("@toctar_tarija");
  });
  test("si el enlace no lo trae (un video, un enlace corto), no se muestra", () => {
    expect(usuarioDeTikTok("https://vm.tiktok.com/ZMabc123/")).toBeNull();
  });
  test("solo de tiktok.com, y sin el punto que se cuela al copiar de un texto", () => {
    expect(usuarioDeTikTok("https://www.tiktok.com/@toctar.")).toBe("@toctar");
    expect(usuarioDeTikTok("https://nottiktok.com/@x")).toBeNull();
    expect(usuarioDeTikTok("no es un enlace")).toBeNull();
  });
});
