import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeftIcon } from "lucide-react";
import { Cargando } from "@/componentes/panel/cargando";
import { exigirModulo } from "@/lib/sesion";
import { FormularioNuevoServicio } from "@/modulos/sitio/componentes/formulario-nuevo-servicio";

export const metadata: Metadata = { title: "Nuevo servicio" };

// HU-07: alta de un servicio.
export default function PaginaNuevoServicio() {
  return (
    <div className="flex flex-col gap-6">
      <Link href="/panel/sitio" className="flex items-center gap-1 text-sm text-tinta-suave hover:text-tinta">
        <ChevronLeftIcon className="size-4" aria-hidden />
        Servicios
      </Link>
      <h2 className="font-heading text-3xl font-bold italic">Nuevo servicio</h2>
      <Suspense fallback={<Cargando filas={1} />}>
        <Formulario />
      </Suspense>
    </div>
  );
}

async function Formulario() {
  await exigirModulo("sitio");
  return <FormularioNuevoServicio />;
}
