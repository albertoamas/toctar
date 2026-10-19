import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { TituloPagina } from "@/componentes/sitio/titulo-pagina";
import { CierreWhatsApp } from "@/componentes/sitio/cierre-whatsapp";
import { TarjetaServicio } from "@/componentes/sitio/tarjeta-servicio";
import { WhatsAppFijo } from "@/componentes/sitio/whatsapp";
import { serviciosPublicos } from "@/modulos/sitio/publico";

export const metadata: Metadata = {
  title: "Servicios",
  description: "Los servicios de detailing de TocTar Detailing en Tarija: en qué consiste cada uno y cómo lo hacemos. Escríbenos por WhatsApp para cotizar.",
};

// Todos los servicios visibles del sitio (HU-10, HU-11), y un cierre para quien no sabe cuál elegir.
// Llega entera, con el título: nada aparece suelto antes que el resto (pulido 2.1 y 2.5, revisión de YankoSoft).
export default function PaginaServicios() {
  return (
    <>
      <Suspense fallback={<div className="min-h-screen" />}>
        <Contenido />
      </Suspense>
      <WhatsAppFijo />
    </>
  );
}

async function Contenido() {
  await connection();
  const servicios = await serviciosPublicos();
  return (
    <>
      <div className="mx-auto w-full max-w-6xl px-4 pt-12 pb-12 md:pt-20 md:pb-20">
        <TituloPagina>Servicios</TituloPagina>
        <p className="mt-3 max-w-2xl text-tinta-suave">Elige uno para ver en qué consiste y cómo lo hacemos. Para el precio, escríbenos: depende del tamaño y del estado del vehículo.</p>
        {servicios.length === 0 ? (
          <p className="mt-8 text-tinta-suave">Pronto vas a ver aquí nuestros servicios.</p>
        ) : (
          <ul className="mt-10 grid gap-3 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {servicios.map((s) => (
              <li key={s.slug} className="grid">
                <TarjetaServicio servicio={s} nivel={2} />
              </li>
            ))}
          </ul>
        )}
      </div>
      <CierreWhatsApp titulo="¿No sabes cuál elegir?" texto="Mándanos fotos de tu vehículo y te decimos qué conviene hacer." />
    </>
  );
}
