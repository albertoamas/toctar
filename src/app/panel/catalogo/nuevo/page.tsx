import type { Metadata } from "next";
import { Suspense } from "react";
import { EnlaceVolver } from "@/componentes/enlace-volver";
import { Cargando } from "@/componentes/panel/cargando";
import { exigirModulo } from "@/lib/sesion";
import { FormularioNuevoServicio } from "@/modulos/catalogo/componentes/formulario-nuevo-servicio";

export const metadata: Metadata = { title: "Nuevo servicio" };

// HU-19: alta de un servicio. Solo el dueño (RN-01): un servicio lleva precios.
export default function PaginaNuevoServicio() {
  return (
    <section className="flex flex-col gap-6">
      <EnlaceVolver href="/panel/catalogo">Catálogo y precios</EnlaceVolver>
      <h1 className="font-heading text-4xl font-extrabold italic">Nuevo servicio</h1>
      <Suspense fallback={<Cargando filas={1} />}>
        <Formulario />
      </Suspense>
    </section>
  );
}

async function Formulario() {
  await exigirModulo("catalogo");
  return <FormularioNuevoServicio />;
}
