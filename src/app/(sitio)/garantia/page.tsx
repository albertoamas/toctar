import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { WhatsAppFijo } from "@/componentes/sitio/whatsapp";
import { FormularioReclamo } from "@/modulos/reclamos/componentes/formulario-reclamo";
import { serviciosPublicos } from "@/modulos/sitio/publico";

export const metadata: Metadata = {
  title: "Garantía y reclamos",
  description: "Si algo no quedó como esperabas, cuéntanos y te respondemos por WhatsApp.",
};

// HU-16 Formulario de reclamo (RF-07). El reclamo queda pendiente en el panel (HU-17).
export default function PaginaGarantia() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12 md:py-20">
      <h1 className="font-heading text-[40px] leading-[44px] font-extrabold italic">Garantía y reclamos</h1>
      <p className="mt-3 mb-10 max-w-2xl text-lg leading-7 text-tinta-suave">Si algo no quedó como esperabas, cuéntanos y te respondemos por WhatsApp.</p>
      <Suspense fallback={<div className="min-h-screen" />}>
        <Formulario />
      </Suspense>
      <WhatsAppFijo />
    </section>
  );
}

async function Formulario() {
  await connection();
  // Los servicios visibles del sitio, para elegir a cuál corresponde el reclamo.
  const servicios = (await serviciosPublicos()).map((s) => ({ id: s.id, nombre: s.nombre }));
  return <FormularioReclamo servicios={servicios} />;
}
