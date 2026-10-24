import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { EnlaceVolver } from "@/componentes/enlace-volver";
import { CierreWhatsApp } from "@/componentes/sitio/cierre-whatsapp";
import { FotoOReemplazo } from "@/componentes/sitio/foto-o-reemplazo";
import { IconoBeneficio } from "@/componentes/sitio/icono-beneficio";
import { BotonWhatsApp, WhatsAppFijo } from "@/componentes/sitio/whatsapp";
import { servicioPublico, type DetalleServicioPublico } from "@/modulos/sitio/publico";

// HU-11 Página de cada servicio (RF-03): beneficios, descripción, proceso, variantes y fotos, sin precios (RN-10).
// Más simple desde la demo del 24/10 ("para tontos"): los beneficios van primero, como una fila de íconos, y las
// opciones que van de menor a mayor se ven como escalones (como el afiche del nano cerámico del dueño).
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
    // Una columna que llena la pantalla: así el cierre queda pegado al pie aunque el servicio tenga poco contenido
    <article className="flex flex-1 flex-col">
      <header className="mx-auto w-full max-w-6xl px-4 pt-2 pb-12 md:pt-6 md:pb-20">
        {/* Lo primero de la página: en el celular va antes de la foto, para saber dónde se está (pulido 2.3) */}
        <EnlaceVolver href="/servicios">Servicios</EnlaceVolver>
        <div className="mt-2 grid gap-8 md:mt-4 md:grid-cols-2 md:items-center">
          <div className="flex flex-col items-start gap-5">
            <h1 className="font-heading text-[40px] leading-[38px] md:leading-[60px] font-extrabold tracking-[-0.01em] text-balance uppercase italic md:text-[64px]">{s.nombre}</h1>
            <p className="max-w-xl text-lg leading-7 text-tinta-suave">{s.resumen}</p>
            <BotonWhatsApp texto="Consultar por este servicio" servicio={s.nombre} />
          </div>
          <div className="relative order-first aspect-[4/3] overflow-hidden bg-superficie md:order-last">
            <FotoOReemplazo foto={s.foto} alt={s.nombre} prioridad />
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 pb-12 md:gap-24 md:pb-24">
        {s.beneficios.length > 0 && <Beneficios beneficios={s.beneficios} />}
        {s.descripcion && <Descripcion descripcion={s.descripcion} />}
        {s.pasos.length > 0 && <Proceso pasos={s.pasos} />}
        {s.variantes.length > 0 && <Variantes variantes={s.variantes} escalera={s.opcionesEnEscalera} />}
        {s.fotos.length > 0 && <Fotos servicio={s} />}
      </div>

      <CierreWhatsApp
        titulo="¿Cuánto sale en tu vehículo?"
        texto="Mándanos fotos y te cotizamos."
        servicio={s.nombre}
      />

      <WhatsAppFijo servicio={s.nombre} />
    </article>
  );
}

const TITULO_SECCION = "font-heading text-[28px] leading-8 font-bold italic md:text-[40px] md:leading-[44px]";

/**
 * Lo que gana el vehículo, de un vistazo: ícono y frase corta, separados por líneas finas (la fila del afiche del
 * dueño). Sin título a la vista: los íconos lo dicen; el título queda para el lector de pantalla.
 */
function Beneficios({ beneficios }: { beneficios: DetalleServicioPublico["beneficios"] }) {
  return (
    <section aria-labelledby="beneficios-titulo">
      <h2 id="beneficios-titulo" className="sr-only">Qué gana tu vehículo</h2>
      {/* En una fila con líneas entre cada uno desde 1024 px; más angosto, en grilla y solo con el borde de arriba y de abajo */}
      <ul className="grid grid-cols-2 border-y border-border sm:grid-cols-3 lg:grid-flow-col lg:grid-cols-none lg:auto-cols-fr">
        {beneficios.map((b, i) => (
          <li key={i} className="flex flex-col items-center gap-2 border-border px-3 py-5 text-center md:gap-3 md:py-6 lg:not-first:border-l">
            <IconoBeneficio icono={b.icono} className="size-8 text-rojo md:size-9" />
            <span className="max-w-48 text-sm leading-5 font-semibold text-balance">{b.texto}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Descripcion({ descripcion }: { descripcion: string }) {
  return (
    <section aria-labelledby="descripcion-titulo" className="flex flex-col gap-4">
      <h2 id="descripcion-titulo" className={TITULO_SECCION}>En qué consiste</h2>
      {descripcion
        .split(/\n\s*\n/)
        .filter(Boolean)
        .map((parrafo, i) => (
          <p key={i} className="max-w-prose leading-relaxed whitespace-pre-line text-tinta-suave">{parrafo}</p>
        ))}
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
              {p.detalle && <p className="text-sm leading-[22px] text-tinta-suave">{p.detalle}</p>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/**
 * Las opciones. Si van de menor a mayor (casilla del panel), como escalones: cada una lleva una capa (blanca, sobre la
 * base gris del vehículo) más gruesa que la anterior, la idea del afiche del nano cerámico ("a más años, más gruesa la
 * capa"); en la computadora, columnas que suben; en el celular, filas con la capa como barra que se alarga.
 * Si no, recuadros: si alguna tiene descripción, todas van del mismo ancho (si no, la que tiene texto quedaba ancha y
 * las demás chicas, en renglones disparejos, pulido 2.3).
 */
function Variantes({ variantes, escalera }: { variantes: DetalleServicioPublico["variantes"]; escalera: boolean }) {
  const conDescripcion = variantes.some((v) => v.descripcion);
  const ultimo = Math.max(variantes.length - 1, 1);
  return (
    <section aria-labelledby="variantes-titulo" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 id="variantes-titulo" className={TITULO_SECCION}>Opciones</h2>
        <p className="max-w-xl text-tinta-suave">{escalera && "De menor a mayor. "}Te ayudamos a elegir la que conviene a tu vehículo.</p>
      </div>
      {escalera ? (
        <ol className="grid gap-4 md:grid-flow-col md:auto-cols-fr md:items-end md:gap-3">
          {variantes.map((v, i) => (
            <li key={i} className="tt-escalon" style={{ "--paso": i / ultimo } as React.CSSProperties}>
              <span className="flex flex-col gap-1">
                <span className="font-heading text-2xl leading-7 font-bold italic">{v.nombre}</span>
                {v.descripcion && <span className="text-sm text-tinta-suave">{v.descripcion}</span>}
              </span>
              <span aria-hidden className="tt-escalon__capa" />
            </li>
          ))}
        </ol>
      ) : (
        <ul className={conDescripcion ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3" : "flex flex-wrap gap-3"}>
          {variantes.map((v, i) => (
            <li key={i} className="flex min-w-36 flex-col gap-1 border border-border px-4 py-3">
              <span className="font-heading text-2xl font-bold italic">{v.nombre}</span>
              {v.descripcion && <span className="text-sm text-tinta-suave">{v.descripcion}</span>}
            </li>
          ))}
        </ul>
      )}
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
