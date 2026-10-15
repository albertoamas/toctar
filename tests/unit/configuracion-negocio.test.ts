import { describe, expect, test } from "vitest";
import { esquemaHorarios, resumirHorarios, semanaCerrada, type DiaHorario } from "@/lib/horarios";
import { ERROR_ENLACE_CORTO, ERROR_SIN_COORDENADAS, enlaceMapa, leerUbicacion } from "@/lib/ubicacion";
import { enlaceWhatsApp, formatearWhatsApp, mensajeWhatsApp, normalizarWhatsApp, whatsAppLocal } from "@/lib/whatsapp";
import { erroresDe, esquemaNegocio, normalizarEnlaceRed } from "@/modulos/configuracion/esquemas";

// HU-04 Datos del negocio. Criterios: docs/09-pruebas/criterios-entrega-1.md (4.x).

describe("WhatsApp", () => {
  test.each(["71234567", "+591 71234567", "591-7123-4567", " 7 123 45 67 ", "(+591) 61234567"])("acepta %s", (texto) => {
    expect(normalizarWhatsApp(texto)).toMatch(/^591[67]\d{7}$/);
  });

  test.each(["7123456", "712345678", "21234567", "+54 71234567", "", "teléfono"])("rechaza %s", (texto) => {
    expect(normalizarWhatsApp(texto)).toBeNull();
  });

  test("se guarda en formato internacional y se muestra legible", () => {
    const numero = normalizarWhatsApp("+591 712 34 567")!;
    expect(numero).toBe("59171234567");
    expect(formatearWhatsApp(numero)).toBe("+591 7123 4567");
    expect(whatsAppLocal(numero)).toBe("71234567");
  });

  test("el enlace abre el chat con el mensaje escrito", () => {
    expect(enlaceWhatsApp("59171234567")).toBe("https://wa.me/59171234567");
    expect(enlaceWhatsApp("59171234567", "Hola, ¿precio del pulido?")).toBe(
      "https://wa.me/59171234567?text=Hola%2C%20%C2%BFprecio%20del%20pulido%3F",
    );
  });
});

describe("ubicación", () => {
  const taller = { lat: -21.5355, lng: -64.7296 };

  test.each([
    ["coordenadas sueltas", "-21.5355, -64.7296"],
    ["coordenadas sin espacio", "-21.5355,-64.7296"],
    ["enlace con el pin del lugar", "https://www.google.com/maps/place/TocTar/@-21.6,-64.8,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d-21.5355!4d-64.7296"],
    ["enlace de búsqueda", "https://www.google.com/maps/search/?api=1&query=-21.5355,-64.7296"],
    ["enlace con ?q=", "https://maps.google.com/?q=-21.5355,-64.7296"],
    ["enlace con @ (centro del mapa)", "https://www.google.com/maps/@-21.5355,-64.7296,18z"],
    ["enlace codificado", "https://www.google.com/maps/search/?api=1&query=-21.5355%2C-64.7296"],
  ])("lee %s", (_, texto) => {
    expect(leerUbicacion(texto)).toEqual({ ok: true, coordenadas: taller });
  });

  test("prefiere el pin del lugar al centro del mapa", () => {
    const r = leerUbicacion("https://www.google.com/maps/place/x/@-21.6,-64.8,17z/data=!3d-21.5355!4d-64.7296");
    expect(r).toEqual({ ok: true, coordenadas: taller });
  });

  test("redondea a 6 decimales (lo que guarda la base)", () => {
    expect(leerUbicacion("-21.53551234, -64.72961234")).toEqual({ ok: true, coordenadas: { lat: -21.535512, lng: -64.729612 } });
  });

  test("el enlace corto explica cómo copiar las coordenadas", () => {
    expect(leerUbicacion("https://maps.app.goo.gl/AbCdEf123")).toEqual({ ok: false, error: ERROR_ENLACE_CORTO });
  });

  test.each(["Barrio Aeropuerto", "-121.5, -64.7", "-21.5, -264.7", "https://www.google.com/maps"])("rechaza %s", (texto) => {
    expect(leerUbicacion(texto)).toEqual({ ok: false, error: ERROR_SIN_COORDENADAS });
  });

  test("arma el enlace para abrir el mapa", () => {
    expect(enlaceMapa(taller)).toBe("https://www.google.com/maps/search/?api=1&query=-21.5355,-64.7296");
  });
});

describe("horarios", () => {
  const manana = { desde: "08:00", hasta: "12:00" };
  const tarde = { desde: "14:00", hasta: "18:00" };
  const semana = (turnos: (d: number) => DiaHorario["turnos"]): DiaHorario[] =>
    semanaCerrada().map((d) => ({ ...d, turnos: turnos(d.dia) }));

  test("agrupa los días seguidos con el mismo horario", () => {
    expect(resumirHorarios(semana((d) => (d <= 6 ? [manana, tarde] : [])))).toEqual([
      { dias: "Lunes a sábado", horario: "8:00–12:00 y 14:00–18:00" },
      { dias: "Domingo", horario: "cerrado" },
    ]);
  });

  test("dos días seguidos van con 'y'; un día suelto, solo", () => {
    expect(resumirHorarios(semana((d) => (d <= 5 ? [manana, tarde] : d === 6 ? [manana] : [])))).toEqual([
      { dias: "Lunes a viernes", horario: "8:00–12:00 y 14:00–18:00" },
      { dias: "Sábado", horario: "8:00–12:00" },
      { dias: "Domingo", horario: "cerrado" },
    ]);
    expect(resumirHorarios(semana((d) => (d >= 6 ? [] : [manana])))).toEqual([
      { dias: "Lunes a viernes", horario: "8:00–12:00" },
      { dias: "Sábado y domingo", horario: "cerrado" },
    ]);
  });

  test("acepta la semana con dos turnos y días cerrados", () => {
    expect(esquemaHorarios.safeParse(semana((d) => (d <= 6 ? [manana, tarde] : []))).success).toBe(true);
  });

  test.each([
    ["un turno que termina antes de empezar", [{ desde: "12:00", hasta: "08:00" }]],
    ["turnos que se pisan", [manana, { desde: "11:00", hasta: "18:00" }]],
    ["tres turnos", [manana, tarde, { desde: "19:00", hasta: "20:00" }]],
    ["una hora mal escrita", [{ desde: "8", hasta: "12:00" }]],
  ])("rechaza %s", (_, turnos) => {
    expect(esquemaHorarios.safeParse(semana((d) => (d === 1 ? turnos : []))).success).toBe(false);
  });

  test("rechaza una semana incompleta", () => {
    expect(esquemaHorarios.safeParse(semanaCerrada().slice(0, 6)).success).toBe(false);
  });
});

describe("enlaces de redes", () => {
  test("completa https y acepta subdominios de la red", () => {
    expect(normalizarEnlaceRed("instagram", "instagram.com/toctar.detailing")).toBe("https://instagram.com/toctar.detailing");
    expect(normalizarEnlaceRed("facebook", "https://m.facebook.com/toctar")).toBe("https://m.facebook.com/toctar");
    expect(normalizarEnlaceRed("tiktok", "http://www.tiktok.com/@toctar")).toBe("https://www.tiktok.com/@toctar");
  });

  test.each([
    ["instagram", "https://facebook.com/toctar"],
    ["instagram", "https://instagram.com"],
    ["facebook", "https://facebook.com.estafa.com/toctar"],
    ["tiktok", "toctar"],
  ] as const)("rechaza en %s: %s", (red, texto) => {
    expect(normalizarEnlaceRed(red, texto)).toBeNull();
  });
});

describe("esquema del negocio", () => {
  const valido = {
    nombre: "TocTar Detailing",
    whatsapp: "71234567",
    correo: "",
    direccion: "Barrio Aeropuerto, Tarija",
    ubicacion: "",
    horarios: JSON.stringify(semanaCerrada()),
    facebook: "",
    instagram: "",
    tiktok: "",
    nit: "",
    razonSocial: "",
  };

  test("lo optativo vacío se guarda como null", () => {
    const r = esquemaNegocio.parse(valido);
    expect(r).toMatchObject({ whatsapp: "59171234567", correo: null, ubicacion: null, facebook: null, nit: null, razonSocial: null });
  });

  test("el WhatsApp y la dirección son obligatorios", () => {
    const r = esquemaNegocio.safeParse({ ...valido, whatsapp: "", direccion: "" });
    expect(r.success).toBe(false);
    expect(erroresDe(r.error!)).toMatchObject({ whatsapp: "Escribe los 8 dígitos del celular.", direccion: "Escribe la dirección del taller." });
  });

  test("los errores del horario se marcan en el día", () => {
    const dias = semanaCerrada();
    dias[2].turnos = [{ desde: "18:00", hasta: "08:00" }];
    const r = esquemaNegocio.safeParse({ ...valido, horarios: JSON.stringify(dias) });
    expect(erroresDe(r.error!)).toEqual({ "horarios.2": "El turno debe terminar después de empezar." });
  });

  test("rechaza NIT con letras y correo mal escrito", () => {
    const r = esquemaNegocio.safeParse({ ...valido, nit: "12A45", correo: "toctar@" });
    expect(Object.keys(erroresDe(r.error!)).sort()).toEqual(["correo", "nit"]);
  });
});

describe("mensaje de WhatsApp del sitio (HU-15)", () => {
  test("general o con el servicio escrito", () => {
    expect(mensajeWhatsApp()).toBe("Hola, quiero consultar por un servicio.");
    expect(mensajeWhatsApp("Pulido y nano cerámico")).toBe("Hola, quiero consultar por Pulido y nano cerámico.");
    expect(enlaceWhatsApp("59171234567", mensajeWhatsApp("Pulido de vidrios"))).toBe(
      "https://wa.me/59171234567?text=Hola%2C%20quiero%20consultar%20por%20Pulido%20de%20vidrios.",
    );
  });
});
