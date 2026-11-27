import { describe, expect, test, vi } from "vitest";
import { srcSetFoto } from "@/lib/formato-fotos";
import { metadatosPagina } from "@/lib/sitio";

// Pulido de SEO y rendimiento (13/11): las versiones de cada foto que elige el navegador (la de 1080 para el celular,
// con la misma calidad) y los metadatos de cada página del sitio para Google y para compartir.

vi.mock("server-only", () => ({}));
const { llevaMediana } = await import("@/lib/fotos");

describe("las versiones de una foto", () => {
  const foto = { url: "/f.webp", miniatura: "/f-640.webp", ancho: 1600, alto: 1200 };

  test("con la de 1080, el navegador elige entre las tres", () => {
    expect(srcSetFoto({ ...foto, mediana: "/f-1080.webp" })).toBe("/f-640.webp 640w, /f-1080.webp 1080w, /f.webp 1600w");
  });

  test("una foto vieja, sin la de 1080, sigue con las dos de siempre", () => {
    expect(srcSetFoto(foto)).toBe("/f-640.webp 640w, /f.webp 1600w");
  });

  test("sin miniatura, la foto va sola", () => {
    expect(srcSetFoto({ url: "/f.webp", miniatura: "/f.webp", ancho: 1600, alto: 1200 })).toBeUndefined();
  });

  test("en una foto vertical, cada versión dice su ancho real, no su lado mayor", () => {
    // 900 x 1600: la de 640 mide 360 de ancho y la de 1080, 608. Antes decía 640w y 1080w: el navegador creía que la de
    // 1080 era más ancha que la grande (900) y la bajaba en lugar de ella
    expect(srcSetFoto({ url: "/v.webp", miniatura: "/v-640.webp", mediana: "/v-1080.webp", ancho: 900, alto: 1600 })).toBe("/v-640.webp 360w, /v-1080.webp 608w, /v.webp 900w");
  });

  test("la de 1080 se hace solo si la foto es bastante más grande que eso", () => {
    expect(llevaMediana(1600, 1200)).toBe(true);
    expect(llevaMediana(900, 1600)).toBe(true);
    expect(llevaMediana(1100, 800)).toBe(false);
    expect(llevaMediana(null, null)).toBe(false);
  });
});

describe("los metadatos de una página", () => {
  test("llevan la dirección canónica y la tarjeta para compartir, con la imagen del logo", () => {
    const m = metadatosPagina({ titulo: "Contacto", descripcion: "Dónde estamos.", ruta: "/contacto" });
    expect(m.alternates?.canonical).toBe("/contacto");
    expect(m.openGraph).toMatchObject({ url: "/contacto", title: "Contacto · TocTar Detailing", description: "Dónde estamos.", locale: "es_BO" });
    expect(m.openGraph?.images).toEqual([{ url: "/compartir.jpg", width: 1200, height: 630, alt: "TocTar Detailing" }]);
    expect(m.twitter).toMatchObject({ card: "summary_large_image" });
  });

  test("un servicio comparte su propia foto", () => {
    const m = metadatosPagina({ titulo: "Pulido", descripcion: "Brillo.", ruta: "/servicios/pulido", imagen: { url: "https://fotos/x.webp", ancho: 1600, alto: 1200 } });
    expect(m.openGraph?.images).toEqual([
      { url: "https://fotos/x.webp", width: 1600, height: 1200 },
      { url: "/compartir.jpg", width: 1200, height: 630, alt: "TocTar Detailing" },
    ]);
  });

  test("la portada usa su título completo, sin la plantilla", () => {
    const m = metadatosPagina({ titulo: { absolute: "TocTar Detailing en Tarija" }, descripcion: "x", ruta: "/" });
    expect(m.openGraph?.title).toBe("TocTar Detailing en Tarija");
  });
});
