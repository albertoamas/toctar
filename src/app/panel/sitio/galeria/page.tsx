import type { Metadata } from "next";
import { Suspense } from "react";
import { Cargando } from "@/componentes/panel/cargando";
import { exigirModulo } from "@/lib/sesion";
import { GaleriaPanel } from "@/modulos/sitio/componentes/galeria-panel";
import { listarGaleria, opcionesServicio } from "@/modulos/sitio/consultas";
import { trabajoDePortada } from "@/modulos/sitio/galeria";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";

export const metadata: Metadata = { title: "Galería" };

// HU-09: galería de antes y después. Dueño o encargado con el permiso "sitio".
export default function PaginaGaleria() {
  return (
    <>
      <EncabezadoPagina titulo="Galería" volver={{ href: "/panel/sitio", texto: "Sitio web" }} />
      <Suspense fallback={<Cargando />}>
        <Contenido />
      </Suspense>
    </>
  );
}

async function Contenido() {
  await exigirModulo("sitio");
  const [items, servicios] = await Promise.all([listarGaleria(), opcionesServicio()]);
  return (
    <GaleriaPanel
      servicios={servicios}
      // El que de verdad se ve en la portada: el elegido o, si no hay, el primero con antes de lo que se ve en el sitio
      portadaId={trabajoDePortada(items.filter((i) => i.enSitio))?.id ?? null}
      items={items.map((i) => ({
        id: i.id,
        servicioId: i.servicioId,
        servicio: i.servicio,
        descripcion: i.descripcion,
        visible: i.visible,
        enSitio: i.enSitio,
        antes: i.antes,
        despues: i.despues,
      }))}
    />
  );
}
