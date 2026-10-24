import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { cn } from "cn";
import { TituloPagina } from "@/componentes/sitio/titulo-pagina";
import { VisorGaleria } from "@/componentes/sitio/visor-galeria";
import { CierreWhatsApp } from "@/componentes/sitio/cierre-whatsapp";
import { EnlaceTikTok } from "@/componentes/sitio/enlace-tiktok";
import { WhatsAppFijo } from "@/componentes/sitio/whatsapp";
import { obtenerDatosPublicos } from "@/modulos/configuracion/consultas";
import { filtrarPorServicio, serviciosConFotos } from "@/modulos/sitio/galeria";
import { galeriaPublica, type FotoGaleria } from "@/modulos/sitio/publico";

export const metadata: Metadata = {
  title: "Galería",
  description: "Trabajos reales de TocTar Detailing en Tarija: fotos de antes y después de cada servicio.",
};

// HU-12 Galería pública (RF-04): fotos visibles de servicios visibles, filtrables por servicio, y un cierre para
// pedir lo mismo. El filtro son enlaces (?servicio=<slug>): funciona sin JavaScript.
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
        <p className="mt-3 max-w-2xl text-tinta-suave">Trabajos reales del taller. Toca una foto para verla en grande.</p>
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
    <div className="mt-8 flex flex-col gap-6">
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
      <VisorGaleria
        fotos={fotos.map((f) => ({ id: f.id, descripcion: f.descripcion, servicio: f.servicio.nombre, antes: f.antes, despues: f.despues }))}
      />
    </div>
  );
}
