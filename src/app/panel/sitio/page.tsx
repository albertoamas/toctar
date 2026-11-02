import type { Metadata } from "next";
import { Suspense } from "react";
import { CircleHelpIcon, HouseIcon, ImagesIcon, MapPinIcon, TagIcon, UsersIcon } from "lucide-react";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { TarjetasSeccion } from "@/componentes/panel/tarjetas-seccion";
import { exigirModulo } from "@/lib/sesion";

export const metadata: Metadata = { title: "Sitio web" };

// Sitio web (pedido 26): "¿Qué quieres cambiar?" con una tarjeta por cada parte del sitio, en el orden en que se ve.
// Cada página del sitio (portada, nosotros, contacto) es su propia tarjeta: el dueño entra directo a sus textos. Dueño o
// encargado con el permiso "sitio".
export default function PaginaSitioWeb() {
  return (
    <Suspense fallback={<Cargando />}>
      <Contenido />
    </Suspense>
  );
}

async function Contenido() {
  await exigirModulo("sitio");
  return (
    <>
      <EncabezadoPagina titulo="Sitio web">¿Qué quieres cambiar?</EncabezadoPagina>
      <TarjetasSeccion
        etiqueta="Partes del sitio web"
        tarjetas={[
          { href: "/panel/sitio/textos?pagina=inicio", icono: HouseIcon, titulo: "Portada", descripcion: "El título, la frase y la foto del taller." },
          { href: "/panel/sitio/servicios", icono: TagIcon, titulo: "Servicios", descripcion: "La página de cada servicio: textos, fotos y su orden." },
          { href: "/panel/sitio/textos?pagina=nosotros", icono: UsersIcon, titulo: "Nosotros", descripcion: "La historia del taller y la foto del equipo." },
          { href: "/panel/sitio/textos?pagina=contacto", icono: MapPinIcon, titulo: "Contacto", descripcion: "El texto de la página de contacto." },
          { href: "/panel/sitio/preguntas", icono: CircleHelpIcon, titulo: "Preguntas frecuentes", descripcion: "Las preguntas y respuestas que se ven en el sitio." },
          { href: "/panel/sitio/galeria", icono: ImagesIcon, titulo: "Galería", descripcion: "Las fotos de los trabajos y cuáles van en la portada." },
        ]}
      />
    </>
  );
}
