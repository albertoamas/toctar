import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { cn } from "cn";
import { TITULO_SECCION, TituloPagina } from "@/componentes/sitio/titulo-pagina";
import { CierreWhatsApp } from "@/componentes/sitio/cierre-whatsapp";
import { ComparadorAntesDespues } from "@/componentes/sitio/comparador-antes-despues";
import { EnlaceTikTok } from "@/componentes/sitio/enlace-tiktok";
import { FotoResponsiva } from "@/componentes/sitio/foto-responsiva";
import { WhatsAppFijo } from "@/componentes/sitio/whatsapp";
import { proporcionDe } from "@/lib/formato-fotos";
import { obtenerDatosPublicos } from "@/modulos/configuracion/consultas";
import { filtrarPorServicio, formaDelPar, nombreDelTrabajo, separarPares, serviciosConFotos } from "@/modulos/sitio/galeria";
import { galeriaPublica, type FotoGaleria } from "@/modulos/sitio/publico";
import { metadatosPagina } from "@/lib/sitio";

export const metadata: Metadata = metadatosPagina({
  titulo: "Galería",
  descripcion: "Trabajos reales de TocTar Detailing en Tarija: fotos de antes y después de cada servicio.",
  ruta: "/galeria",
});

// HU-12 Galería pública (RF-04): fotos visibles de servicios visibles, filtrables por servicio, y un cierre para
// pedir lo mismo. El filtro son enlaces (?servicio=<slug>): funciona sin JavaScript.
// Rediseño del 24/10 (pulido 2B.12): una vitrina pareja, todos los trabajos en el mismo recuadro de 4:3 (lo que ordena
// la página es esa repetición); los antes y después se comparan ahí mismo, sin abrir nada; debajo de cada uno, su
// servicio. Sin visor ni descripciones. El filtro, como el menú del sitio.
// Pedido 34 (03/11): dos secciones, "Antes y después" arriba (más grandes; cuadrados si las fotos son verticales, de 4:3
// si son horizontales; la línea del primero se mueve sola un momento, como en la portada) y "Más trabajos" debajo (las
// fotos sin antes); una sección vacía no aparece. Cada trabajo en su
// tarjeta, como las de servicios: franja roja a 60°, el servicio como título y "Ver el servicio".
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
  const elegido = typeof servicio === "string" ? servicio : undefined;
  return (
    <>
      <div className="mx-auto w-full max-w-6xl px-4 pt-12 pb-12 md:pt-20 md:pb-20">
        <TituloPagina>Galería</TituloPagina>
        <p className="mt-3 max-w-2xl text-tinta-suave">Trabajos reales del taller.</p>
        {todas.length === 0 ? (
          <p className="mt-8 text-tinta-suave">Pronto vas a ver aquí nuestros trabajos.</p>
        ) : (
          <Fotos todas={todas} elegido={elegido} />
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
  const { pares, solas } = separarPares(fotos);
  const tituloSolas = pares.length > 0 ? "Más trabajos" : "Trabajos";
  const activo = fotos.length === todas.length ? undefined : elegido;
  const opciones = serviciosConFotos(todas);

  return (
    <div className="mt-8 flex flex-col gap-8">
      {opciones.length > 1 && (
        <nav aria-label="Filtrar por servicio" className="border-b border-border">
          {/* Como el menú del sitio: solo texto, y el elegido con la barra roja a 60° debajo. En el celular, una sola fila
              que se desliza de costado (de borde a borde); el último cortado avisa que hay más (pulido 2.4) */}
          {/* -mb-px y pb-px: la barra del elegido se monta sobre la línea de abajo sin que la fila que se desliza la corte */}
          <ul className="-mx-4 -mb-px flex gap-6 overflow-x-auto px-4 pb-px sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            {[{ nombre: "Todos", slug: undefined }, ...opciones].map((o) => {
              const actual = o.slug === activo;
              return (
                <li key={o.slug ?? "todos"} className="flex shrink-0">
                  <Link
                    href={o.slug ? `/galeria?servicio=${o.slug}` : "/galeria"}
                    aria-current={actual ? "page" : undefined}
                    scroll={false}
                    className={cn(
                      "relative flex min-h-11 items-center text-sm font-semibold whitespace-nowrap",
                      actual ? "tt-enlace-actual text-tinta" : "text-tinta-suave hover:text-tinta",
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
      {/* Primero los antes y después, más grandes: lo que más vende. La primera fila carga enseguida */}
      {pares.length > 0 && (
        <section aria-labelledby="galeria-pares" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h2 id="galeria-pares" className={TITULO_SECCION}>
              Antes y después
            </h2>
            <p className="text-sm text-tinta-suave">Arrastra la línea para comparar.</p>
          </div>
          <ul aria-label="Antes y después" className="grid gap-6 md:grid-cols-2">
            {pares.map((f, i) => (
              <li key={f.id} className="grid">
                {/* Solo el primero se mueve solo: uno alcanza para mostrar que se arrastra, y varios a la vez distraen */}
                <Trabajo foto={f} alFrente={i < 2} sizes={ANCHO_PAR} mostrarLinea={i === 0} />
              </li>
            ))}
          </ul>
        </section>
      )}
      {solas.length > 0 && (
        <section aria-labelledby="galeria-mas" className="flex flex-col gap-4">
          {/* Sin pares, la sección no necesita título a la vista: es toda la galería */}
          <h2 id="galeria-mas" className={pares.length > 0 ? TITULO_SECCION : "sr-only"}>
            {tituloSolas}
          </h2>
          <ul aria-label={tituloSolas} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {solas.map((f, i) => (
              <li key={f.id} className="grid">
                <Trabajo foto={f} alFrente={pares.length === 0 && i < 3} sizes={ANCHO_EN_GRILLA} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/**
 * Lo que ocupa una foto suelta: 3 columnas desde 1024 px, 2 desde 640 y 1 en el celular. La galería no pasa de 1152 px
 * (max-w-6xl): en una pantalla más ancha, cada columna mide lo mismo y no hace falta la foto grande.
 */
const ANCHO_EN_GRILLA = "(min-width: 1152px) 368px, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw";
/** Lo que ocupa un antes y después: 2 columnas desde 768 px y 1 en el celular; desde 1152 px, siempre 564 px. */
const ANCHO_PAR = "(min-width: 1152px) 564px, (min-width: 768px) 50vw, 100vw";

/**
 * Un trabajo, en su tarjeta (como las de servicios): el par se compara en su recuadro (cuadrado si las fotos son
 * verticales, para que no queden franjas; de 4:3 si son horizontales, para no recortarles los costados), y en el
 * primero la línea se mueve sola un momento; la foto sola llena su recuadro de 4:3. Debajo, su servicio y "Ver el servicio", que lleva a su
 * página. La tarjeta no es un enlace entero: en un par, el toque es para la línea.
 */
function Trabajo({ foto: f, alFrente, sizes, mostrarLinea = false }: { foto: FotoGaleria; alFrente: boolean; sizes: string; mostrarLinea?: boolean }) {
  const nombre = nombreDelTrabajo(f.descripcion, f.servicio.nombre);
  return (
    <figure className="tt-trabajo">
      <div className="tt-trabajo__media">
        {f.antes ? (
          <ComparadorAntesDespues
            antes={f.antes}
            despues={f.despues}
            descripcion={nombre}
            alFrente={alFrente}
            sizes={sizes}
            marco
            formaMarco={formaDelPar(proporcionDe(f.despues))}
            sinAyuda
            sola={mostrarLinea}
          />
        ) : (
          <div className="tt-trabajo__foto">
            <FotoResponsiva foto={f.despues} alt={nombre} sizes={sizes} cargaDiferida={!alFrente} className="size-full object-cover" />
          </div>
        )}
      </div>
      <figcaption className="tt-trabajo__cuerpo">
        <span className="tt-trabajo__titulo">{f.servicio.nombre}</span>
        <Link href={`/servicios/${f.servicio.slug}`} className="tt-trabajo__enlace" aria-label={`Ver el servicio: ${f.servicio.nombre}`}>
          Ver el servicio
        </Link>
      </figcaption>
    </figure>
  );
}
