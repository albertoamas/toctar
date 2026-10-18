import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { TituloPagina } from "@/componentes/sitio/titulo-pagina";
import { TarjetaServicio } from "@/componentes/sitio/tarjeta-servicio";
import { WhatsAppFijo } from "@/componentes/sitio/whatsapp";
import { serviciosPublicos } from "@/modulos/sitio/publico";

export const metadata: Metadata = {
  title: "Servicios",
  description: "Los servicios de detailing de TocTar Detailing en Tarija: en qué consiste cada uno y cómo lo hacemos. Escríbenos por WhatsApp para cotizar.",
};

// Todos los servicios visibles del sitio (HU-10, HU-11).
export default function PaginaServicios() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12 md:py-20">
      <TituloPagina>Servicios</TituloPagina>
      <p className="mt-3 max-w-2xl text-tinta-suave">Elige uno para ver en qué consiste y cómo lo hacemos. Para el precio, escríbenos: depende del tamaño y del estado del vehículo.</p>
      <Suspense fallback={<div className="min-h-screen" />}>
        <Lista />
      </Suspense>
      <WhatsAppFijo />
    </section>
  );
}

async function Lista() {
  await connection();
  const servicios = await serviciosPublicos();
  if (servicios.length === 0) return <p className="mt-8 text-tinta-suave">Pronto vas a ver aquí nuestros servicios.</p>;
  return (
    <ul className="mt-10 grid gap-3 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
      {servicios.map((s) => (
        <li key={s.slug} className="grid">
          <TarjetaServicio servicio={s} nivel={2} />
        </li>
      ))}
    </ul>
  );
}
