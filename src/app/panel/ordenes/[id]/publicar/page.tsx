import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { Cargando } from "@/componentes/panel/cargando";
import { EstadoVacio } from "@/componentes/panel/estado-vacio";
import { PaginaPanel } from "@/componentes/panel/pagina-panel";
import { exigirAccion } from "@/lib/sesion";
import { FormularioPublicar } from "@/modulos/ordenes/componentes/formulario-publicar";
import { fotosDeTrabajo, obtenerOrden, publicadaDeOrden, serviciosDeOrden } from "@/modulos/ordenes/consultas";
import { esFotoDeAntes, ETAPAS_FOTO_ANTES, puedePublicarse } from "@/modulos/ordenes/reglas";
import { conDesde, leerDesde, sinElTrabajo, volverDesde } from "@/lib/volver";

export const metadata: Metadata = { title: "Publicar en la galería" };

// HU-41: publicar en la galería del sitio las fotos de una orden entregada (RF-44). Solo el dueño (RN-01), y solo si la
// orden tiene al menos una foto de después. Las fotos se copian al sitio: las de la orden siguen privadas (RNF-05).
export default function PaginaPublicar({ params, searchParams }: PageProps<"/panel/ordenes/[id]/publicar">) {
  return (
    <PaginaPanel tipo="formulario">
      <Suspense fallback={<Cargando />}>
        <Publicar params={params} searchParams={searchParams} />
      </Suspense>
    </PaginaPanel>
  );
}

async function Publicar({ params, searchParams }: Pick<PageProps<"/panel/ordenes/[id]/publicar">, "params" | "searchParams">) {
  const usuario = await exigirAccion("publicar_en_galeria");
  const [{ id }, busqueda] = await Promise.all([params, searchParams]);
  if (!/^\d+$/.test(id)) notFound();
  const o = await obtenerOrden(Number(id), false);
  if (!o) notFound();
  const volver = `/panel/ordenes/${o.id}` as const;
  // Si ya no se publica: a la orden, con el origen de antes (pedido 43)
  const aLaOrden = conDesde(volver, sinElTrabajo(String(busqueda.volver ?? ""), o.id));
  if (o.estado !== "entregado" || (await publicadaDeOrden(o.id))) redirect(aLaOrden);
  // Recién con el acceso verificado se firman los enlaces, y solo de las fotos que se pueden elegir
  const [fotos, servicios] = await Promise.all([fotosDeTrabajo(o.id, ["despues", ...ETAPAS_FOTO_ANTES]), serviciosDeOrden(o.id, { soloActivos: true })]);
  if (!puedePublicarse(o.estado, fotos.map((f) => f.etapa))) redirect(aLaOrden);

  return (
    <>
      <EncabezadoPagina titulo={`Publicar ${o.placa}`} volver={volverDesde(busqueda.volver, { href: volver, texto: "Orden" }, usuario)}>
        Las fotos que elijas se copian a la galería del sitio; las de la orden no cambian.
      </EncabezadoPagina>
      {servicios.length === 0 ? (
        <EstadoVacio>Los servicios de esta orden ya no están en el catálogo. Súbelas desde Sitio web &gt; Galería, con otro servicio.</EstadoVacio>
      ) : (
        <FormularioPublicar id={o.id} volver={leerDesde(busqueda.volver)} despues={fotos.filter((f) => f.etapa === "despues")} antes={fotos.filter((f) => esFotoDeAntes(f.etapa))} servicios={servicios} />
      )}
    </>
  );
}
