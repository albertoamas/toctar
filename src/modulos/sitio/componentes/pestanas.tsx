import { Pestanas } from "@/componentes/panel/pestanas";

// Pestañas del módulo Sitio web (especificación B3 §5). Textos y Galería se suman en HU-08 y HU-09.
export function PestanasSitio() {
  return (
    <Pestanas
      etiqueta="Secciones del sitio web"
      pestanas={[{ href: "/panel/sitio", texto: "Servicios", incluye: "/panel/sitio/servicios" }]}
    />
  );
}
