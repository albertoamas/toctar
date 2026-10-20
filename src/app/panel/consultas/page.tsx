import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { cn } from "cn";
import { PlusIcon } from "lucide-react";
import { Cargando } from "@/componentes/panel/cargando";
import { EstadoVacio } from "@/componentes/panel/estado-vacio";
import { buttonVariants } from "@/componentes/ui/button";
import { exigirModulo } from "@/lib/sesion";
import { ListaConsultas } from "@/modulos/consultas/componentes/lista-consultas";
import { listarConsultas } from "@/modulos/consultas/consultas";

export const metadata: Metadata = { title: "Consultas" };

// HU-24: las consultas abiertas, las que llevan más tiempo sin movimiento primero. Dueño o encargado con el permiso
// "consultas"; el técnico nunca (RN-12). Las pestañas por estado y los días sin movimiento llegan con HU-28.
export default function PaginaConsultas() {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading text-4xl font-extrabold italic">Consultas</h1>
        {/* Enlace con forma de botón: lleva a otra pantalla */}
        <Link href="/panel/consultas/nueva" className={cn(buttonVariants())}>
          <PlusIcon />
          Nueva consulta
        </Link>
      </div>
      <Suspense fallback={<Cargando />}>
        <Lista />
      </Suspense>
    </section>
  );
}

async function Lista() {
  await exigirModulo("consultas");
  const consultas = await listarConsultas(["consulto", "cotizado"]);
  if (consultas.length === 0) return <EstadoVacio>No hay consultas abiertas.</EstadoVacio>;
  return <ListaConsultas consultas={consultas} />;
}
