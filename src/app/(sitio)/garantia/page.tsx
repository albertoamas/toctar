import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { TituloPagina } from "@/componentes/sitio/titulo-pagina";
import { FormularioReclamo } from "@/modulos/reclamos/componentes/formulario-reclamo";
import { serviciosPublicos } from "@/modulos/sitio/publico";
import { metadatosPagina } from "@/lib/sitio";

export const metadata: Metadata = metadatosPagina({
  titulo: "Garantía y reclamos",
  descripcion: "Respaldamos cada trabajo. Si necesitas que revisemos algo, cuéntanos y te respondemos por WhatsApp.",
  ruta: "/garantia",
});

// HU-16 Formulario de reclamo (RF-07). El reclamo queda pendiente en el panel (HU-17).
// Llega entera, con el título: nada aparece suelto antes que el resto (pulido 2.1 y 2.5, revisión de YankoSoft).
export default function PaginaGarantia() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <Contenido />
    </Suspense>
  );
}

async function Contenido() {
  await connection();
  // Los servicios visibles del sitio, para elegir a cuál corresponde el reclamo.
  const servicios = (await serviciosPublicos()).map((s) => ({ id: s.id, nombre: s.nombre }));
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12 md:py-20">
      <TituloPagina>Garantía y reclamos</TituloPagina>
      <p className="mt-3 mb-10 max-w-2xl text-lg leading-7 text-tinta-suave">Respaldamos cada trabajo. Si necesitas que revisemos algo, cuéntanos y te respondemos por WhatsApp.</p>
      <FormularioReclamo servicios={servicios} />
    </section>
  );
}
