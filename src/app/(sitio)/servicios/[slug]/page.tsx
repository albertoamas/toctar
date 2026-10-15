import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ChevronLeftIcon } from "lucide-react";
import { FotoOReemplazo } from "@/componentes/sitio/foto-o-reemplazo";
import { BotonWhatsApp, WhatsAppFijo } from "@/componentes/sitio/whatsapp";
import { servicioPublico, type DetalleServicioPublico } from "@/modulos/sitio/publico";

// HU-11 Página de cada servicio (RF-03): descripción, beneficios, proceso, variantes y fotos, sin precios (RN-10).
// Termina con la invitación a escribir por WhatsApp con el servicio ya escrito (HU-15).

export async function generateMetadata({ params }: PageProps<"/servicios/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const s = await servicioPublico(slug);
  if (!s) return { title: "Servicio no encontrado" };
  return {
    title: s.nombre,
    description: s.resumen,
    alternates: { canonical: `/servicios/${s.slug}` },
    openGraph: { title: `${s.nombre} · TocTar Detailing`, description: s.resumen, images: s.foto ? [s.foto.url] : undefined },
  };
}

export default function PaginaServicio({ params }: PageProps<"/servicios/[slug]">) {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <Contenido params={params} />
    </Suspense>
  );
}

async function Contenido({ params }: Pick<PageProps<"/servicios/[slug]">, "params">) {
  await connection();
  const { slug } = await params;
  const s = await servicioPublico(slug);
  if (!s) notFound();

  return (
    <article>
      <header className="mx-auto grid max-w-6xl gap-8 px-4 pt-8 pb-12 md:grid-cols-2 md:items-center md:pt-12 md:pb-20">
        <div className="flex flex-col items-start gap-5">
          <Link href="/servicios" className="flex items-center gap-1 text-sm text-tinta-suave hover:text-tinta">
            <ChevronLeftIcon className="size-4" aria-hidden />
            Servicios
          </Link>
          <h1 className="font-heading text-[40px] leading-[0.95] font-extrabold tracking-[-0.01em] text-balance uppercase italic md:text-[64px]">{s.nombre}</h1>
          <p className="max-w-xl text-lg leading-relaxed text-tinta-suave">{s.resumen}</p>
          <BotonWhatsApp texto="Consultar por este servicio" servicio={s.nombre} />
        </div>
        <div className="relative order-first aspect-[4/3] overflow-hidden bg-superficie md:order-last">
          <FotoOReemplazo foto={s.foto} alt={s.nombre} prioridad />
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 pb-12 md:gap-24 md:pb-24">
        {(s.descripcion || s.beneficios.length > 0) && <Descripcion servicio={s} />}
        {s.pasos.length > 0 && <Proceso pasos={s.pasos} />}
        {s.variantes.length > 0 && <Variantes variantes={s.variantes} />}
        {s.fotos.length > 0 && <Fotos servicio={s} />}
      </div>

      <section className="border-t border-border bg-superficie">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-5 px-4 py-12 md:py-20">
          <h2 className="font-heading text-[28px] leading-8 font-bold italic md:text-[40px] md:leading-[44px]">¿Quieres saber cuánto sale en tu vehículo?</h2>
          <p className="max-w-xl text-tinta-suave">El precio depende del tamaño y del estado de tu vehículo. Escríbenos con una foto y te damos una cotización.</p>
          <BotonWhatsApp texto="Consultar por este servicio" servicio={s.nombre} />
        </div>
      </section>

      <WhatsAppFijo servicio={s.nombre} />
    </article>
  );
}

const TITULO_SECCION = "font-heading text-[28px] leading-8 font-bold italic md:text-[40px] md:leading-[44px]";

function Descripcion({ servicio: s }: { servicio: DetalleServicioPublico }) {
  return (
    <section aria-labelledby="descripcion-titulo" className="grid gap-10 md:grid-cols-2">
      <div className="flex flex-col gap-4">
        <h2 id="descripcion-titulo" className={TITULO_SECCION}>En qué consiste</h2>
        {s.descripcion
          .split(/\n\s*\n/)
          .filter(Boolean)
          .map((parrafo, i) => (
            <p key={i} className="max-w-prose leading-relaxed whitespace-pre-line text-tinta-suave">{parrafo}</p>
          ))}
      </div>
      {s.beneficios.length > 0 && (
        <div className="flex flex-col gap-4">
          <h2 className={TITULO_SECCION}>Qué gana tu vehículo</h2>
          <ul className="flex flex-col gap-3">
            {s.beneficios.map((b) => (
              <li key={b} className="flex items-baseline gap-3">
                {/* Marca a 60°, el único ángulo de la marca */}
                <span aria-hidden className="inline-block h-3 w-2 shrink-0 -skew-x-[30deg] bg-rojo" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Proceso({ pasos }: { pasos: DetalleServicioPublico["pasos"] }) {
  return (
    <section aria-labelledby="proceso-titulo" className="flex flex-col gap-8">
      <h2 id="proceso-titulo" className={TITULO_SECCION}>Cómo lo hacemos</h2>
      <ol className="grid gap-x-10 gap-y-8 md:grid-cols-2 lg:grid-cols-3">
        {pasos.map((p, i) => (
          <li key={i} className="flex gap-4 border-t border-border pt-4">
            <span aria-hidden className="font-heading text-[40px] leading-none font-extrabold text-rojo italic">{i + 1}</span>
            <div className="flex flex-col gap-1">
              <h3 className="font-semibold">{p.titulo}</h3>
              {p.detalle && <p className="text-sm leading-relaxed text-tinta-suave">{p.detalle}</p>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Variantes({ variantes }: { variantes: DetalleServicioPublico["variantes"] }) {
  return (
    <section aria-labelledby="variantes-titulo" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 id="variantes-titulo" className={TITULO_SECCION}>Opciones</h2>
        <p className="max-w-xl text-tinta-suave">Te ayudamos a elegir la que conviene a tu vehículo.</p>
      </div>
      <ul className="flex flex-wrap gap-3">
        {variantes.map((v) => (
          <li key={v.nombre} className="flex min-w-36 flex-col gap-1 border border-border px-4 py-3">
            <span className="font-heading text-2xl font-bold italic">{v.nombre}</span>
            {v.descripcion && <span className="max-w-xs text-sm text-tinta-suave">{v.descripcion}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Fotos({ servicio: s }: { servicio: DetalleServicioPublico }) {
  return (
    <section aria-labelledby="fotos-titulo" className="flex flex-col gap-6">
      <h2 id="fotos-titulo" className={TITULO_SECCION}>Trabajos de {s.nombre.toLowerCase()}</h2>
      <ul className="grid grid-cols-2 gap-2 md:grid-cols-3">
        {s.fotos.slice(0, 6).map((f) => (
          <li key={f.id} className="aspect-square overflow-hidden bg-superficie">
            <Image src={f.despues.miniatura} alt={f.descripcion} width={f.despues.ancho ?? 640} height={f.despues.alto ?? 640} unoptimized loading="lazy" className="size-full object-cover" />
          </li>
        ))}
      </ul>
      <Link href={`/galeria?servicio=${s.slug}`} className="tt-boton tt-boton--contorno self-start">
        Ver la galería
      </Link>
    </section>
  );
}
