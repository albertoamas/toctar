import { describe, expect, test } from "vitest";
import { erroresDe } from "@/lib/formularios";
import { formatearFecha } from "@/lib/fechas";
import { esquemaAtender, esquemaReclamo, normalizarPlaca } from "@/modulos/reclamos/esquemas";
import { LIMITE_POR_HORA, MILISEGUNDOS_MINIMOS, evaluarEnvio, mensajeAlCliente } from "@/modulos/reclamos/reglas";

// HU-16 Formulario de reclamo y HU-17. Criterios: docs/09-pruebas/criterios-entrega-1.md (16.x, 17.x).

const valido = { nombre: "Juan Pérez", telefono: "71234567", placa: "2849 xkt", servicioId: "", fechaAproximada: "", descripcion: "La capa de cerámico se ve opaca en el capó." };

describe("placa", () => {
  test.each([["2849 xkt", "2849XKT"], ["2849-XKT", "2849XKT"], [" 1234.abc ", "1234ABC"]])("%s → %s", (texto, placa) => {
    expect(normalizarPlaca(texto)).toBe(placa);
  });
  test.each(["", "AB", "2849XKT99", "28 49 X?"])("rechaza %j", (placa) => {
    expect(esquemaReclamo.safeParse({ ...valido, placa }).success).toBe(false);
  });
});

describe("esquema del reclamo", () => {
  test("normaliza el WhatsApp y la placa; lo opcional vacío queda en null", () => {
    expect(esquemaReclamo.parse(valido)).toMatchObject({ telefono: "59171234567", placa: "2849XKT", servicioId: null, fechaAproximada: null });
  });

  test("los obligatorios vacíos dan su error", () => {
    const r = esquemaReclamo.safeParse({ ...valido, nombre: "", telefono: "123", placa: "", descripcion: "mal" });
    expect(Object.keys(erroresDe(r.error!)).sort()).toEqual(["descripcion", "nombre", "placa", "telefono"]);
  });

  test("la fecha no puede ser futura", () => {
    const r = esquemaReclamo.safeParse({ ...valido, fechaAproximada: "2999-01-01" });
    expect(erroresDe(r.error!)).toEqual({ fechaAproximada: "La fecha no puede ser futura." });
  });
});

describe("protección contra spam", () => {
  const ahora = 1_000_000;
  const base = { trampa: "", abiertoEn: ahora - 10_000, ahora, enLaUltimaHora: 0 };

  test("una persona que tardó en llenarlo pasa", () => {
    expect(evaluarEnvio(base)).toBe("aceptar");
  });
  test("la trampa llena se descarta", () => {
    expect(evaluarEnvio({ ...base, trampa: "https://spam.example" })).toBe("descartar");
  });
  test("enviado en menos de 3 segundos, o sin la hora de apertura, se descarta", () => {
    expect(evaluarEnvio({ ...base, abiertoEn: ahora - (MILISEGUNDOS_MINIMOS - 1) })).toBe("descartar");
    expect(evaluarEnvio({ ...base, abiertoEn: null })).toBe("descartar");
  });
  test(`más de ${LIMITE_POR_HORA} por hora desde la misma conexión llega al límite`, () => {
    expect(evaluarEnvio({ ...base, enLaUltimaHora: LIMITE_POR_HORA - 1 })).toBe("aceptar");
    expect(evaluarEnvio({ ...base, enLaUltimaHora: LIMITE_POR_HORA })).toBe("limite");
  });
});

test("mensaje de WhatsApp al cliente", () => {
  expect(mensajeAlCliente("Juan", "15/10/2026")).toBe("Hola Juan, te escribimos de TocTar Detailing por el reclamo que nos dejaste el 15/10/2026.");
});

describe("marcar como atendido", () => {
  test("pide una nota de al menos 3 caracteres", () => {
    expect(erroresDe(esquemaAtender.safeParse({ id: "4", nota: " ok " }).error!)).toEqual({ nota: "Escribe qué se hizo, para el registro." });
    expect(esquemaAtender.parse({ id: "4", nota: "Se repasó el capó con pulido." })).toEqual({ id: 4, nota: "Se repasó el capó con pulido." });
  });
});

test("fecha calendario para mostrar", () => {
  expect(formatearFecha("2026-10-05")).toBe("05/10/2026");
});
