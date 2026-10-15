import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { ChevronDownIcon } from "lucide-react";
import { BotonWhatsApp, WhatsAppFijo } from "@/componentes/sitio/whatsapp";
import { preguntasPublicas } from "@/modulos/sitio/publico";

export const metadata: Metadata = {
  title: "Preguntas frecuentes",
  description: "Cuánto tiempo se queda tu vehículo, cómo reservar, qué cubre la garantía y otras dudas sobre los servicios de TocTar Detailing.",
};

// HU-13 Preguntas frecuentes (RF-05). Cada una se abre y se cierra con <details>: funciona sin JavaScript.
export default function PaginaPreguntas() {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-12 md:py-20">
      <h1 className="font-heading text-[40px] leading-[44px] font-extrabold italic">Preguntas frecuentes</h1>
      <Suspense fallback={<div className="min-h-screen" />}>
        <Lista />
      </Suspense>
      <div className="mt-10 flex flex-col items-start gap-4">
        <p className="text-tinta-suave">¿No encontraste tu respuesta?</p>
        <BotonWhatsApp />
      </div>
      <WhatsAppFijo />
    </section>
  );
}

async function Lista() {
  await connection();
  const preguntas = await preguntasPublicas();
  if (preguntas.length === 0) return <p className="mt-8 text-tinta-suave">Escríbenos por WhatsApp y te respondemos.</p>;
  return (
    <div className="mt-8 flex flex-col border-b border-border">
      {preguntas.map((p) => (
        <details key={p.pregunta} className="group border-t border-border">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-lg font-semibold [&::-webkit-details-marker]:hidden">
            {p.pregunta}
            <ChevronDownIcon className="size-5 shrink-0 text-tinta-suave group-open:rotate-180" aria-hidden />
          </summary>
          <p className="pb-6 leading-relaxed whitespace-pre-line text-tinta-suave">{p.respuesta}</p>
        </details>
      ))}
    </div>
  );
}
