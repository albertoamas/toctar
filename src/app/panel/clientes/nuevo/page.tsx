import type { Metadata } from "next";
import { Suspense } from "react";
import { EnlaceVolver } from "@/componentes/enlace-volver";
import { Cargando } from "@/componentes/panel/cargando";
import { exigirModulo } from "@/lib/sesion";
import { FormularioNuevoCliente } from "@/modulos/clientes/componentes/formulario-nuevo-cliente";
import { tamanosActivos } from "@/modulos/configuracion/consultas";

export const metadata: Metadata = { title: "Agregar cliente" };

// HU-21: registrar un cliente con su primer vehículo. Dueño o encargado con el permiso "clientes".
export default function PaginaNuevoCliente() {
  return (
    <section className="flex flex-col gap-6">
      <EnlaceVolver href="/panel/clientes">Clientes</EnlaceVolver>
      <h1 className="font-heading text-4xl font-extrabold italic">Agregar cliente</h1>
      <Suspense fallback={<Cargando />}>
        <Formulario />
      </Suspense>
    </section>
  );
}

async function Formulario() {
  await exigirModulo("clientes");
  return <FormularioNuevoCliente tamanos={await tamanosActivos()} />;
}
