import { expect, test } from "vitest";
import { esquemaArchivoConsulta, esquemaCambioEstado, esquemaConsulta, esquemaNota, esquemaPedirSubidaVideo, esquemaRegistrarVideo, esquemaVehiculoElegido } from "@/modulos/consultas/esquemas";
import { diasDesde, estadoAlReabrir, seEnfria, textoDias, textoSubidos, transicionPermitida } from "@/modulos/consultas/reglas";

// C2 Consultas (HU-24 y HU-28): validación de la nueva consulta, la nota y los datos sueltos de quitar una foto (RF-29).

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

test("videos: hasta 60 segundos (con el redondeo del navegador), 50 MB y MP4, MOV o WebM", () => {
  const pedido = { consultaId: 1, tipo: "video/mp4", bytes: 1000, duracion: 60.4 };
  expect(esquemaPedirSubidaVideo.parse(pedido).duracion).toBe(60.4);
  expect(esquemaPedirSubidaVideo.safeParse({ ...pedido, duracion: 60.6 }).error?.issues[0].message).toBe("El video puede durar hasta 60 segundos.");
  expect(esquemaPedirSubidaVideo.safeParse({ ...pedido, duracion: 0 }).success).toBe(false);
  expect(esquemaPedirSubidaVideo.safeParse({ ...pedido, bytes: 50 * 1024 * 1024 + 1 }).error?.issues[0].message).toBe("El video puede pesar hasta 50 MB.");
  expect(esquemaPedirSubidaVideo.safeParse({ ...pedido, tipo: "video/avi" }).error?.issues[0].message).toBe("El video debe ser MP4, MOV o WebM.");
  expect(esquemaPedirSubidaVideo.parse({ ...pedido, tipo: "video/quicktime" }).tipo).toBe("video/quicktime");
});

test("registrar un video solo acepta claves de consultas como las que da el servidor", () => {
  const clave = "consultas/0b6f3c1e-2a4d-4c8e-9f10-1234567890ab.webm";
  expect(esquemaRegistrarVideo.parse({ consultaId: 1, clave, duracion: 2 }).clave).toBe(clave);
  for (const mala of ["reclamos/0b6f3c1e-2a4d-4c8e-9f10-1234567890ab.webm", "consultas/../negocio/logo.webp", "consultas/x.webm", `${clave}.exe`]) {
    expect(esquemaRegistrarVideo.safeParse({ consultaId: 1, clave: mala, duracion: 2 }).success).toBe(false);
  }
});

test("el aviso de lo subido cuenta fotos y videos", () => {
  expect(textoSubidos(0, 0)).toBe("");
  expect(textoSubidos(1, 0)).toBe("Foto agregada.");
  expect(textoSubidos(3, 0)).toBe("3 fotos agregadas.");
  expect(textoSubidos(0, 1)).toBe("Video agregado.");
  expect(textoSubidos(1, 2)).toBe("1 foto y 2 videos agregados.");
});

// HU-28 Seguimiento de consultas.

test("transiciones de estado (RF-30): perder mientras está abierta, reabrir la perdida; confirmar es de C3", () => {
  expect(transicionPermitida("consulto", "cotizado")).toBe(true);
  expect(transicionPermitida("consulto", "perdido")).toBe(true);
  expect(transicionPermitida("consulto", "confirmado")).toBe(false);
  expect(transicionPermitida("cotizado", "perdido")).toBe(true);
  expect(transicionPermitida("cotizado", "cotizado")).toBe(true); // una versión nueva
  expect(transicionPermitida("cotizado", "consulto")).toBe(false);
  expect(transicionPermitida("perdido", "consulto")).toBe(true);
  expect(transicionPermitida("perdido", "cotizado")).toBe(true);
  expect(transicionPermitida("perdido", "perdido")).toBe(false);
  for (const destino of ["consulto", "cotizado", "perdido"] as const) expect(transicionPermitida("confirmado", destino)).toBe(false);
});

test("reabrir vuelve a donde estaba: cotizado si tiene cotización", () => {
  expect(estadoAlReabrir(false)).toBe("consulto");
  expect(estadoAlReabrir(true)).toBe("cotizado");
});

test("los días se cuentan por fecha de Bolivia, no por horas", () => {
  const hoy = new Date("2026-10-20T15:00:00Z"); // 11:00 en La Paz
  expect(diasDesde(new Date("2026-10-20T04:30:00Z"), hoy)).toBe(0); // 00:30 de hoy
  expect(diasDesde(new Date("2026-10-20T03:30:00Z"), hoy)).toBe(1); // 23:30 de ayer
  expect(diasDesde(new Date("2026-10-11T15:00:00Z"), hoy)).toBe(9);
  expect(diasDesde(new Date("2026-10-21T15:00:00Z"), hoy)).toBe(0); // un reloj adelantado no da negativos
  expect([0, 1, 9].map(textoDias)).toEqual(["hoy", "hace 1 día", "hace 9 días"]);
});

test("se enfría la abierta sin movimiento desde el umbral; las cerradas nunca", () => {
  expect(seEnfria("consulto", 7, 7)).toBe(true);
  expect(seEnfria("cotizado", 6, 7)).toBe(false);
  expect(seEnfria("cotizado", 30, 7)).toBe(true);
  expect(seEnfria("perdido", 30, 7)).toBe(false);
  expect(seEnfria("confirmado", 30, 7)).toBe(false);
});

test("marcar como perdida pide el motivo; con «Otro», el detalle", () => {
  expect(esquemaCambioEstado.parse({ id: "3", accion: "perder", motivo: "precio", detalle: " " })).toEqual({ id: 3, accion: "perder", motivo: "precio", detalle: null });
  expect(esquemaCambioEstado.safeParse({ id: "3", accion: "perder", motivo: "", detalle: "" }).error?.issues[0].message).toBe("Elige el motivo.");
  expect(esquemaCambioEstado.safeParse({ id: "3", accion: "perder", motivo: "otro", detalle: "" }).error?.issues[0]).toMatchObject({ path: ["detalle"], message: "Cuenta qué pasó." });
  expect(esquemaCambioEstado.safeParse({ id: "3", accion: "perder", motivo: "precio", detalle: "x".repeat(301) }).error?.issues[0].message).toBe("Hasta 300 caracteres.");
  expect(esquemaCambioEstado.parse({ id: "3", accion: "reabrir" })).toEqual({ id: 3, accion: "reabrir" });
  expect(esquemaCambioEstado.safeParse({ id: "3", accion: "borrar" }).success).toBe(false);
});
