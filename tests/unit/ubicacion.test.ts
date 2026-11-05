import { describe, expect, test } from "vitest";
import {
  enlaceComoLlegar,
  ERROR_ENLACE_MAPA,
  ERROR_MAPA_INSERTADO,
  leerEnlaceMapa,
  leerMapaInsertado,
  mapaDeContacto,
  textoEnlaceMapa,
} from "@/lib/ubicacion";
import { momentoEnBolivia } from "@/lib/fechas";
import { estadoDelTaller, resumirHorariosConHoy, semanaCerrada } from "@/lib/horarios";
import { datosNegocioLocal } from "@/modulos/sitio/negocio-local";

// Pedido 38: la ficha del taller en Google Maps. Especificación: docs/08-desarrollo/etapas/P38-mapa-de-google.md §9.

// Lo que da la ficha real en Compartir → Insertar un mapa (05/11/2026)
const SRC_REAL =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3711.0170761817094!2d-64.7083413!3d-21.5461876!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xa3e6bf7ff861e7e3%3A0x123f08e793599b28!2sToctar%20detailing%20tarija!5e0!3m2!1ses!2sbo!4v1793908399991!5m2!1ses!2sbo";
const CODIGO_REAL = `<iframe src="${SRC_REAL}" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
const PIN = { lat: -21.546188, lng: -64.708341 };
const FICHA =
  "https://www.google.com/maps/place/Toctar+detailing+tarija/@-21.5461826,-64.7109162,17z/data=!3m1!4b1!4m6!3m5!1s0xa3e6bf7ff861e7e3:0x123f08e793599b28!8m2!3d-21.5461876!4d-64.7083413!16s%2Fg%2F11ntdc95q2";

describe("enlace de Google Maps", () => {
  test("el enlace corto de Compartir se guarda tal cual, sin coordenadas", () => {
    expect(leerEnlaceMapa("https://maps.app.goo.gl/AbCdEf123")).toEqual({ ok: true, valor: { enlace: "https://maps.app.goo.gl/AbCdEf123", coordenadas: null } });
  });

  test("el enlace largo de la ficha trae el pin", () => {
    expect(leerEnlaceMapa(FICHA)).toEqual({ ok: true, valor: { enlace: FICHA, coordenadas: PIN } });
  });

  test("sin https:// se completa", () => {
    const r = leerEnlaceMapa("www.google.com/maps/place/x/data=!3d-21.5355!4d-64.7296");
    expect(r).toEqual({ ok: true, valor: { enlace: "https://www.google.com/maps/place/x/data=!3d-21.5355!4d-64.7296", coordenadas: { lat: -21.5355, lng: -64.7296 } } });
  });

  test("las coordenadas solas siguen sirviendo", () => {
    expect(leerEnlaceMapa("-21.5355, -64.7296")).toEqual({ ok: true, valor: { enlace: null, coordenadas: { lat: -21.5355, lng: -64.7296 } } });
  });

  test("vacío no guarda nada", () => {
    expect(leerEnlaceMapa("  ")).toEqual({ ok: true, valor: null });
  });

  test.each([
    ["otro sitio", "https://example.com/maps/place/x"],
    ["un dominio que imita a Google", "https://google.com.example.com/maps"],
    ["http", "http://maps.app.goo.gl/AbCdEf123"],
    ["javascript:", "javascript:alert(1)"],
    ["Google sin mapas", "https://www.google.com/search?q=toctar"],
    ["con usuario", "https://x@maps.app.goo.gl/AbCdEf123"],
    ["texto suelto", "frente al surtidor"],
  ])("rechaza %s", (_, texto) => {
    expect(leerEnlaceMapa(texto)).toEqual({ ok: false, error: ERROR_ENLACE_MAPA });
  });
});

describe("mapa para la página", () => {
  test("del código de Insertar un mapa se guarda solo la dirección, con su pin", () => {
    expect(leerMapaInsertado(CODIGO_REAL)).toEqual({ ok: true, valor: { src: SRC_REAL, coordenadas: PIN } });
  });

  test("también sirve la dirección sola, y con &amp;", () => {
    expect(leerMapaInsertado(SRC_REAL)).toEqual({ ok: true, valor: { src: SRC_REAL, coordenadas: PIN } });
    expect(leerMapaInsertado(`<iframe src="https://www.google.com/maps/embed?pb=!1m2&amp;x=1"></iframe>`)).toMatchObject({ ok: true, valor: { src: "https://www.google.com/maps/embed?pb=!1m2&x=1" } });
  });

  test.each([
    ["otro sitio", `<iframe src="https://example.com/maps/embed?pb=!1m2"></iframe>`],
    ["Google sin embed", `<iframe src="https://www.google.com/maps/place/x"></iframe>`],
    ["sin pb", "https://www.google.com/maps/embed?q=x"],
    ["http", "http://www.google.com/maps/embed?pb=!1m2"],
    ["javascript:", `<iframe src="javascript:alert(1)"></iframe>`],
    ["un script", "<script>alert(1)</script>"],
  ])("rechaza %s", (_, texto) => {
    expect(leerMapaInsertado(texto)).toEqual({ ok: false, error: ERROR_MAPA_INSERTADO });
  });
});

describe("en el sitio", () => {
  const coordenadas = { lat: -21.5355, lng: -64.7296 };

  test("Cómo llegar: la ficha, si no las coordenadas, si no la dirección", () => {
    expect(enlaceComoLlegar({ enlaceMapa: "https://maps.app.goo.gl/AbC", coordenadas, direccion: "Calle 1" })).toBe("https://maps.app.goo.gl/AbC");
    expect(enlaceComoLlegar({ enlaceMapa: null, coordenadas, direccion: "Calle 1" })).toBe("https://www.google.com/maps/search/?api=1&query=-21.5355,-64.7296");
    expect(enlaceComoLlegar({ enlaceMapa: null, coordenadas: null, direccion: "Calle 1, Tarija" })).toBe("https://www.google.com/maps/search/?api=1&query=Calle%201%2C%20Tarija");
  });

  test("el mapa de Contacto: el de la ficha, si no las coordenadas, si no ninguno", () => {
    expect(mapaDeContacto({ mapaInsertado: SRC_REAL, coordenadas })).toBe(SRC_REAL);
    expect(mapaDeContacto({ mapaInsertado: null, coordenadas })).toBe("https://www.google.com/maps?q=-21.5355,-64.7296&z=16&output=embed");
    expect(mapaDeContacto({ mapaInsertado: null, coordenadas: null })).toBeNull();
  });

  test("el campo muestra el enlace o, si no hay, las coordenadas", () => {
    expect(textoEnlaceMapa("https://maps.app.goo.gl/AbC", coordenadas)).toBe("https://maps.app.goo.gl/AbC");
    expect(textoEnlaceMapa(null, coordenadas)).toBe("-21.5355, -64.7296");
    expect(textoEnlaceMapa(null, null)).toBe("");
  });

  test("los datos para Google enlazan la ficha (hasMap)", () => {
    const base = { nombre: "TocTar", direccion: "Calle 1", horarios: [], whatsapp: null, correo: null, redes: {} };
    expect(datosNegocioLocal({ ...base, coordenadas, enlaceMapa: "https://maps.app.goo.gl/AbC" }, "https://x")).toMatchObject({ hasMap: "https://maps.app.goo.gl/AbC" });
    expect(datosNegocioLocal({ ...base, coordenadas: null, enlaceMapa: null }, "https://x")).not.toHaveProperty("hasMap");
  });
});

// Pedido 38: "Abierto ahora" y el día de hoy en el horario de Contacto
describe("abierto ahora", () => {
  const manana = { desde: "08:00", hasta: "12:00" };
  const tarde = { desde: "14:00", hasta: "18:00" };
  // Lunes a viernes mañana y tarde, sábado solo mañana, domingo cerrado
  const semana = [1, 2, 3, 4, 5, 6, 7].map((dia) => ({ dia, turnos: dia <= 5 ? [manana, tarde] : dia === 6 ? [manana] : [] }));
  const a = (dia: number, hhmm: string) => ({ dia, minutos: Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3)) });

  test.each([
    ["en un turno", a(2, "10:30"), { abierto: true, detalle: "cierra a las 12:00" }],
    ["al abrir", a(2, "08:00"), { abierto: true, detalle: "cierra a las 12:00" }],
    ["justo al cerrar ya está cerrado", a(2, "12:00"), { abierto: false, detalle: "abre hoy a las 14:00" }],
    ["al mediodía", a(3, "13:00"), { abierto: false, detalle: "abre hoy a las 14:00" }],
    ["de noche", a(4, "20:00"), { abierto: false, detalle: "abre mañana a las 8:00" }],
    ["el sábado a la tarde", a(6, "15:00"), { abierto: false, detalle: "abre el lunes a las 8:00" }],
    ["el domingo", a(7, "10:00"), { abierto: false, detalle: "abre mañana a las 8:00" }],
  ])("%s", (_, ahora, esperado) => {
    expect(estadoDelTaller(semana, ahora)).toEqual(esperado);
  });

  test("si solo abre un día y ya pasó, abre ese día de la semana que viene", () => {
    const soloMartes = [1, 2, 3, 4, 5, 6, 7].map((dia) => ({ dia, turnos: dia === 2 ? [manana] : [] }));
    expect(estadoDelTaller(soloMartes, a(2, "13:00"))).toEqual({ abierto: false, detalle: "abre el martes a las 8:00" });
  });

  test("sin ningún turno no dice nada", () => {
    expect(estadoDelTaller(semanaCerrada(), a(2, "10:00"))).toBeNull();
  });

  test("el horario marca el grupo de hoy", () => {
    expect(resumirHorariosConHoy(semana, 3)).toEqual([
      { dias: "Lunes a viernes", horario: "8:00–12:00 y 14:00–18:00", hoy: true },
      { dias: "Sábado", horario: "8:00–12:00", hoy: false },
      { dias: "Domingo", horario: "cerrado", hoy: false },
    ]);
  });

  test("la hora de Bolivia: UTC menos 4", () => {
    // Martes 03:30 UTC = lunes 23:30 en Bolivia
    expect(momentoEnBolivia(new Date("2026-11-03T03:30:00Z"))).toEqual({ dia: 1, minutos: 23 * 60 + 30 });
    expect(momentoEnBolivia(new Date("2026-11-08T14:05:00Z"))).toEqual({ dia: 7, minutos: 10 * 60 + 5 });
  });
});
