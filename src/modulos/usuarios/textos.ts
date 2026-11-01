import type { Rol } from "@/lib/roles";

// Textos compartidos de la gestión de usuarios (docs/08-desarrollo/etapas/B1-acceso.md §9).

export const NOMBRE_ROL: Record<Rol, string> = { dueno: "Dueño", encargado: "Encargado", tecnico: "Técnico" };

export const DESCRIPCION_ROL: Record<Rol, string> = {
  dueno: "Todo el sistema: cotiza, configura y gestiona usuarios.",
  encargado: "Solo los módulos que marques. Nunca cambia la configuración ni el catálogo.",
  tecnico: "Solo sus órdenes de trabajo, sin precios ni pagos.",
};

export const DESCRIPCION_PERMISO: Record<string, string> = {
  sitio: "Editar servicios, textos y galería del sitio.",
  reclamos: "Ver y atender los reclamos que llegan por la página.",
  clientes: "Registrar y buscar clientes y vehículos.",
  cotizaciones: "Hacer cotizaciones y sus versiones, con sus precios y su PDF.",
  agenda: "Agendar, reprogramar y cancelar reservas.",
  ordenes: "Ver y actualizar las órdenes del taller.",
  pagos: "Registrar adelantos y saldos.",
  mantenimientos: "Avisar y agendar mantenimientos.",
  entrega_con_saldo: "Puede entregar un vehículo aunque falte pagar.",
};
