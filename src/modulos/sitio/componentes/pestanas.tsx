import { Pestanas } from "@/componentes/panel/pestanas";

// Pestañas del módulo Sitio web (especificación B3 §5).
export function PestanasSitio() {
  return (
    <Pestanas
      etiqueta="Secciones del sitio web"
      pestanas={[
        { href: "/panel/sitio", texto: "Servicios", incluye: "/panel/sitio/servicios" },
        { href: "/panel/sitio/textos", texto: "Textos" },
        { href: "/panel/sitio/preguntas", texto: "Preguntas frecuentes" },
        { href: "/panel/sitio/galeria", texto: "Galería" },
      ]}
    />
  );
}
