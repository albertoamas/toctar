import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { cn } from "cn";
import { TituloPagina } from "@/componentes/sitio/titulo-pagina";
import { Monograma } from "@/componentes/sitio/iconos-marca";
import { BotonWhatsApp, WhatsAppFijo } from "@/componentes/sitio/whatsapp";
import { contenidoPublico } from "@/modulos/sitio/publico";

export const metadata: Metadata = {
  title: "Nosotros",
  description: "Quiénes somos, cómo trabajamos y por qué elegir TocTar Detailing en Tarija.",
};

const TITULO_SECCION = "font-heading text-[28px] leading-8 font-bold italic md:text-[40px] md:leading-[44px]";

// HU-13 Nosotros (RF-02): historia, cómo trabajan y por qué elegirlos. Los textos salen del panel (HU-08).
export default function PaginaNosotros() {
  return (
    <>
      <section className="relative overflow-hidden">
        <Monograma className="pointer-events-none absolute -top-10 -right-24 w-[26rem] fill-superficie md:-right-12 md:w-[34rem]" />
        <div className="relative mx-auto max-w-6xl px-4 py-12 md:py-20">
          <TituloPagina>Nosotros</TituloPagina>
          <Suspense fallback={<div className="min-h-screen" />}>
            <Contenido />
          </Suspense>
        </div>
      </section>
      <WhatsAppFijo />
    </>
  );
}

/** `entrada`: la historia, en blanco y más grande, es por donde se empieza a leer; el resto acompaña en gris (pulido 2.5). */
function Parrafos({ texto, entrada = false }: { texto: string; entrada?: boolean }) {
  return texto
    .split(/\n\s*\n/)
    .filter(Boolean)
    .map((p, i) => (
      <p
        key={i}
        className={cn(
          "max-w-prose whitespace-pre-line",
          entrada ? "text-xl leading-8 text-tinta md:text-[22px] md:leading-9" : "text-lg leading-7 text-tinta-suave",
        )}
      >
        {p}
      </p>
    ));
}

async function Contenido() {
  await connection();
  const n = await contenidoPublico("nosotros");
  const motivos = n.por_que_elegirnos as string[];
  return (
    <div className="mt-8 flex flex-col gap-12 md:gap-20">
      <div className="flex flex-col gap-4">
        <Parrafos texto={n.historia as string} entrada />
      </div>

      <section aria-labelledby="como-trabajamos" className="flex flex-col gap-4">
        <h2 id="como-trabajamos" className={TITULO_SECCION}>Cómo trabajamos</h2>
        <Parrafos texto={n.como_trabajamos as string} />
      </section>

      <section aria-labelledby="por-que" className="flex flex-col gap-6">
        <h2 id="por-que" className={TITULO_SECCION}>Por qué elegirnos</h2>
        <ul className="grid gap-x-10 gap-y-4 md:grid-cols-2">
          {motivos.map((m) => (
            <li key={m} className="flex items-baseline gap-3 border-t border-border pt-4 text-lg">
              {/* Marca a 60°, el único ángulo de la marca */}
              <span aria-hidden className="inline-block h-3 w-2 shrink-0 -skew-x-[30deg] bg-rojo" />
              {m}
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-wrap items-center gap-4">
        <BotonWhatsApp />
        <Link href="/preguntas-frecuentes" className="tt-boton tt-boton--contorno">
          Ver las preguntas frecuentes
        </Link>
      </div>
    </div>
  );
}
