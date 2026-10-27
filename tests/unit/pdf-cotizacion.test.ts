import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { renderToBuffer } from "@react-pdf/renderer";
import sharp from "sharp";
import { expect, test } from "vitest";
import { montoDocumento, PdfCotizacion, type DatosPdf, type Imagen } from "@/modulos/cotizaciones/pdf/plantilla";

// HU-26: la plantilla del PDF arma un A4 válido con las fuentes de la marca, con y sin las partes opcionales.
// Con PDF_SALIDA=<carpeta> deja los PDF ahí para revisarlos a mano (docs/08-desarrollo/plan-de-desarrollo.md, paso 3).

async function imagen(color: string): Promise<Imagen> {
  const data = await sharp({ create: { width: 800, height: 600, channels: 3, background: color } }).jpeg().toBuffer();
  return { data, format: "jpg", ancho: 800, alto: 600 };
}

async function logo(archivo = "toctar-horizontal-sin-lema-sobre-claro.svg"): Promise<Imagen> {
  const svg = readFileSync(path.join(process.cwd(), "public", "marca", archivo));
  const { data, info } = await sharp(svg, { density: 300 }).resize({ height: 240 }).png().toBuffer({ resolveWithObject: true });
  return { data, format: "png", ancho: info.width, alto: info.height };
}

async function datos(cambios: Partial<DatosPdf> = {}): Promise<DatosPdf> {
  return {
    negocio: { nombre: "TocTar Detailing", razonSocial: null, nit: "1234567", whatsapp: "+591 7123 4567", direccion: "Av. La Banda 123, Tarija", logo: await logo() },
    numero: "2026-0042",
    version: 1,
    fecha: "21/10/2026",
    validaHasta: "05/11/2026",
    cliente: { nombre: "Juan Pérez Aguilar", whatsapp: "+591 7724 0010" },
    vehiculo: { placa: "2849XKT", descripcion: "Toyota Yaris, Blanco", tamano: "Sedanes y hatchbacks medianos" },
    lineas: [
      { descripcion: "Pulido y nano cerámico (5 años)", precio: "1850.00" },
      { descripcion: "Lavado de interior (Premium)", precio: "350.00" },
      { descripcion: "Restauración de faroles con polímero", precio: "200.50" },
    ],
    subtotal: "2400.50",
    descuento: "100.00",
    total: "2300.50",
    adelanto: "500.00",
    esEstimado: true,
    formasPago: "Efectivo, QR o transferencia bancaria.",
    condiciones:
      "Los precios están en bolivianos e incluyen materiales y mano de obra. Para reservar la fecha se pide un adelanto, que se descuenta del total. Si al recibir el vehículo su estado es distinto al evaluado, se avisa el nuevo precio antes de empezar el trabajo.",
    garantia:
      "Al entregar el vehículo te damos un manual con los cuidados que necesita. La garantía cubre el trabajo realizado siempre que se sigan esas indicaciones; si no se siguen, TocTar Detailing no se hace responsable del resultado.",
    fotos: await Promise.all(["#444444", "#888888", "#222222", "#aaaaaa"].map(imagen)),
    ...cambios,
  };
}

async function generar(nombre: string, d: DatosPdf): Promise<string> {
  const pdf = await renderToBuffer(PdfCotizacion({ d }));
  if (process.env.PDF_SALIDA) writeFileSync(path.join(process.env.PDF_SALIDA, `${nombre}.pdf`), pdf);
  return pdf.toString("latin1");
}

test("arma un PDF A4 con las fuentes de la marca incrustadas", { timeout: 30_000 }, async () => {
  const pdf = await generar("completo", await datos({ version: 2 }));
  expect(pdf.startsWith("%PDF-")).toBe(true);
  // A4: 595,28 × 841,89 puntos
  expect(pdf).toMatch(/\/MediaBox \[0 0 595\.2\d+ 841\.8\d+\]/);
  // Las fuentes van incrustadas (subconjuntos), no las del sistema de quien lo abre
  expect(pdf).toMatch(/\/FontName \/[A-Z]{6}\+BarlowCondensed-ExtraBoldItalic/);
  expect(pdf).toMatch(/\/FontName \/[A-Z]{6}\+Montserrat-Bold/);
  expect(pdf).toContain("/FontFile2");
});

test("sin fotos, sin descuento ni estimado, y con muchas líneas", { timeout: 30_000 }, async () => {
  const lineas = Array.from({ length: 20 }, (_, i) => ({ descripcion: `Servicio de prueba número ${i + 1}`, precio: "100.00" }));
  const pdf = await generar("minimo", await datos({ fotos: [], descuento: "0.00", esEstimado: false, lineas, subtotal: "2000.00", total: "2000.00" }));
  expect(pdf.startsWith("%PDF-")).toBe(true);
  // 20 líneas, totales y textos no entran en una hoja: el pie numera las páginas
  expect(pdf.match(/\/Type \/Page\b/g)?.length).toBeGreaterThanOrEqual(2);
});

test("tres servicios sin fotos caben en una hoja, también con el cuerpo en 10,5 pt", { timeout: 30_000 }, async () => {
  const pdf = await generar("una-hoja", await datos({ fotos: [] }));
  expect(pdf.match(/\/Type \/Page\b/g)?.length).toBe(1);
});

test("con un logo cuadrado (el vertical sin lema: a ese tamaño la marca no lleva el lema) y una versión nueva", { timeout: 30_000 }, async () => {
  const d = await datos({ version: 2, fotos: [] });
  const pdf = await generar("logo-cuadrado", { ...d, negocio: { ...d.negocio, logo: await logo("toctar-vertical-sin-lema-sobre-claro.svg") } });
  expect(pdf.startsWith("%PDF-")).toBe(true);
  expect(pdf.match(/\/Type \/Page\b/g)?.length).toBe(1);
});

test("los montos del documento llevan dos decimales y separador de miles", () => {
  expect(["450.00", "1850.00", "200.50", "12345.60", "0.00"].map(montoDocumento)).toEqual(["450,00 Bs", "1.850,00 Bs", "200,50 Bs", "12.345,60 Bs", "0,00 Bs"]);
});
