import type { Metadata } from "next";
import { Suspense } from "react";
import { Cargando } from "@/componentes/panel/cargando";
import { exigirModulo } from "@/lib/sesion";
import { GaleriaPanel } from "@/modulos/sitio/componentes/galeria-panel";
import { listarGaleria, opcionesServicio } from "@/modulos/sitio/consultas";
import { trabajoDePortada } from "@/modulos/sitio/galeria";
import { galeriaPublica } from "@/modulos/sitio/publico";

export const metadata: Metadata = { title: "Galería" };

// HU-09: galería de antes y después. Dueño o encargado con el permiso "sitio".
export default function PaginaGaleria() {
  return (
    <Suspense fallback={<Cargando />}>
      <Contenido />
    </Suspense>
  );
}

async function Contenido() {
  await exigirModulo("sitio");
  const [items, servicios, publicas] = await Promise.all([listarGaleria(), opcionesServicio(), galeriaPublica()]);
  return (
    <GaleriaPanel
      servicios={servicios}
      // El que de verdad se ve en la portada: el elegido o, si no hay, el primero con antes del sitio
      portadaId={trabajoDePortada(publicas)?.id ?? null}
      items={items.map((i) => ({
        id: i.id,
        servicioId: i.servicioId,
        servicio: i.servicio,
        descripcion: i.descripcion,
        visible: i.visible,
        antes: i.antes,
        despues: i.despues,
      }))}
    />
  );
}
