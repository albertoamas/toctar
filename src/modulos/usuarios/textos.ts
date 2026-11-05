import type { Rol } from "@/lib/roles";

// Textos compartidos de la gestión de usuarios (docs/08-desarrollo/etapas/B1-acceso.md §9).

export const NOMBRE_ROL: Record<Rol, string> = { dueno: "Dueño", encargado: "Encargado" };

export const DESCRIPCION_ROL: Record<Rol, string> = {
  dueno: "Todo el sistema: cotiza, configura y gestiona usuarios.",
  encargado: "Lo que marques en sus permisos. Nunca cambia la configuración, el catálogo ni los usuarios.",
};

export const DESCRIPCION_PERMISO: Record<string, string> = {
  sitio: "Editar servicios, textos y galería del sitio.",
  reclamos: "Ver y atender los reclamos que llegan por la página.",
  clientes: "Registrar y buscar clientes y vehículos.",
  cotizaciones: "Hacer cotizaciones y sus versiones, con sus precios y su PDF.",
  agenda: "Reservar, reprogramar y cancelar.",
  ordenes: "Recibir los vehículos, trabajarlos, avisar que están listos y entregarlos.",
  pagos: "Registrar adelantos y saldos.",
  mantenimientos: "Avisar y agendar mantenimientos.",
  entrega_con_saldo: "Puede entregar un vehículo aunque falte pagar.",
};
