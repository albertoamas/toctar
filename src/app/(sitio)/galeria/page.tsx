import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { cn } from "cn";
import { TituloPagina } from "@/componentes/sitio/titulo-pagina";
import { CierreWhatsApp } from "@/componentes/sitio/cierre-whatsapp";
import { ComparadorAntesDespues } from "@/componentes/sitio/comparador-antes-despues";
import { EnlaceTikTok } from "@/componentes/sitio/enlace-tiktok";
import { FotoResponsiva } from "@/componentes/sitio/foto-responsiva";
import { WhatsAppFijo } from "@/componentes/sitio/whatsapp";
import { obtenerDatosPublicos } from "@/modulos/configuracion/consultas";
import { agruparPorServicio, filtrarPorServicio, nombreDelTrabajo, serviciosConFotos } from "@/modulos/sitio/galeria";
import { galeriaPublica, type FotoGaleria } from "@/modulos/sitio/publico";

export const metadata: Metadata = {
  title: "Galería",
  description: "Trabajos reales de TocTar Detailing en Tarija: fotos de antes y después de cada servicio.",
};

// HU-12 Galería pública (RF-04): fotos visibles de servicios visibles, filtrables por servicio, y un cierre para
// pedir lo mismo. El filtro son enlaces (?servicio=<slug>): funciona sin JavaScript.
// Rediseño del 24/10 (pulido 2B.12): una sección por servicio; los antes y después se comparan ahí mismo (el
// comparador de la portada, sin abrir nada) y las fotos solas van a su forma natural. Sin visor ni descripciones.
// Llega entera, con el título: nada aparece suelto antes que el resto (pulido 2.1 y 2.5, revisión de YankoSoft).
export default function PaginaGaleria({ searchParams }: PageProps<"/galeria">) {
  return (
    <>
      <Suspense fallback={<div className="min-h-screen" />}>
        <Contenido searchParams={searchParams} />
      </Suspense>
      <WhatsAppFijo />
    </>
  );
}

async function Contenido({ searchParams }: Pick<PageProps<"/galeria">, "searchParams">) {
  await connection();
  const [todas, { servicio }, { redes }] = await Promise.all([galeriaPublica(), searchParams, obtenerDatosPublicos()]);
  return (
    <>
      <div className="mx-auto w-full max-w-6xl px-4 pt-12 pb-12 md:pt-20 md:pb-20">
        <TituloPagina>Galería</TituloPagina>
        <p className="mt-3 max-w-2xl text-tinta-suave">Trabajos reales del taller. En los de antes y después, arrastra la línea.</p>
        {todas.length === 0 ? (
          <p className="mt-8 text-tinta-suave">Pronto vas a ver aquí nuestros trabajos.</p>
        ) : (
          <Fotos todas={todas} elegido={typeof servicio === "string" ? servicio : undefined} />
        )}
        {/* Más trabajos, en video (pedido de la demo del 24/10) */}
        <EnlaceTikTok enlace={redes.tiktok} className="mt-8" />
      </div>
      <CierreWhatsApp titulo="¿Quieres este resultado en tu vehículo?" texto="Mándanos fotos de tu vehículo y te decimos qué conviene hacer." />
    </>
  );
}

function Fotos({ todas, elegido }: { todas: FotoGaleria[]; elegido?: string }) {
  const fotos = filtrarPorServicio(todas, elegido);
  const activo = fotos.length === todas.length ? undefined : elegido;
  const opciones = serviciosConFotos(todas);

  return (
    <div className="mt-8 flex flex-col gap-12 md:gap-16">
      {opciones.length > 1 && (
        <nav aria-label="Filtrar por servicio">
          {/* En el celular, una sola fila que se desliza de costado (de borde a borde): en varios renglones el filtro
              ocupaba 200 px antes de la primera foto (pulido 2.4). El último botón cortado avisa que hay más. */}
          <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 py-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:p-0">
            {[{ nombre: "Todos", slug: undefined }, ...opciones].map((o) => {
              const actual = o.slug === activo;
              return (
                <li key={o.slug ?? "todos"} className="shrink-0">
                  <Link
                    href={o.slug ? `/galeria?servicio=${o.slug}` : "/galeria"}
                    aria-current={actual ? "page" : undefined}
                    scroll={false}
                    className={cn(
                      "inline-flex min-h-11 items-center border px-4 text-sm font-semibold whitespace-nowrap",
                      actual ? "border-tinta bg-tinta text-fondo" : "border-input text-tinta hover:bg-superficie",
                    )}
                  >
                    {o.nombre}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
      {agruparPorServicio(fotos).map((g) => (
        <SeccionServicio key={g.servicio.slug} {...g} />
      ))}
    </div>
  );
}

const TITULO_SECCION = "font-heading text-[28px] leading-8 font-bold italic md:text-[40px] md:leading-[44px]";

/** Los trabajos de un servicio: primero los pares de antes y después, después las fotos solas. */
function SeccionServicio({ servicio, pares, solas }: ReturnType<typeof agruparPorServicio<FotoGaleria>>[number]) {
  const titulo = `galeria-${servicio.slug}`;
  return (
    <section aria-labelledby={titulo} className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6">
        <h2 id={titulo} className={TITULO_SECCION}>{servicio.nombre}</h2>
        <Link href={`/servicios/${servicio.slug}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-rojo-texto hover:underline">
          Ver el servicio
        </Link>
      </div>
      {pares.length > 0 && (
        // Todos a la misma altura (55 % de la pantalla en el celular, 26rem en la computadora) y cada uno con el ancho
        // de su forma: un vertical queda angosto y uno solo no deja media fila vacía
        <ul
          aria-label={`Antes y después de ${servicio.nombre.toLowerCase()}`}
          className="flex flex-wrap gap-x-6 gap-y-8 [--alto-comparador:55dvh] md:[--alto-comparador:26rem]"
        >
          {pares.map((f) => (
            <li key={f.id} className="w-full" style={{ maxWidth: `calc(var(--alto-comparador) * ${(f.despues.ancho ?? 4) / (f.despues.alto ?? 3)})` }}>
              {/* La ayuda ("Arrastra la línea…") va una sola vez, arriba en la página */}
              <ComparadorAntesDespues antes={f.antes} despues={f.despues} descripcion={nombreDelTrabajo(f.descripcion, servicio.nombre)} sinAyuda />
            </li>
          ))}
        </ul>
      )}
      {solas.length > 0 && (
        // A la misma altura y cada una con su forma: una fila se reparte el ancho según la proporción de cada foto
        <ul aria-label={`Fotos de ${servicio.nombre.toLowerCase()}`} className="flex flex-wrap gap-2">
          {solas.map((f) => {
            const proporcion = (f.despues.ancho ?? 4) / (f.despues.alto ?? 3);
            return (
              <li key={f.id} className="h-64 overflow-hidden bg-superficie md:h-72" style={{ flex: `${proporcion} 1 ${proporcion * 15}rem` }}>
                <FotoResponsiva
                  foto={f.despues}
                  alt={nombreDelTrabajo(f.descripcion, servicio.nombre)}
                  sizes="(min-width: 768px) 33vw, 100vw"
                  className="size-full object-cover"
                />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
