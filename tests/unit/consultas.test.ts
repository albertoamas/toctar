import { expect, test } from "vitest";
import { esquemaArchivoConsulta, esquemaConsulta, esquemaNota, esquemaVehiculoElegido } from "@/modulos/consultas/esquemas";

// C2 Consultas (HU-24): validación de la nueva consulta, la nota y los datos sueltos de quitar una foto (RF-29).

const base = { cliente: "12", vehiculo: "3", servicioId: "", canal: "whatsapp", nota: "" };

test("una consulta con cliente elegido, sin servicio ni nota", () => {
  expect(esquemaConsulta.parse(base)).toEqual({ cliente: 12, vehiculo: "3", servicioId: null, canal: "whatsapp", nota: null });
});

test("el cliente puede ser nuevo; vacío o raro pide elegirlo", () => {
  expect(esquemaConsulta.parse({ ...base, cliente: "nuevo" }).cliente).toBe("nuevo");
  for (const malo of ["", "0", "-1", "abc", "1.5"]) {
    const r = esquemaConsulta.safeParse({ ...base, cliente: malo });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]).toMatchObject({ path: ["cliente"], message: "Elige el cliente." });
  }
});

test("el vehículo elegido es un id o «otro»", () => {
  expect(esquemaVehiculoElegido.parse("7")).toBe(7);
  expect(esquemaVehiculoElegido.parse("otro")).toBe("otro");
  for (const malo of ["", "0", "nuevo"]) expect(esquemaVehiculoElegido.safeParse(malo).error?.issues[0].message).toBe("Elige el vehículo.");
});

test("el canal es WhatsApp o el taller", () => {
  expect(esquemaConsulta.parse({ ...base, canal: "taller" }).canal).toBe("taller");
  for (const malo of ["", "telefono"]) {
    expect(esquemaConsulta.safeParse({ ...base, canal: malo }).error?.issues[0].message).toBe("Elige por dónde llegó la consulta.");
  }
});

test("el servicio es opcional, pero si llega debe ser un id", () => {
  expect(esquemaConsulta.parse({ ...base, servicioId: "4" }).servicioId).toBe(4);
  expect(esquemaConsulta.safeParse({ ...base, servicioId: "x" }).error?.issues[0].message).toBe("Elige un servicio de la lista.");
});

test("la nota se recorta, vacía es null y tiene un máximo de 2000", () => {
  expect(esquemaConsulta.parse({ ...base, nota: "  rayas en el capó  " }).nota).toBe("rayas en el capó");
  expect(esquemaNota.parse({ id: "5", nota: "   " })).toEqual({ id: 5, nota: null });
  expect(esquemaNota.safeParse({ id: "5", nota: "a".repeat(2001) }).error?.issues[0].message).toBe("Hasta 2000 caracteres.");
});

test("quitar una foto recibe datos sueltos: se validan", () => {
  expect(esquemaArchivoConsulta.parse({ consultaId: 1, archivoId: 2 })).toEqual({ consultaId: 1, archivoId: 2 });
  for (const malo of [{}, { consultaId: 0, archivoId: 2 }, { consultaId: 1, archivoId: "x" }]) expect(esquemaArchivoConsulta.safeParse(malo).success).toBe(false);
});
