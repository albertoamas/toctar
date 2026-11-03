import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { EnlaceVolver } from "@/componentes/enlace-volver";
import { Cargando } from "@/componentes/panel/cargando";
import { EstadoVacio } from "@/componentes/panel/estado-vacio";
import { exigirAccion } from "@/lib/sesion";
import { FormularioPublicar } from "@/modulos/ordenes/componentes/formulario-publicar";
import { fotosDeTrabajo, obtenerOrden, publicadaDeOrden, serviciosDeOrden } from "@/modulos/ordenes/consultas";
import { esFotoDeAntes, ETAPAS_FOTO_ANTES, puedePublicarse } from "@/modulos/ordenes/reglas";

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
  const volver = `/panel/ordenes/${o.id}` as const;
  if (o.estado !== "entregado" || (await publicadaDeOrden(o.id))) redirect(volver);
  // Recién con el acceso verificado se firman los enlaces, y solo de las fotos que se pueden elegir
  const [fotos, servicios] = await Promise.all([fotosDeTrabajo(o.id, ["despues", ...ETAPAS_FOTO_ANTES]), serviciosDeOrden(o.id, { soloActivos: true })]);
  if (!puedePublicarse(o.estado, fotos.map((f) => f.etapa))) redirect(volver);

  return (
    <>
      <EnlaceVolver href={volver}>Orden</EnlaceVolver>
      <div className="flex flex-col gap-1">
        <h1 className="tt-titulo-pagina">Publicar {o.placa}</h1>
        <p className="text-tinta-suave">Las fotos que elijas se copian a la galería del sitio; las de la orden no cambian.</p>
      </div>
      {servicios.length === 0 ? (
        <EstadoVacio>Los servicios de esta orden ya no están en el catálogo. Súbelas desde Sitio web &gt; Galería, con otro servicio.</EstadoVacio>
      ) : (
        <FormularioPublicar id={o.id} despues={fotos.filter((f) => f.etapa === "despues")} antes={fotos.filter((f) => esFotoDeAntes(f.etapa))} servicios={servicios} />
      )}
    </>
  );
}
