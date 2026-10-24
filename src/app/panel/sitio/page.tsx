import type { Metadata } from "next";
import { Suspense } from "react";
import { Cargando } from "@/componentes/panel/cargando";
import { exigirModulo } from "@/lib/sesion";
import { ListaServicios } from "@/modulos/sitio/componentes/lista-servicios";
import { listarServicios } from "@/modulos/sitio/consultas";

export const metadata: Metadata = { title: "Servicios del sitio" };

// HU-07: la página de cada servicio en el sitio, en orden. Dueño o encargado con el permiso "sitio". Los servicios se
// agregan en el catálogo (lo hace el dueño: llevan precios).
export default function PaginaServicios() {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <p className="text-tinta-suave">En este orden salen en el sitio. Toca uno para editar su página. Los servicios nuevos los agrega el dueño en Catálogo y precios.</p>
      <Suspense fallback={<Cargando />}>
        <Lista />
      </Suspense>
    </div>
  );
}

async function Lista() {
  await exigirModulo("sitio");
  const servicios = await listarServicios();
  return (
    <ListaServicios
      servicios={servicios.map((s) => ({
        id: s.id,
        nombre: s.nombre,
        resumen: s.resumen,
        visible: s.visible,
        miniatura: s.foto?.miniatura ?? null,
      }))}
    />
  );
}
