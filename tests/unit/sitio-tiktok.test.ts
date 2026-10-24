import { describe, expect, test } from "vitest";
import { EnlaceTikTok } from "@/componentes/sitio/enlace-tiktok";

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
