import { expect, test } from "vitest";
import { sumarMeses } from "@/lib/fechas";
import { precioCotizadoYFinal } from "@/modulos/pagos/reglas";
import { erroresDe } from "@/lib/formularios";
import { TIPOS_DETALLE } from "@/db/esquema/trabajos";
import { esquemaAvance, esquemaDetalle, esquemaEntregar, esquemaFotoOrden, esquemaPublicar, esquemaMarcarBien, esquemaRecibir } from "@/modulos/ordenes/esquemas";
import { puede } from "@/lib/permisos";
import {
  enlaceTrabajo,
  esFotoDeAntes,
  esOrden,
  estaAtrasada,
  estadoFiltrado,
  alTocarBien,
  textoAvanceChecklist,
  textoEntrega,
  etapaAbierta,
  fechaBuscada,
  NOMBRE_DETALLE,
  NOMBRE_ETAPA,
  pasosDeOrden,
  puedeExtenderse,
  puedePublicarse,
  puedeQuitarFoto,
  puedeRecibirse,
  rutaTrabajo,
  textoSinRevisar,
  TIPOS_DE_DETALLE,
  transicionOrden,
} from "@/modulos/ordenes/reglas";

// C4 Taller y entrega (HU-33): la reserva recibida es una orden (D-1), fotos por etapa (D-6) y el técnico solo con las
// suyas (RN-12).

test("una orden es una reserva ya recibida", () => {
  expect(["recibido", "en_proceso", "listo", "entregado"].every((e) => esOrden(e as never))).toBe(true);
  expect(esOrden("agendado")).toBe(false);
  expect(esOrden("cancelado")).toBe(false);
});

test("una reserva se recibe desde su día de ingreso, si sigue agendada", () => {
  expect(puedeRecibirse({ estado: "agendado", fechaInicio: "2026-10-22" }, "2026-10-22")).toBe(true);
  // El cliente llegó tarde: se recibe igual
  expect(puedeRecibirse({ estado: "agendado", fechaInicio: "2026-10-20" }, "2026-10-22")).toBe(true);
  // Llegó antes: primero se reprograma
  expect(puedeRecibirse({ estado: "agendado", fechaInicio: "2026-10-23" }, "2026-10-22")).toBe(false);
  expect(puedeRecibirse({ estado: "cancelado", fechaInicio: "2026-10-22" }, "2026-10-22")).toBe(false);
  expect(puedeRecibirse({ estado: "recibido", fechaInicio: "2026-10-22" }, "2026-10-22")).toBe(false);
});

test("pedido 27: se suben fotos de inicio y del final mientras la orden está abierta; las de ingreso y durante, ya no", () => {
  for (const etapa of ["antes", "despues"] as const) {
    expect(etapaAbierta(etapa, "agendado")).toBe(false);
    expect(etapaAbierta(etapa, "en_proceso")).toBe(true);
    expect(etapaAbierta(etapa, "listo")).toBe(true);
    expect(etapaAbierta(etapa, "entregado")).toBe(false);
  }
  for (const etapa of ["ingreso", "durante"] as const) {
    for (const estado of ["agendado", "recibido", "en_proceso", "listo"] as const) expect(etapaAbierta(etapa, estado)).toBe(false);
  }
  expect([NOMBRE_ETAPA.antes, NOMBRE_ETAPA.despues]).toEqual(["Inicio", "Final"]);
  // Tampoco por la acción: el esquema solo acepta las dos
  expect(esquemaFotoOrden.safeParse({ trabajoId: "3", etapa: "ingreso" }).success).toBe(false);
  expect(esquemaFotoOrden.safeParse({ trabajoId: "3", etapa: "durante" }).success).toBe(false);
});

test("una foto subida por error se quita con la orden abierta (también las de durante); las de ingreso, solo al recibir", () => {
  for (const etapa of ["antes", "durante", "despues"] as const) {
    expect(puedeQuitarFoto(etapa, "en_proceso")).toBe(true);
    expect(puedeQuitarFoto(etapa, "entregado")).toBe(false);
  }
  expect(puedeQuitarFoto("ingreso", "agendado")).toBe(true);
  expect(puedeQuitarFoto("ingreso", "recibido")).toBe(false);
});

test("recibe el dueño o el encargado con Órdenes (pedido 32: el perfil Taller también)", () => {
  expect(puede({ rol: "dueno", permisos: [] }, "recibir_vehiculo")).toBe(true);
  expect(puede({ rol: "encargado", permisos: ["ordenes"] }, "recibir_vehiculo")).toBe(true);
  expect(puede({ rol: "encargado", permisos: ["agenda", "ordenes"] }, "recibir_vehiculo")).toBe(true);
  expect(puede({ rol: "encargado", permisos: ["agenda"] }, "recibir_vehiculo")).toBe(false);
});

test("recibir: observaciones de hasta 2000, sin técnico (pedido 32)", () => {
  expect(esquemaRecibir.parse({ id: "3", observaciones: "  " })).toEqual({ id: 3, observaciones: null });
  // Si llega un técnico, no pasa: no hay a quién asignar
  expect(esquemaRecibir.parse({ id: "3", tecnicoId: "5", observaciones: " Rayón en la puerta " })).toEqual({ id: 3, observaciones: "Rayón en la puerta" });
  const larga = esquemaRecibir.safeParse({ id: "3", observaciones: "x".repeat(2001) });
  expect(!larga.success && erroresDe(larga.error)).toEqual({ observaciones: "Hasta 2000 caracteres." });
});

test("una foto de la orden dice su etapa", () => {
  expect(esquemaFotoOrden.safeParse({ trabajoId: "3", etapa: "antes" }).success).toBe(true);
  expect(esquemaFotoOrden.safeParse({ trabajoId: "3", etapa: "cualquiera" }).success).toBe(false);
});

test("la orden avanza o vuelve un paso; entregar es otra cosa (HU-36)", () => {
  expect(transicionOrden("recibido", "en_proceso")).toBe(true);
  expect(transicionOrden("en_proceso", "listo")).toBe(true);
  expect(transicionOrden("en_proceso", "recibido")).toBe(true);
  expect(transicionOrden("listo", "en_proceso")).toBe(true);
  expect(transicionOrden("recibido", "listo")).toBe(false);
  expect(transicionOrden("listo", "entregado")).toBe(false);
  expect(transicionOrden("entregado", "listo")).toBe(false);
  expect(transicionOrden("agendado", "recibido")).toBe(false);
  expect(pasosDeOrden("recibido")).toEqual({ siguiente: { estado: "en_proceso", texto: "Empezar trabajo" } });
  expect(pasosDeOrden("entregado")).toEqual({});
});

test("atrasada: abierta y con la entrega ya pasada; una lista espera al cliente", () => {
  expect(estaAtrasada({ estado: "en_proceso", fechaFin: "2026-10-21" }, "2026-10-22")).toBe(true);
  expect(estaAtrasada({ estado: "recibido", fechaFin: "2026-10-22" }, "2026-10-22")).toBe(false);
  expect(estaAtrasada({ estado: "listo", fechaFin: "2026-10-01" }, "2026-10-22")).toBe(false);
});

test("extender la entrega: el dueño o el encargado con Órdenes", () => {
  expect(puede({ rol: "encargado", permisos: ["ordenes"] }, "extender_entrega")).toBe(true);
  expect(puede({ rol: "encargado", permisos: ["agenda"] }, "extender_entrega")).toBe(false);
  expect(esquemaAvance.safeParse({ id: "1", nota: "  " }).success).toBe(false);
});

test("se extiende mientras se trabaja; una lista ya liberó su espacio", () => {
  expect(puedeExtenderse("recibido")).toBe(true);
  expect(puedeExtenderse("en_proceso")).toBe(true);
  expect(puedeExtenderse("listo")).toBe(false);
  expect(puedeExtenderse("entregado")).toBe(false);
});

test("el próximo mantenimiento: meses de calendario, al último día si el mes es más corto (RN-08)", () => {
  expect(sumarMeses("2026-11-15", 3)).toBe("2027-02-15");
  expect(sumarMeses("2027-01-31", 1)).toBe("2027-02-28");
  expect(sumarMeses("2028-01-31", 1)).toBe("2028-02-29");
  expect(sumarMeses("2026-10-31", 3)).toBe("2027-01-31");
});

test("precio cotizado, adicionales y final: el descuento de la cotización una sola vez (RF-43)", () => {
  const lineas = [
    { precio: "1000.00", esAdicional: false },
    { precio: "250.50", esAdicional: true },
  ];
  expect(precioCotizadoYFinal(lineas, "100.00")).toEqual({ cotizado: "900.00", adicionales: "250.50", final: "1150.50" });
  expect(precioCotizadoYFinal([lineas[0]], "0")).toEqual({ cotizado: "1000.00", adicionales: "0.00", final: "1000.00" });
});

test("entrega y adicionales: entrega el dueño o el encargado con Órdenes; los adicionales, solo el dueño", () => {
  expect(puede({ rol: "encargado", permisos: ["ordenes"] }, "entregar_vehiculo")).toBe(true);
  expect(puede({ rol: "encargado", permisos: ["agenda"] }, "entregar_vehiculo")).toBe(false);
  expect(puede({ rol: "dueno", permisos: [] }, "agregar_adicional")).toBe(true);
  expect(puede({ rol: "encargado", permisos: ["ordenes", "pagos", "entrega_con_saldo"] }, "agregar_adicional")).toBe(false);
  // RN-13
  expect(puede({ rol: "encargado", permisos: ["ordenes"] }, "entrega_con_saldo")).toBe(false);
  expect(puede({ rol: "encargado", permisos: ["ordenes", "entrega_con_saldo"] }, "entrega_con_saldo")).toBe(true);
});

test("un trabajo se abre en su orden si ya se recibió y quien mira ve órdenes; si no, en su reserva (C5 §0)", () => {
  expect(rutaTrabajo(7, "agendado", true)).toBe("/panel/agenda/7");
  expect(rutaTrabajo(7, "cancelado", true)).toBe("/panel/agenda/7");
  for (const estado of ["recibido", "en_proceso", "listo", "entregado"] as const) {
    expect(rutaTrabajo(7, estado, true)).toBe("/panel/ordenes/7");
    expect(rutaTrabajo(7, estado, false)).toBe("/panel/agenda/7");
  }
});

test("el enlace a un trabajo dice a dónde va, y no se ofrece si quien mira no puede abrirlo", () => {
  const todo = { ordenes: true, agenda: true };
  expect(enlaceTrabajo(7, "entregado", todo)).toEqual({ href: "/panel/ordenes/7", texto: "Ver la orden" });
  expect(enlaceTrabajo(7, "agendado", todo)).toEqual({ href: "/panel/agenda/7", texto: "Ver la reserva" });
  // Sin "Órdenes", la recibida se ve como reserva; sin "Agenda" tampoco, no hay enlace
  expect(enlaceTrabajo(7, "entregado", { ordenes: false, agenda: true })).toEqual({ href: "/panel/agenda/7", texto: "Ver la reserva" });
  expect(enlaceTrabajo(7, "entregado", { ordenes: false, agenda: false })).toBeNull();
  // Con "Órdenes" y sin "Agenda": la orden sí, la reserva no
  expect(enlaceTrabajo(7, "listo", { ordenes: true, agenda: false })).toEqual({ href: "/panel/ordenes/7", texto: "Ver la orden" });
  expect(enlaceTrabajo(7, "agendado", { ordenes: true, agenda: false })).toBeNull();
});

// HU-41 (RF-44): publicar en la galería las fotos de una orden entregada. Especificación: C5-cierre-entrega-2.md §6.

test("se publica desde una orden entregada con alguna foto de después; la de antes sale del ingreso o de antes", () => {
  expect(puedePublicarse("entregado", ["ingreso", "despues"])).toBe(true);
  expect(puedePublicarse("entregado", ["ingreso", "antes"])).toBe(false);
  expect(puedePublicarse("listo", ["despues"])).toBe(false);
  expect(esFotoDeAntes("ingreso")).toBe(true);
  expect(esFotoDeAntes("antes")).toBe(true);
  expect(esFotoDeAntes("durante")).toBe(false);
  expect(esFotoDeAntes("despues")).toBe(false);
});

test("publicar pide la foto de después, la casilla y las reglas de la galería; la de antes es opcional", () => {
  const base = { id: "7", servicioId: "3", descripcion: " Pulido en una Hilux ", fotoDespues: "11", fotoAntes: "", sinPlacaNiCaras: "on" };
  expect(esquemaPublicar.parse(base)).toEqual({ id: 7, servicioId: 3, descripcion: "Pulido en una Hilux", fotoDespues: 11, fotoAntes: null, sinPlacaNiCaras: "on" });
  expect(esquemaPublicar.parse({ ...base, fotoAntes: "12" }).fotoAntes).toBe(12);
  expect(erroresDe(esquemaPublicar.safeParse({ ...base, fotoDespues: "", sinPlacaNiCaras: undefined }).error!)).toEqual({
    fotoDespues: "Elige la foto de después.",
    sinPlacaNiCaras: "Marca que en las fotos no se lee la placa ni se ve a nadie.",
  });
  expect(erroresDe(esquemaPublicar.safeParse({ ...base, descripcion: "a".repeat(141) }).error!)).toEqual({ descripcion: "Hasta 140 caracteres." });
});

// Pedido 12: el checklist de recepción.

test("un detalle pide qué tiene; con «Otro», la nota; la nota vacía es null", () => {
  const base = { trabajoId: "4", parteId: "2", tipo: "rayon", nota: "  " };
  expect(esquemaDetalle.parse(base)).toEqual({ trabajoId: 4, parteId: 2, tipo: "rayon", nota: null });
  expect(esquemaDetalle.safeParse({ ...base, tipo: "" }).error?.issues[0]).toMatchObject({ path: ["tipo"], message: "Elige qué tiene." });
  expect(esquemaDetalle.safeParse({ ...base, tipo: "abollado" }).error?.issues[0].message).toBe("Elige qué tiene.");
  expect(esquemaDetalle.safeParse({ ...base, tipo: "otro" }).error?.issues[0]).toMatchObject({ path: ["nota"], message: "Con «Otro», cuenta qué es." });
  expect(esquemaDetalle.parse({ ...base, tipo: "otro", nota: "Falta la antena" }).nota).toBe("Falta la antena");
  expect(esquemaDetalle.safeParse({ ...base, nota: "x".repeat(301) }).error?.issues[0].message).toBe("Hasta 300 caracteres.");
  // Marcar una parte bien recibe datos sueltos
  expect(esquemaMarcarBien.safeParse({ trabajoId: 1, parteId: "x" }).success).toBe(false);
});

test("los tipos de detalle se leen como en el taller, y son los de la base", () => {
  expect(TIPOS_DE_DETALLE.map((t) => NOMBRE_DETALLE[t])).toEqual(["Rayón", "Golpe", "Raspón", "Roto", "Otro"]);
  expect([...TIPOS_DE_DETALLE]).toEqual([...TIPOS_DETALLE]);
});

test("antes de recibir se dice qué partes faltan revisar", () => {
  expect(textoSinRevisar(["Capó"])).toBe("Falta revisar Capó en el checklist.");
  expect(textoSinRevisar(["Capó", "Techo"])).toBe("Faltan revisar 2 partes del checklist: Capó y Techo.");
  expect(textoSinRevisar(["A", "B", "C", "D", "E", "F"])).toBe("Faltan revisar 6 partes del checklist: A, B, C, D y 2 más.");
});

// Pedido 13: la firma del cliente al entregar.

test("se entrega con la firma y el nombre de quien recibe, o sin firma con el motivo", () => {
  const base = { id: "9", conFirma: true, firmaNombre: " Ana Pérez ", sinFirmaMotivo: "" };
  expect(esquemaEntregar.parse(base)).toMatchObject({ id: 9, conFirma: true, firmaNombre: "Ana Pérez", sinFirmaMotivo: null });
  const errores = (d: object) => {
    const r = esquemaEntregar.safeParse({ ...base, ...d });
    return r.success ? {} : erroresDe(r.error);
  };
  expect(errores({ conFirma: false })).toEqual({ firma: "Falta la firma del cliente, o marca «Entregar sin firma»." });
  expect(errores({ firmaNombre: "  " })).toEqual({ firmaNombre: "Escribe el nombre de quien recibe." });
  // Sin firma, ni la imagen ni el nombre: el motivo, de al menos 3 letras
  expect(errores({ conFirma: false, firmaNombre: "", sinFirma: "on" })).toEqual({ sinFirmaMotivo: "Cuenta por qué no firma." });
  expect(errores({ conFirma: false, firmaNombre: "", sinFirma: "on", sinFirmaMotivo: "ok" })).toEqual({ sinFirmaMotivo: "Cuenta por qué no firma." });
  expect(errores({ conFirma: false, sinFirma: "on", sinFirmaMotivo: "Retiró su hijo" })).toEqual({});
  expect(errores({ sinFirma: "on", sinFirmaMotivo: "x".repeat(301) }).sinFirmaMotivo).toBe("Hasta 300 caracteres.");
});

test("pedido 28: la búsqueda de entregadas entiende fechas como «5/10» o «5/10/2026»", () => {
  expect(fechaBuscada("5/10")).toEqual({ dia: 5, mes: 10, anio: null });
  expect(fechaBuscada(" 05-10-26 ")).toEqual({ dia: 5, mes: 10, anio: 2026 });
  expect(fechaBuscada("5/10/2026")).toEqual({ dia: 5, mes: 10, anio: 2026 });
  for (const no of ["5678ABC", "32/10", "5/13", "5", "Juan"]) expect(fechaBuscada(no)).toBeNull();
});

test("la entrega se dice como el taller: hoy, mañana, ayer o la fecha corta (pedido 26)", () => {
  expect(textoEntrega("2026-11-02", "2026-11-02")).toBe("Hoy");
  expect(textoEntrega("2026-11-03", "2026-11-02")).toBe("Mañana");
  expect(textoEntrega("2026-11-01", "2026-11-02")).toBe("Ayer");
  expect(textoEntrega("2026-11-06", "2026-11-02")).toBe("06/11");
  expect(textoEntrega("2027-01-04", "2026-12-31")).toBe("04/01/2027");
  // Fin de mes: mañana y ayer cruzan el mes
  expect(textoEntrega("2026-12-01", "2026-11-30")).toBe("Mañana");
  expect(textoEntrega("2026-10-31", "2026-11-01")).toBe("Ayer");
});

test("el filtro por estado de En el taller acepta solo los estados abiertos (pedido 26)", () => {
  expect(estadoFiltrado("recibido")).toBe("recibido");
  expect(estadoFiltrado("en_proceso")).toBe("en_proceso");
  expect(estadoFiltrado("listo")).toBe("listo");
  for (const otro of ["entregado", "agendado", "", "__proto__", undefined, ["listo"]]) expect(estadoFiltrado(otro)).toBeNull();
});

test("el checklist es un interruptor: tocar Bien en una parte bien la desmarca; si no, la marca (pedido 26)", () => {
  expect(alTocarBien("bien")).toBe("desmarcar");
  expect(alTocarBien(null)).toBe("marcar");
  // Con un detalle, "Bien" la pasa a bien (y el servidor borra la nota y la foto)
  expect(alTocarBien("detalle")).toBe("marcar");
});

test("el avance del checklist dice cuántas faltan, en singular o plural, o que están todas (pedido 26)", () => {
  expect(textoAvanceChecklist(8, 13)).toBe("Faltan 5");
  expect(textoAvanceChecklist(12, 13)).toBe("Falta 1");
  expect(textoAvanceChecklist(13, 13)).toBe("Todas revisadas");
  expect(textoAvanceChecklist(0, 0)).toBe("Todas revisadas");
});
