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
import { filtrarPorServicio, nombreDelTrabajo, paresPrimero, serviciosConFotos } from "@/modulos/sitio/galeria";
import { galeriaPublica, type FotoGaleria } from "@/modulos/sitio/publico";

export const metadata: Metadata = {
  title: "Galería",
  description: "Trabajos reales de TocTar Detailing en Tarija: fotos de antes y después de cada servicio.",
};

// HU-12 Galería pública (RF-04): fotos visibles de servicios visibles, filtrables por servicio, y un cierre para
// pedir lo mismo. El filtro son enlaces (?servicio=<slug>): funciona sin JavaScript.
// Rediseño del 24/10 (pulido 2B.12): una vitrina pareja, todos los trabajos en el mismo recuadro de 4:3 (lo que ordena
// la página es esa repetición); los antes y después se comparan ahí mismo, sin abrir nada; debajo de cada uno, su
// servicio. Sin visor ni descripciones. El filtro, como el menú del sitio.
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
        <p className="mt-3 max-w-2xl text-tinta-suave">
          Trabajos reales del taller.{filtrarPorServicio(todas, elegido).some((f) => f.antes) && " En los de antes y después, arrastra la línea."}
        </p>
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
  const fotos = paresPrimero(filtrarPorServicio(todas, elegido));
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
      {/* Una vitrina pareja: todos los trabajos en el mismo recuadro de 4:3, primero los pares de antes y después */}
      <ul aria-label="Trabajos" className="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {fotos.map((f, i) => (
          <li key={f.id}>
            {/* La primera fila (hasta 3) está en la primera pantalla: carga enseguida */}
            <Trabajo foto={f} alFrente={i < 3} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Un trabajo de la vitrina: el par se compara en su recuadro (la ayuda "Arrastra la línea" va una vez, arriba); la foto
 * sola lo llena. Debajo, su servicio, que lleva a su página.
 */
/** Lo que ocupa un recuadro de la grilla: 3 columnas desde 1024 px, 2 desde 640 y 1 en el celular. */
const ANCHO_EN_GRILLA = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw";

function Trabajo({ foto: f, alFrente }: { foto: FotoGaleria; alFrente: boolean }) {
  const nombre = nombreDelTrabajo(f.descripcion, f.servicio.nombre);
  return (
    <figure className="flex flex-col gap-2">
      {f.antes ? (
        <ComparadorAntesDespues antes={f.antes} despues={f.despues} descripcion={nombre} alFrente={alFrente} sizes={ANCHO_EN_GRILLA} marco sinAyuda />
      ) : (
        <div className="aspect-[4/3] overflow-hidden bg-superficie">
          <FotoResponsiva
            foto={f.despues}
            alt={nombre}
            sizes={ANCHO_EN_GRILLA}
            cargaDiferida={!alFrente}
            className="size-full object-cover"
          />
        </div>
      )}
      <figcaption>
        <Link href={`/servicios/${f.servicio.slug}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-tinta-suave hover:text-tinta">
          {f.servicio.nombre}
        </Link>
      </figcaption>
    </figure>
  );
}
