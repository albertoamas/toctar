import { expect, test } from "vitest";
import { semanaCerrada } from "@/lib/horarios";
import { datosNegocioLocal, horariosSchema, jsonLd } from "@/modulos/sitio/negocio-local";

// HU-18 Sitio preparado para Google. Criterios: docs/09-pruebas/criterios-entrega-1.md (18.x).

const turnos = [
  { desde: "08:00", hasta: "12:00" },
  { desde: "14:00", hasta: "18:00" },
];
const lunesASabado = semanaCerrada().map((d) => (d.dia <= 6 ? { ...d, turnos } : d));

test("los horarios se agrupan por turno y el día cerrado no aparece", () => {
  const dias = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  expect(horariosSchema(lunesASabado)).toEqual([
    { "@type": "OpeningHoursSpecification", dayOfWeek: dias, opens: "08:00", closes: "12:00" },
    { "@type": "OpeningHoursSpecification", dayOfWeek: dias, opens: "14:00", closes: "18:00" },
  ]);
  expect(horariosSchema(semanaCerrada())).toEqual([]);
});

test("datos de negocio local con lo que cargó el dueño", () => {
  const datos = datosNegocioLocal(
    {
      nombre: "TocTar Detailing",
      direccion: "Barrio Aeropuerto",
      coordenadas: { lat: -21.5, lng: -64.7 },
      horarios: lunesASabado,
      whatsapp: "59171234567",
      correo: "toctar@example.com",
      redes: { facebook: "https://facebook.com/toctar", tiktok: "" },
    },
    "https://toctar.example",
  );
  expect(datos).toMatchObject({
    "@type": "AutomotiveBusiness",
    name: "TocTar Detailing",
    url: "https://toctar.example",
    telephone: "+59171234567",
    sameAs: ["https://facebook.com/toctar"],
    geo: { latitude: -21.5, longitude: -64.7 },
    address: { streetAddress: "Barrio Aeropuerto", addressCountry: "BO" },
  });
});

test("sin datos opcionales no se inventa nada", () => {
  const datos = datosNegocioLocal({ nombre: "TocTar", direccion: "", coordenadas: null, horarios: semanaCerrada(), whatsapp: null, correo: null, redes: {} }, "https://x");
  expect(datos).not.toHaveProperty("geo");
  expect(datos).not.toHaveProperty("telephone");
  expect(datos).not.toHaveProperty("sameAs");
});

test("el JSON no puede cerrar la etiqueta script", () => {
  expect(jsonLd({ name: "</script><script>alert(1)</script>" })).not.toContain("</script>");
});
