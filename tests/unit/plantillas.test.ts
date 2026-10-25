import { expect, test } from "vitest";
import { erroresDe } from "@/lib/formularios";
import { armarMensaje, camposDesconocidos, esquemaPlantilla, PLANTILLAS, plantillasVigentes } from "@/modulos/configuracion/plantillas";
import { mensajeDeEjemplo } from "@/modulos/ordenes/mensajes";

// HU-40: los mensajes de WhatsApp editables. Especificación: docs/08-desarrollo/etapas/C5-cierre-entrega-2.md §6 y §9.

const valores = { nombre: "Juan", vehiculo: "Toyota Corolla (placa 1234ABC)", negocio: "TocTar Detailing", saldo: "Saldo pendiente: 350 Bs." };

test("reemplaza todos los campos", () => {
  expect(armarMensaje(PLANTILLAS.listo.original, valores)).toBe(
    "Hola Juan, tu Toyota Corolla (placa 1234ABC) ya está listo en TocTar Detailing. Saldo pendiente: 350 Bs. Te esperamos en el taller.",
  );
});

test("un campo vacío se va con un espacio de al lado", () => {
  expect(armarMensaje(PLANTILLAS.listo.original, { ...valores, nombre: " " })).toMatch(/^Hola, tu Toyota/);
  expect(armarMensaje(PLANTILLAS.listo.original, { ...valores, saldo: "" })).toBe(
    "Hola Juan, tu Toyota Corolla (placa 1234ABC) ya está listo en TocTar Detailing. Te esperamos en el taller.",
  );
  // Al empezar una línea o el mensaje, se va el espacio de después
  expect(armarMensaje("{saldo} Te esperamos.\n{saldo} Gracias.", { saldo: "" })).toBe("Te esperamos.\nGracias.");
  // Después de un campo con valor no queda un espacio suelto antes del signo
  expect(armarMensaje("Hola {nombre} {saldo}, chau", { nombre: "Ana", saldo: "" })).toBe("Hola Ana, chau");
  expect(armarMensaje("Listo en {negocio} {saldo}.", { negocio: "TocTar", saldo: "" })).toBe("Listo en TocTar.");
  expect(armarMensaje("Hola {nombre} {saldo}, chau", { nombre: "", saldo: "" })).toBe("Hola, chau");
});

test("un campo repetido se reemplaza las dos veces; uno que no está en los valores queda como está", () => {
  expect(armarMensaje("{nombre}, {nombre}!", { nombre: "Ana" })).toBe("Ana, Ana!");
  expect(armarMensaje("{nombre} {nombre} listo", { nombre: "" })).toBe("listo");
  expect(armarMensaje("Hola {cliente}", { nombre: "Ana" })).toBe("Hola {cliente}");
});

test("encuentra los campos que no son del mensaje, sin repetir", () => {
  const { campos } = PLANTILLAS.listo;
  expect(camposDesconocidos(PLANTILLAS.listo.original, campos)).toEqual([]);
  expect(camposDesconocidos("Hola {precio} y {fecha} y {precio} {nombre}", campos)).toEqual(["precio", "fecha"]);
  // Con espacios o sin cerrar no es un campo
  expect(camposDesconocidos("{ nombre } {nombre", campos)).toEqual([]);
  // {monto} es del mensaje de saldo, no del de listo
  expect(camposDesconocidos("Debe {monto}", campos)).toEqual(["monto"]);
});

test("el esquema pide texto, hasta 1000 caracteres y solo con los campos de ese mensaje", () => {
  const errores = (clave: string, texto: string) => {
    const r = esquemaPlantilla.safeParse({ clave, texto });
    return r.success ? null : erroresDe(r.error);
  };
  expect(errores("listo", "   ")).toEqual({ texto: "Escribe el mensaje." });
  expect(errores("listo", "a".repeat(1001))).toEqual({ texto: "Hasta 1000 caracteres." });
  expect(errores("listo", "Hola {precio}")).toEqual({
    texto: "{precio} no es un campo de este mensaje. Usa: {nombre}, {vehiculo}, {negocio}, {saldo}.",
  });
  expect(errores("saldo", "{precio} {fecha}")).toEqual({
    texto: "{precio} y {fecha} no son campos de este mensaje. Usa: {nombre}, {vehiculo}, {negocio}, {monto}.",
  });
  expect(errores("otro", "Hola")).toEqual({ clave: "Ese mensaje no existe. Recarga la página." });
  // Solo campos: con el cliente al día, el mensaje saldría en blanco
  expect(errores("listo", " {saldo} {nombre}. ")).toEqual({ texto: "Escribe algo más que campos: si quedan vacíos, el mensaje sale en blanco." });
  // Los caracteres se cuentan como en la base: un emoji es uno
  expect(errores("listo", `Hola ${"🚗".repeat(999)}`)).toEqual({ texto: "Hasta 1000 caracteres." });
  expect(errores("listo", "🚗".repeat(1000))).toBeNull();
  // Los saltos de línea del área de texto (\r\n) se guardan como \n
  expect(esquemaPlantilla.parse({ clave: "mantenimiento", texto: " Hola {nombre}\r\n¿Vienes? " })).toEqual({ clave: "mantenimiento", texto: "Hola {nombre}\n¿Vienes?" });
});

test("vale la guardada si la hay; si no, la original", () => {
  expect(plantillasVigentes([{ clave: "saldo", texto: "Debes {monto}" }])).toEqual({
    listo: PLANTILLAS.listo.original,
    saldo: "Debes {monto}",
    mantenimiento: PLANTILLAS.mantenimiento.original,
  });
});

test("la vista previa usa datos de ejemplo y el nombre del negocio", () => {
  expect(mensajeDeEjemplo("saldo", PLANTILLAS.saldo.original, "TocTar")).toBe(
    "Hola Juan, te escribimos de TocTar por el saldo de 350 Bs del servicio de tu Toyota Corolla (placa 1234ABC). Puedes pagarlo en el taller, por QR o por transferencia.",
  );
  expect(mensajeDeEjemplo("mantenimiento", "{servicio}", "TocTar")).toBe("Nano cerámico");
});
