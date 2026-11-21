import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ArrowRightIcon } from "lucide-react";
import { TITULO_SECCION } from "@/componentes/sitio/titulo-pagina";
import { CierreWhatsApp } from "@/componentes/sitio/cierre-whatsapp";
import { FotoOReemplazo } from "@/componentes/sitio/foto-o-reemplazo";
import { FotoResponsiva } from "@/componentes/sitio/foto-responsiva";
import { IconoBeneficio } from "@/componentes/sitio/icono-beneficio";
import { ProbadorColores } from "@/componentes/sitio/probador-colores";
import { TarjetaServicio } from "@/componentes/sitio/tarjeta-servicio";
import { TrabajoGaleria } from "@/componentes/sitio/trabajo-galeria";
import { BotonWhatsApp, WhatsAppFijo } from "@/componentes/sitio/whatsapp";
import type { ColorServicio } from "@/db/esquema/sitio";
import type { UrlsFoto } from "@/lib/fotos";
import { obtenerDatosPublicos } from "@/modulos/configuracion/consultas";
import { servicioPublico, serviciosPublicos, type DetalleServicioPublico } from "@/modulos/sitio/publico";
import { ladosDeFotos } from "@/modulos/sitio/secciones-foto";
import { metadatosPagina } from "@/lib/sitio";

// HU-11 Página de cada servicio (RF-03): resumen, beneficios, proceso y variantes, sin precios (RN-10).
// Más simple desde la demo del 24/10 ("para tontos"): los beneficios van primero, como una fila de íconos, y las
// opciones que van de menor a mayor se ven como escalones (como el afiche del nano cerámico del dueño).
// Termina con la invitación a escribir por WhatsApp con el servicio ya escrito (HU-15).

export async function generateMetadata({ params }: PageProps<"/servicios/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const s = await servicioPublico(slug);
  if (!s) return { title: "Servicio no encontrado" };
  return metadatosPagina({ titulo: s.nombre, descripcion: s.resumen, ruta: `/servicios/${s.slug}`, imagen: s.foto });
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
  const lados = ladosDeFotos({
    proceso: s.pasos.length > 0 && !!s.fotosSecciones.proceso,
    opciones: s.variantes.length > 0 && !!s.fotosSecciones.opciones,
  });

  return (
    // Una columna que llena la pantalla: así el cierre queda pegado al pie aunque el servicio tenga poco contenido
    <article className="flex flex-1 flex-col">
      {/* Sin "‹ Servicios" arriba (pulido de Servicios, 21/11; lo había puesto el pulido 2.3): en el celular ocupaba una fila
          arriba de la foto, y ya están el menú con "Servicios" marcado, el botón atrás del navegador y "Otros servicios" */}
      {/* Pulido de Servicios (21/11): en la computadora, la foto a la derecha dentro de la misma columna que el texto, en 4:3
          y cortada a 60° del lado del texto (el ángulo de la marca) con una línea roja en el corte. Al borde de la pantalla
          quedaba descentrada en un monitor ancho y cada foto se cortaba distinto. En el celular, a todo el ancho, fundida
          con el negro de abajo, donde sube el título */}
      <header className="mx-auto w-full max-w-6xl pb-12 md:px-4 md:pt-10 md:pb-20">
        <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] md:items-center md:gap-6">
          <div className="relative aspect-[4/3] overflow-hidden bg-superficie md:order-last">
            <FotoOReemplazo foto={s.foto} alt={s.nombre} prioridad />
            <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-fondo to-transparent md:hidden" />
            {/* En 4:3, la línea a 60° de toda la altura corre el 43,3 % del ancho (0,75 × tan 30°) */}
            <div aria-hidden className="absolute inset-y-0 left-0 hidden w-[43.3%] origin-top-left -skew-x-[30deg] bg-fondo md:block" />
            <div aria-hidden className="absolute inset-y-0 left-[43.3%] hidden w-1.5 origin-top-left -skew-x-[30deg] bg-rojo md:block" />
          </div>
          <div className="relative -mt-16 flex flex-col items-start gap-5 px-4 md:mt-0 md:px-0">
            <h1 className="font-heading text-[40px] leading-[38px] md:leading-[60px] font-extrabold tracking-[-0.01em] text-balance uppercase italic md:text-[64px]">{s.nombre}</h1>
            <p className="max-w-xl text-lg leading-7 text-tinta-suave">{s.resumen}</p>
            {s.beneficios.length > 0 && <Beneficios beneficios={s.beneficios} />}
            <BotonWhatsApp texto="Consultar por este servicio" servicio={s.nombre} />
          </div>
        </div>
      </header>

      {/* Pulido de Servicios (21/11): los beneficios subieron a la portada */}
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 pb-12 md:gap-20 md:pb-24">
        {/* Pedido 56: el probador de colores, si el servicio tiene colores (el repintado de aros) */}
        {s.colores.length > 0 && (
          <div className="tt-divisor">
            <Suspense fallback={<ProbadorColores servicio={s.nombre} colores={s.colores} whatsapp={null} />}>
              <Probador servicio={s.nombre} colores={s.colores} />
            </Suspense>
          </div>
        )}
        {/* Cada sección con su foto al lado, si tiene (pedido de la demo del 24/10), alternando de lado */}
        {s.pasos.length > 0 && <Proceso pasos={s.pasos} foto={s.fotosSecciones.proceso} lado={lados.proceso} />}
        {s.variantes.length > 0 && (
          <Variantes variantes={s.variantes} escalera={s.opcionesEnEscalera} foto={s.fotosSecciones.opciones} lado={lados.opciones} />
        )}
        {/* Sus trabajos, a la vista (pulido de Servicios, 21/11: antes, un botón suelto a la galería) */}
        {s.trabajos.length > 0 && <Trabajos trabajos={s.trabajos} mas={s.masTrabajos} slug={s.slug} />}
        <Suspense fallback={null}>
          <OtrosServicios slug={s.slug} />
        </Suspense>
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

/**
 * Lo que gana el vehículo, en la portada, debajo del resumen (pulido de Servicios, 21/11: era una franja aparte, con
 * líneas, para cinco frases de dos palabras). El título queda para el lector de pantalla.
 */
function Beneficios({ beneficios }: { beneficios: DetalleServicioPublico["beneficios"] }) {
  return (
    <section aria-labelledby="beneficios-titulo">
      <h2 id="beneficios-titulo" className="sr-only">
        Qué gana tu vehículo
      </h2>
      <ul className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
        {beneficios.map((b, i) => (
          <li key={i} className="flex items-center gap-3 text-[15px] leading-5 font-semibold">
            <IconoBeneficio icono={b.icono} className="size-6 shrink-0 text-rojo" />
            {b.texto}
          </li>
        ))}
      </ul>
    </section>
  );
}

type Lado = "derecha" | "izquierda";

/**
 * Una sección con su foto al lado, si tiene (pedido de la demo del 24/10): en la computadora, dos columnas, la foto a
 * la derecha o a la izquierda (`ladosDeFotos`: se alternan entre las secciones con foto, para que la página no sea
 * una sola columna); en el celular, la foto debajo del texto. Sin foto, solo el contenido.
 */
function ConFoto({ foto, lado, children }: { foto?: UrlsFoto; lado: Lado; children: React.ReactNode }) {
  if (!foto) return children;
  return (
    <div className="grid gap-8 md:grid-cols-2 md:items-center md:gap-12">
      <div className="flex min-w-0 flex-col gap-6">{children}</div>
      <div className={lado === "izquierda" ? "md:order-first" : undefined}>
        {/* Decorativa: el texto de la sección dice lo mismo */}
        <FotoResponsiva foto={foto} alt="" sizes="(min-width: 768px) 50vw, 100vw" className="mx-auto h-auto max-h-[32rem] w-auto max-w-full" />
      </div>
    </div>
  );
}

function Proceso({ pasos, foto, lado }: { pasos: DetalleServicioPublico["pasos"]; foto?: UrlsFoto; lado: Lado }) {
  return (
    <section aria-labelledby="proceso-titulo" className="tt-divisor flex flex-col gap-8">
      <ConFoto foto={foto} lado={lado}>
        <h2 id="proceso-titulo" className={TITULO_SECCION}>Cómo lo hacemos</h2>
        {/* Con foto al lado, los pasos van en una sola columna */}
        <ol className={foto ? "grid gap-y-6" : "grid gap-x-10 gap-y-8 md:grid-cols-2 lg:grid-cols-3"}>
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
      </ConFoto>
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
function Variantes(props: { variantes: DetalleServicioPublico["variantes"]; escalera: boolean; foto?: UrlsFoto; lado: Lado }) {
  const { variantes, escalera, foto, lado } = props;
  const conDescripcion = variantes.some((v) => v.descripcion);
  const ultimo = Math.max(variantes.length - 1, 1);
  return (
    <section aria-labelledby="variantes-titulo" className="tt-divisor flex flex-col gap-6">
      <ConFoto foto={foto} lado={lado}>
        <div className="flex flex-col gap-2">
          <h2 id="variantes-titulo" className={TITULO_SECCION}>Opciones</h2>
          <p className="max-w-xl text-tinta-suave">Te ayudamos a elegir la que conviene a tu vehículo.</p>
        </div>
        {escalera ? (
          <div className="flex flex-col gap-3">
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
            {/* Qué quieren decir los escalones (pulido de Servicios, 21/11: solos parecían una barra de carga) */}
            <p className="flex items-center gap-3 text-sm text-tinta-suave">
              <span aria-hidden className="h-px flex-1 bg-border" />
              De menor a mayor
              <ArrowRightIcon aria-hidden className="size-4" />
            </p>
          </div>
        ) : (
          <ul className={conDescripcion && !foto ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3" : "flex flex-wrap gap-3"}>
            {variantes.map((v, i) => (
              <li key={i} className="flex min-w-36 flex-col gap-1 border border-border px-4 py-3">
                <span className="font-heading text-2xl font-bold italic">{v.nombre}</span>
                {v.descripcion && <span className="text-sm text-tinta-suave">{v.descripcion}</span>}
              </li>
            ))}
          </ul>
        )}
      </ConFoto>
    </section>
  );
}

/** El probador con el WhatsApp del negocio (HU-04), que sale de la configuración, nunca del código. */
async function Probador({ servicio, colores }: { servicio: string; colores: ColorServicio[] }) {
  const { whatsapp } = await obtenerDatosPublicos();
  return <ProbadorColores servicio={servicio} colores={colores} whatsapp={whatsapp} />;
}

/** Lo que ocupa un trabajo: 3 columnas desde 1024 px, 2 desde 640 y 1 en el celular (como la grilla de la Galería). */
const ANCHO_TRABAJO = "(min-width: 1152px) 368px, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw";

/** Hasta tres de sus trabajos de la galería, los antes y después primero; si hay más, "Ver todos" lleva a la galería. */
function Trabajos({ trabajos, mas, slug }: { trabajos: DetalleServicioPublico["trabajos"]; mas: boolean; slug: string }) {
  return (
    <section aria-labelledby="trabajos-titulo" className="tt-divisor flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 id="trabajos-titulo" className={TITULO_SECCION}>
          Nuestros trabajos
        </h2>
        {mas && (
          <Link href={`/galeria?servicio=${slug}`} className="font-bold text-rojo-texto underline-offset-[6px] hover:underline">
            Ver todos en la galería
          </Link>
        )}
      </div>
      <ul aria-label="Nuestros trabajos" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {trabajos.map((f, i) => (
          <li key={f.id} className="grid">
            <TrabajoGaleria foto={f} alFrente={false} sizes={ANCHO_TRABAJO} mostrarLinea={i === 0 && !!f.antes} sinEnlace />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Tres servicios más, los que siguen a este en el orden del sitio (al final, vuelve al principio). */
async function OtrosServicios({ slug }: { slug: string }) {
  const todos = await serviciosPublicos();
  const aqui = todos.findIndex((x) => x.slug === slug);
  const otros = [...todos.slice(aqui + 1), ...todos.slice(0, Math.max(aqui, 0))].slice(0, 3);
  if (otros.length === 0) return null;
  return (
    <section aria-labelledby="otros-titulo" className="tt-divisor flex flex-col gap-6">
      <h2 id="otros-titulo" className={TITULO_SECCION}>
        Otros servicios
      </h2>
      <ul className="tt-servicios-otros">
        {otros.map((x) => (
          <li key={x.slug}>
            <TarjetaServicio servicio={x} />
          </li>
        ))}
      </ul>
    </section>
  );
}
