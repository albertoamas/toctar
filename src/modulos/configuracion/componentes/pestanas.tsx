import { Pestanas } from "@/componentes/panel/pestanas";

// Pestañas de Configuración (especificación B2 §5).
export function PestanasConfiguracion() {
  return (
    <Pestanas
      etiqueta="Secciones de configuración"
      pestanas={[
        { href: "/panel/configuracion", texto: "Negocio" },
        { href: "/panel/configuracion/taller", texto: "Taller" },
        { href: "/panel/configuracion/cotizaciones", texto: "Cotizaciones y mantenimiento" },
      ]}
    />
  );
}
