import type { Rol } from "@/lib/roles";

// Única fuente de verdad sobre qué puede hacer cada usuario (RNF-05).
// La matriz está en docs/08-desarrollo/etapas/B1-acceso.md §5 y tests/unit/permisos.test.ts la recorre entera.
// Estas funciones son puras: el control en el servidor está en src/lib/sesion.ts (exigirModulo).

export const PERMISOS = [
  "sitio",
  "reclamos",
  "clientes",
  "consultas",
  "agenda",
  "ordenes",
  "pagos",
  "mantenimientos",
  "entrega_con_saldo",
] as const;
export type Permiso = (typeof PERMISOS)[number];

/** Grupos del menú, en su orden (C5 §0). Inicio va suelto, arriba. */
const GRUPOS = { taller: "Taller", clientes: "Clientes", sitio: "Sitio web", administracion: "Administración" } as const;
type Grupo = keyof typeof GRUPOS;

type DefinicionModulo = {
  ruta: string;
  nombre: string;
  /** Dónde va en el menú; null: suelto, arriba (Inicio). */
  grupo: Grupo | null;
  /** Permiso que habilita el módulo a un encargado; null si el encargado nunca lo tiene. */
  permisoEncargado: Permiso | null;
  /** El técnico lo ve (solo sus órdenes, RN-12). */
  tecnico: boolean;
  /** Nombre en el menú y en el inicio, si no es el del permiso (por ejemplo, "Saldos pendientes" para "Pagos"). */
  nombreMenu?: string;
  /** Nombre de la casilla del encargado en Usuarios, si el del módulo no dice todo lo que da (C5 §0). */
  nombrePermiso?: string;
};

// En el orden del menú: por grupo (GRUPOS) y, dentro de cada uno, de lo más usado a lo menos.
export const MODULOS = {
  inicio: { ruta: "/panel", nombre: "Inicio", grupo: null, permisoEncargado: null, tecnico: true },
  agenda: { ruta: "/panel/agenda", nombre: "Agenda", grupo: "taller", permisoEncargado: "agenda", tecnico: false },
  ordenes: { ruta: "/panel/ordenes", nombre: "Órdenes", grupo: "taller", permisoEncargado: "ordenes", tecnico: true },
  clientes: { ruta: "/panel/clientes", nombre: "Clientes", grupo: "clientes", permisoEncargado: "clientes", tecnico: false },
  consultas: { ruta: "/panel/consultas", nombre: "Consultas", grupo: "clientes", permisoEncargado: "consultas", tecnico: false },
  // HU-37: su pantalla es la lista de saldos; en el menú se llama por lo que muestra. La casilla dice lo que da: cobrar
  // (en la reserva, la orden y la lista) y ver montos y saldos
  pagos: {
    ruta: "/panel/pagos",
    nombre: "Pagos",
    nombreMenu: "Saldos pendientes",
    nombrePermiso: "Pagos (cobrar y ver saldos)",
    grupo: "clientes",
    permisoEncargado: "pagos",
    tecnico: false,
  },
  mantenimientos: { ruta: "/panel/mantenimientos", nombre: "Mantenimientos", grupo: "clientes", permisoEncargado: "mantenimientos", tecnico: false },
  // Llegan desde el sitio, pero atenderlos es tratar con un cliente
  reclamos: { ruta: "/panel/reclamos", nombre: "Reclamos", grupo: "clientes", permisoEncargado: "reclamos", tecnico: false },
  sitio: { ruta: "/panel/sitio", nombre: "Sitio web", grupo: "sitio", permisoEncargado: "sitio", tecnico: false },
  catalogo: { ruta: "/panel/catalogo", nombre: "Catálogo y precios", grupo: "administracion", permisoEncargado: null, tecnico: false },
  usuarios: { ruta: "/panel/usuarios", nombre: "Usuarios", grupo: "administracion", permisoEncargado: null, tecnico: false },
  configuracion: { ruta: "/panel/configuracion", nombre: "Configuración", grupo: "administracion", permisoEncargado: null, tecnico: false },
} as const satisfies Record<string, DefinicionModulo>;
export type Modulo = keyof typeof MODULOS;

/** Lo mínimo que hace falta saber de un usuario para decidir. */
export type SujetoPermisos = { rol: Rol; permisos: readonly string[] };

export function puedeVerModulo(sujeto: SujetoPermisos, modulo: Modulo): boolean {
  const def: DefinicionModulo = MODULOS[modulo];
  switch (sujeto.rol) {
    case "dueno":
      return true;
    case "tecnico":
      return def.tecnico;
    case "encargado":
      if (modulo === "inicio") return true;
      // Usuarios, configuración y catálogo no tienen permiso de encargado: aunque la base tuviera algo raro guardado,
      // se niegan (RN-01).
      return def.permisoEncargado !== null && sujeto.permisos.includes(def.permisoEncargado);
  }
}

export type Accion = "cotizar" | "entrega_con_saldo" | "recibir_vehiculo" | "extender_entrega" | "avisar_cliente" | "entregar_vehiculo" | "agregar_adicional";

/** Las acciones que pone precio: solo el dueño (RN-01). */
const SOLO_DUENO: readonly Accion[] = ["cotizar", "agregar_adicional"];

/**
 * Acciones que no son un módulo entero:
 * - cotizar (C2, dentro de la consulta) y sumar un adicional a la orden (RF-43) ponen precio: solo el dueño (RN-01);
 * - autorizar entrega con saldo (RN-13, S-2): el dueño o el encargado con ese permiso;
 * - recibir el vehículo, extender su entrega, avisarle al cliente y entregarlo (C4): el dueño o el encargado con
 *   "Órdenes", no el técnico (tocan la agenda, el trato con el cliente o el cobro, que él no ve; C4 §12, RN-12).
 */
export function puede(sujeto: SujetoPermisos, accion: Accion): boolean {
  if (sujeto.rol === "dueno") return true;
  if (sujeto.rol !== "encargado" || SOLO_DUENO.includes(accion)) return false;
  return sujeto.permisos.includes(accion === "entrega_con_saldo" ? accion : "ordenes");
}

/** El técnico solo ve las órdenes asignadas a él (RN-12, S-1); el dueño y el encargado con "Órdenes", todas. */
export function puedeVerOrden(sujeto: SujetoPermisos & { id: string }, tecnicoId: number | null): boolean {
  return sujeto.rol !== "tecnico" || tecnicoId === Number(sujeto.id);
}

/** Cómo se llama el módulo en el menú y en el inicio. */
export function nombreEnMenu(modulo: Modulo): string {
  const def: DefinicionModulo = MODULOS[modulo];
  return def.nombreMenu ?? def.nombre;
}

/** Módulos del menú del panel que la persona ve, en orden. */
export function modulosDelMenu(sujeto: SujetoPermisos): Modulo[] {
  return (Object.keys(MODULOS) as Modulo[]).filter((m) => puedeVerModulo(sujeto, m));
}

export type GrupoMenu = { titulo: string | null; modulos: Modulo[] };

/**
 * El menú en grupos (C5 §0): los módulos que la persona ve, en el orden de MODULOS. Un grupo sin módulos no aparece, y
 * uno con un solo módulo va sin título (el título no ordena nada: el técnico ve "Inicio" y "Órdenes", sin "Taller").
 */
export function menuAgrupado(sujeto: SujetoPermisos): GrupoMenu[] {
  const porGrupo: { grupo: Grupo | null; modulos: Modulo[] }[] = [];
  for (const m of modulosDelMenu(sujeto)) {
    const grupo = (MODULOS[m] as DefinicionModulo).grupo;
    const ultimo = porGrupo.at(-1);
    if (ultimo && ultimo.grupo === grupo) ultimo.modulos.push(m);
    else porGrupo.push({ grupo, modulos: [m] });
  }
  return porGrupo.map(({ grupo, modulos }) => ({ titulo: grupo && modulos.length > 1 ? GRUPOS[grupo] : null, modulos }));
}

/** Permisos que se le pueden marcar a un encargado: los de sus módulos, más entrega con saldo. */
export function permisosAsignables(): { permiso: Permiso; nombre: string }[] {
  const deModulos = (Object.keys(MODULOS) as Modulo[])
    .filter((m) => MODULOS[m].permisoEncargado !== null)
    .map((m) => {
      const def: DefinicionModulo = MODULOS[m];
      return { permiso: def.permisoEncargado as Permiso, nombre: def.nombrePermiso ?? def.nombre };
    });
  return [...deModulos, { permiso: "entrega_con_saldo", nombre: "Autorizar entrega con saldo" }];
}
