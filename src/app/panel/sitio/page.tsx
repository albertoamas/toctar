import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/componentes/ui/button";
import { exigirModulo } from "@/lib/sesion";
import { ListaServicios } from "@/modulos/sitio/componentes/lista-servicios";
import { listarServicios } from "@/modulos/sitio/consultas";

export const metadata: Metadata = { title: "Servicios del sitio" };

// HU-07: servicios del sitio, en orden. Dueño o encargado con el permiso "sitio".
export default function PaginaServicios() {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-tinta-suave">En este orden salen en el sitio. Toca uno para editarlo.</p>
        <Button nativeButton={false} render={<Link href="/panel/sitio/servicios/nuevo" />}>
          <PlusIcon />
          Agregar servicio
        </Button>
      </div>
      <Suspense fallback={<p className="text-tinta-suave">Cargando servicios…</p>}>
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
        variantes: s.variantes,
      }))}
    />
  );
}
