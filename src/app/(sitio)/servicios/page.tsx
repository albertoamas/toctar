import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { TituloPagina } from "@/componentes/sitio/titulo-pagina";
import { CierreWhatsApp } from "@/componentes/sitio/cierre-whatsapp";
import { TarjetaServicio } from "@/componentes/sitio/tarjeta-servicio";
import { WhatsAppFijo } from "@/componentes/sitio/whatsapp";
import { serviciosPublicos } from "@/modulos/sitio/publico";
import { metadatosPagina } from "@/lib/sitio";

export const metadata: Metadata = metadatosPagina({
  titulo: "Servicios",
  descripcion: "Los servicios de detailing de TocTar Detailing en Tarija: en qué consiste cada uno y cómo lo hacemos. Escríbenos por WhatsApp para cotizar.",
  ruta: "/servicios",
});

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
      <div className="mx-auto w-full max-w-6xl px-4 pt-6 pb-12 md:pt-10 md:pb-20">
        <TituloPagina>Servicios</TituloPagina>
        <p className="mt-3 max-w-2xl text-tinta-suave">Elige uno para ver qué incluye. El precio depende de tu vehículo: escríbenos y te cotizamos.</p>
        {servicios.length === 0 ? (
          <p className="mt-8 text-tinta-suave">Pronto vas a ver aquí nuestros servicios.</p>
        ) : (
          // Las fotos como protagonistas (pulido de Servicios, 21/11): el primero, el que el dueño pone primero, más grande
          <ul className="tt-servicios-lista mt-10">
            {servicios.map((s, i) => (
              <li key={s.slug}>
                <TarjetaServicio servicio={s} nivel={2} variante="foto" principal={i === 0} />
              </li>
            ))}
          </ul>
        )}
      </div>
      <CierreWhatsApp titulo="¿No sabes cuál elegir?" texto="Mándanos fotos de tu vehículo y te decimos qué conviene hacer." />
    </>
  );
}
