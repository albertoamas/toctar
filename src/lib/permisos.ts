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

type DefinicionModulo = {
  ruta: string;
  nombre: string;
  /** Permiso que habilita el módulo a un encargado; null si el encargado nunca lo tiene. */
  permisoEncargado: Permiso | null;
  /** El técnico lo ve (solo sus órdenes, RN-12). */
  tecnico: boolean;
  /** Ya tiene pantalla. Un módulo no construido no aparece en el menú ni en las casillas. */
  construido: boolean;
};

export const MODULOS = {
  inicio: { ruta: "/panel", nombre: "Inicio", permisoEncargado: null, tecnico: true, construido: true },
  sitio: { ruta: "/panel/sitio", nombre: "Sitio web", permisoEncargado: "sitio", tecnico: false, construido: true },
  reclamos: { ruta: "/panel/reclamos", nombre: "Reclamos", permisoEncargado: "reclamos", tecnico: false, construido: true },
  clientes: { ruta: "/panel/clientes", nombre: "Clientes", permisoEncargado: "clientes", tecnico: false, construido: false },
  consultas: { ruta: "/panel/consultas", nombre: "Consultas", permisoEncargado: "consultas", tecnico: false, construido: false },
  cotizaciones: { ruta: "/panel/cotizaciones", nombre: "Cotizaciones", permisoEncargado: null, tecnico: false, construido: false },
  agenda: { ruta: "/panel/agenda", nombre: "Agenda", permisoEncargado: "agenda", tecnico: false, construido: false },
  ordenes: { ruta: "/panel/ordenes", nombre: "Órdenes", permisoEncargado: "ordenes", tecnico: true, construido: false },
  pagos: { ruta: "/panel/pagos", nombre: "Pagos", permisoEncargado: "pagos", tecnico: false, construido: false },
  mantenimientos: { ruta: "/panel/mantenimientos", nombre: "Mantenimientos", permisoEncargado: "mantenimientos", tecnico: false, construido: false },
  catalogo: { ruta: "/panel/catalogo", nombre: "Catálogo y precios", permisoEncargado: null, tecnico: false, construido: true },
  usuarios: { ruta: "/panel/usuarios", nombre: "Usuarios", permisoEncargado: null, tecnico: false, construido: true },
  configuracion: { ruta: "/panel/configuracion", nombre: "Configuración", permisoEncargado: null, tecnico: false, construido: true },
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
      // Cotizaciones, usuarios, configuración y catálogo no tienen permiso de encargado:
      // aunque la base tuviera algo raro guardado, se niegan (RN-01).
      return def.permisoEncargado !== null && sujeto.permisos.includes(def.permisoEncargado);
  }
}

/** Acciones que no son un módulo entero. Hoy: autorizar entrega con saldo (RN-13, S-2). */
export function puede(sujeto: SujetoPermisos, accion: "entrega_con_saldo"): boolean {
  if (sujeto.rol === "dueno") return true;
  return sujeto.rol === "encargado" && sujeto.permisos.includes(accion);
}

/** Módulos del menú del panel, en orden, solo los que ya tienen pantalla. */
export function modulosDelMenu(sujeto: SujetoPermisos): Modulo[] {
  return (Object.keys(MODULOS) as Modulo[]).filter((m) => MODULOS[m].construido && puedeVerModulo(sujeto, m));
}

/** Permisos que se le pueden marcar a un encargado hoy (los de módulos ya construidos, más entrega con saldo). */
export function permisosAsignables(): { permiso: Permiso; nombre: string }[] {
  const deModulos = (Object.keys(MODULOS) as Modulo[])
    .filter((m) => MODULOS[m].construido && MODULOS[m].permisoEncargado !== null)
    .map((m) => ({ permiso: MODULOS[m].permisoEncargado as Permiso, nombre: MODULOS[m].nombre }));
  return [...deModulos, { permiso: "entrega_con_saldo", nombre: "Autorizar entrega con saldo" }];
}
