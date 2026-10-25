import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { EnlaceVolver } from "@/componentes/enlace-volver";
import { Cargando } from "@/componentes/panel/cargando";
import { exigirAccion } from "@/lib/sesion";
import { FormularioPublicar } from "@/modulos/ordenes/componentes/formulario-publicar";
import { fotosDeTrabajo, obtenerOrden, serviciosDeOrden } from "@/modulos/ordenes/consultas";
import { esFotoDeAntes, puedePublicarse } from "@/modulos/ordenes/reglas";

export const metadata: Metadata = { title: "Publicar en la galería" };

// HU-41: publicar en la galería del sitio las fotos de una orden entregada (RF-44). Solo el dueño (RN-01), y solo si la
// orden tiene al menos una foto de después. Las fotos se copian al sitio: las de la orden siguen privadas (RNF-05).
export default function PaginaPublicar({ params }: PageProps<"/panel/ordenes/[id]/publicar">) {
  return (
    <section className="flex max-w-3xl flex-col gap-6">
      <Suspense fallback={<Cargando />}>
        <Publicar params={params} />
      </Suspense>
    </section>
  );
}

async function Publicar({ params }: Pick<PageProps<"/panel/ordenes/[id]/publicar">, "params">) {
  await exigirAccion("publicar_en_galeria");
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const o = await obtenerOrden(Number(id), false);
  if (!o) notFound();
  // Recién con el acceso verificado se firman los enlaces de las fotos
  const [fotos, servicios] = await Promise.all([fotosDeTrabajo(o.id), serviciosDeOrden(o.id)]);
  if (!puedePublicarse(o.estado, fotos.map((f) => f.etapa))) redirect(`/panel/ordenes/${o.id}`);

  return (
    <>
      <EnlaceVolver href={`/panel/ordenes/${o.id}`}>Orden</EnlaceVolver>
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-4xl font-extrabold italic">Publicar {o.placa}</h1>
        <p className="text-tinta-suave">Las fotos que elijas se copian a la galería del sitio; las de la orden no cambian.</p>
      </div>
      <FormularioPublicar
        id={o.id}
        despues={fotos.filter((f) => f.etapa === "despues")}
        antes={fotos.filter((f) => esFotoDeAntes(f.etapa))}
        servicios={servicios}
      />
    </>
  );
}
