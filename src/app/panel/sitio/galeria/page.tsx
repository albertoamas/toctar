import type { Metadata } from "next";
import { Suspense } from "react";
import { exigirModulo } from "@/lib/sesion";
import { GaleriaPanel } from "@/modulos/sitio/componentes/galeria-panel";
import { listarGaleria, opcionesServicio } from "@/modulos/sitio/consultas";

export const metadata: Metadata = { title: "Galería" };

// HU-09: galería de antes y después. Dueño o encargado con el permiso "sitio".
export default function PaginaGaleria() {
  return (
    <Suspense fallback={<p className="text-tinta-suave">Cargando…</p>}>
      <Contenido />
    </Suspense>
  );
}

async function Contenido() {
  await exigirModulo("sitio");
  const [items, servicios] = await Promise.all([listarGaleria(), opcionesServicio()]);
  return (
    <GaleriaPanel
      servicios={servicios}
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
