import type { Rol } from "@/lib/roles";

// Única fuente de verdad sobre qué puede hacer cada usuario (RNF-05).
// La matriz está en docs/08-desarrollo/etapas/B1-acceso.md §5 y tests/unit/permisos.test.ts la recorre entera.
// Estas funciones son puras: el control en el servidor está en src/lib/sesion.ts (exigirModulo).

export const PERMISOS = [
  "sitio",
  "reclamos",
  "clientes",
  "cotizaciones",
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
  /** Nombre en el menú y en el inicio, si no es el del permiso (por ejemplo, "Saldos pendientes" para "Pagos"). */
  nombreMenu?: string;
  /** Nombre de la casilla del encargado en Usuarios, si el del módulo no dice todo lo que da (C5 §0). */
  nombrePermiso?: string;
};

// Dentro de cada grupo del menú, en este orden: de lo más usado a lo menos. El orden de los grupos es el de GRUPOS.
export const MODULOS = {
  inicio: { ruta: "/panel", nombre: "Inicio", grupo: null, permisoEncargado: null },
  agenda: { ruta: "/panel/agenda", nombre: "Agenda", grupo: "taller", permisoEncargado: "agenda" },
  ordenes: { ruta: "/panel/ordenes", nombre: "Órdenes", grupo: "taller", permisoEncargado: "ordenes" },
  clientes: { ruta: "/panel/clientes", nombre: "Clientes", grupo: "clientes", permisoEncargado: "clientes" },
  // Pedido 23: la cotización directa, sin consulta antes. Pedido 24: el encargado con este permiso cotiza
  cotizaciones: {
    ruta: "/panel/cotizaciones",
    nombre: "Cotizaciones",
    nombrePermiso: "Cotizaciones (cotizar y ver precios)",
    grupo: "clientes",
    permisoEncargado: "cotizaciones",
  },
  // HU-37: su pantalla es la lista de saldos; en el menú se llama por lo que muestra. La casilla dice lo que da: cobrar
  // (en la reserva, la orden y la lista) y ver montos y saldos
  pagos: {
    ruta: "/panel/pagos",
    nombre: "Pagos",
    nombreMenu: "Saldos pendientes",
    nombrePermiso: "Pagos (cobrar y ver saldos)",
    grupo: "clientes",
    permisoEncargado: "pagos",
  },
  mantenimientos: { ruta: "/panel/mantenimientos", nombre: "Mantenimientos", grupo: "clientes", permisoEncargado: "mantenimientos" },
  // Llegan desde el sitio, pero atenderlos es tratar con un cliente
  reclamos: { ruta: "/panel/reclamos", nombre: "Reclamos", grupo: "clientes", permisoEncargado: "reclamos" },
  sitio: { ruta: "/panel/sitio", nombre: "Sitio web", grupo: "sitio", permisoEncargado: "sitio" },
  catalogo: { ruta: "/panel/catalogo", nombre: "Catálogo y precios", grupo: "administracion", permisoEncargado: null },
  usuarios: { ruta: "/panel/usuarios", nombre: "Usuarios", grupo: "administracion", permisoEncargado: null },
  configuracion: { ruta: "/panel/configuracion", nombre: "Configuración", grupo: "administracion", permisoEncargado: null },
} as const satisfies Record<string, DefinicionModulo>;
export type Modulo = keyof typeof MODULOS;

/** Lo mínimo que hace falta saber de un usuario para decidir. */
export type SujetoPermisos = { rol: Rol; permisos: readonly string[] };

export function puedeVerModulo(sujeto: SujetoPermisos, modulo: Modulo): boolean {
  const def: DefinicionModulo = MODULOS[modulo];
  switch (sujeto.rol) {
    case "dueno":
      return true;
    case "encargado":
      if (modulo === "inicio") return true;
      // Usuarios, configuración y catálogo no tienen permiso de encargado: aunque la base tuviera algo raro guardado,
      // se niegan (RN-01).
      return def.permisoEncargado !== null && sujeto.permisos.includes(def.permisoEncargado);
    default:
      // Un rol que no existe (dato viejo o raro en la base): nada
      return false;
  }
}

export type Accion =
  | "cotizar"
  | "entrega_con_saldo"
  | "recibir_vehiculo"
  | "extender_entrega"
  | "avisar_cliente"
  | "entregar_vehiculo"
  | "agregar_adicional"
  | "publicar_en_galeria";

/** Las acciones que ponen precio o publican en el sitio desde una orden: solo el dueño. */
const SOLO_DUENO: readonly Accion[] = ["agregar_adicional", "publicar_en_galeria"];

/** El permiso del encargado que habilita cada acción; las demás van con "Órdenes". */
const PERMISO_DE_ACCION: Partial<Record<Accion, Permiso>> = { cotizar: "cotizaciones", entrega_con_saldo: "entrega_con_saldo" };

/**
 * Acciones que no son un módulo entero:
 * - cotizar (pedidos 23 y 24, RN-01): el dueño o el encargado con "Cotizaciones";
 * - sumar un adicional a la orden (RF-43) pone precio en un trabajo ya acordado, y publicar en la galería las fotos de
 *   una orden (HU-41, RF-44) decide qué muestra el sitio: solo el dueño;
 * - autorizar entrega con saldo (RN-13, S-2): el dueño o el encargado con ese permiso;
 * - recibir el vehículo, extender su entrega, avisarle al cliente y entregarlo (C4): el dueño o el encargado con
 *   "Órdenes" (pedido 32: los mismos que trabajan la orden).
 */
export function puede(sujeto: SujetoPermisos, accion: Accion): boolean {
  if (sujeto.rol === "dueno") return true;
  // Solo el encargado actúa por sus permisos: un rol que no existe no puede nada
  if (sujeto.rol !== "encargado" || SOLO_DUENO.includes(accion)) return false;
  return sujeto.permisos.includes(PERMISO_DE_ACCION[accion] ?? "ordenes");
}

/** Cómo se llama el módulo en el menú y en el inicio ("Saldos pendientes" para Pagos). */
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
 * El menú en grupos (C5 §0): primero los sueltos (Inicio) y después cada grupo en el orden de GRUPOS, con los módulos
 * que la persona ve. Un grupo sin módulos no aparece, y uno con un solo módulo va sin título (el título no ordena nada:
 * con solo Órdenes se ve "Inicio" y "Órdenes", sin "Taller").
 */
export function menuAgrupado(sujeto: SujetoPermisos): GrupoMenu[] {
  const visibles = modulosDelMenu(sujeto);
  const grupos: (Grupo | null)[] = [null, ...(Object.keys(GRUPOS) as Grupo[])];
  return grupos
    .map((grupo) => ({ grupo, modulos: visibles.filter((m) => (MODULOS[m] as DefinicionModulo).grupo === grupo) }))
    .filter((b) => b.modulos.length > 0)
    .map(({ grupo, modulos }) => ({ titulo: grupo && modulos.length > 1 ? GRUPOS[grupo] : null, modulos }));
}

/**
 * Perfiles del encargado (pedido 32): atajos que marcan sus casillas en Usuarios. No se guardan: lo que se guarda son los
 * permisos, y después de elegir un perfil se puede ajustar cada casilla.
 * - Taller: recibe, trabaja, avisa y entrega los vehículos (sin ver precios ni saldos).
 * - Atención: además, trata con los clientes: los registra, les cotiza, les cobra y les avisa el mantenimiento.
 * - Todo: todos los permisos del encargado (nunca la configuración, el catálogo ni los usuarios, RN-01).
 */
const TALLER = ["agenda", "ordenes"] as const satisfies readonly Permiso[];
export const PERFILES = [
  { clave: "taller", nombre: "Taller", descripcion: "agenda y órdenes", permisos: TALLER },
  { clave: "atencion", nombre: "Atención", descripcion: "taller, clientes, cotizaciones, pagos y mantenimientos", permisos: [...TALLER, "clientes", "cotizaciones", "pagos", "mantenimientos"] },
  { clave: "todo", nombre: "Todo", descripcion: "todos los permisos", permisos: PERMISOS },
] as const satisfies readonly { clave: string; nombre: string; descripcion: string; permisos: readonly Permiso[] }[];
export type Perfil = (typeof PERFILES)[number];

/** El perfil que coincide justo con esos permisos, o null si no coincide ninguno (se ajustaron casillas). */
export function perfilDe(permisos: readonly string[]): Perfil | null {
  const marcados = new Set(permisos);
  return PERFILES.find((p) => p.permisos.length === marcados.size && p.permisos.every((x) => marcados.has(x))) ?? null;
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
