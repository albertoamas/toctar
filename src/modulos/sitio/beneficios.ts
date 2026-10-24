// Íconos de los beneficios de un servicio (pedido de la demo del 24/10: "para tontos", como la fila del afiche del
// nano cerámico). Una lista fija: el dueño elige uno por beneficio en el panel. El dibujo de cada uno está en
// src/componentes/sitio/icono-beneficio.tsx; aquí solo la clave y su nombre en el panel.

export const ICONOS_BENEFICIO = {
  listo: "Listo (genérico)",
  proteccion: "Protección",
  sol: "Sol y rayos UV",
  agua: "Agua",
  brillo: "Brillo",
  aves: "Excremento de aves",
  limpieza: "Limpieza",
  duracion: "Duración",
  visibilidad: "Visibilidad",
  calor: "Calor",
  privacidad: "Privacidad",
  luz: "Luz",
  interior: "Interior y asientos",
  aire: "Olor y aire",
  vehiculo: "Vehículo",
} as const;

export type IconoBeneficio = keyof typeof ICONOS_BENEFICIO;

export const CLAVES_ICONO = Object.keys(ICONOS_BENEFICIO) as [IconoBeneficio, ...IconoBeneficio[]];

/** El ícono de un beneficio guardado: si la clave ya no existe en la lista, el genérico. */
export function iconoDe(clave: string): IconoBeneficio {
  return Object.hasOwn(ICONOS_BENEFICIO, clave) ? (clave as IconoBeneficio) : "listo";
}
