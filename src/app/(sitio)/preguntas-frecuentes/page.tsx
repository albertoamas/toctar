import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { ChevronDownIcon } from "lucide-react";
import { TituloPagina } from "@/componentes/sitio/titulo-pagina";
import { CierreWhatsApp } from "@/componentes/sitio/cierre-whatsapp";
import { WhatsAppFijo } from "@/componentes/sitio/whatsapp";
import { preguntasPublicas } from "@/modulos/sitio/publico";

export const metadata: Metadata = {
  title: "Preguntas frecuentes",
  description: "Cuánto tiempo se queda tu vehículo, cómo reservar, qué cubre la garantía y otras dudas sobre los servicios de TocTar Detailing.",
};

// HU-13 Preguntas frecuentes (RF-05). Cada una se abre y se cierra con <details>: funciona sin JavaScript.
// Llega entera, con el título: nada aparece suelto antes que el resto (pulido 2.1 y 2.5, revisión de YankoSoft).
export default function PaginaPreguntas() {
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
  const preguntas = await preguntasPublicas();
  return (
    <>
      {/* El título arranca en el mismo borde que en las demás páginas; la lista conserva un ancho cómodo de lectura */}
      <div className="mx-auto w-full max-w-6xl px-4 py-12 md:py-20">
        <TituloPagina>Preguntas frecuentes</TituloPagina>
        {preguntas.length === 0 ? (
          <p className="mt-8 text-tinta-suave">Pronto vas a ver aquí las preguntas más comunes.</p>
        ) : (
          <Lista preguntas={preguntas} />
        )}
      </div>
      <CierreWhatsApp titulo="¿No encontraste tu respuesta?" texto="Escríbenos con tu pregunta y te respondemos por WhatsApp." boton="Hacer mi pregunta" />
    </>
  );
}

function Lista({ preguntas }: { preguntas: { pregunta: string; respuesta: string }[] }) {
  return (
    <div className="mt-8 flex max-w-3xl flex-col border-b border-border">
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
