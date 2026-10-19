import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { cn } from "cn";
import { TituloPagina } from "@/componentes/sitio/titulo-pagina";
import { VisorGaleria } from "@/componentes/sitio/visor-galeria";
import { CierreWhatsApp } from "@/componentes/sitio/cierre-whatsapp";
import { WhatsAppFijo } from "@/componentes/sitio/whatsapp";
import { filtrarPorServicio, serviciosConFotos } from "@/modulos/sitio/galeria";
import { galeriaPublica, type FotoGaleria } from "@/modulos/sitio/publico";

export const metadata: Metadata = {
  title: "Galería",
  description: "Trabajos reales de TocTar Detailing en Tarija: fotos de antes y después de cada servicio.",
};

// HU-12 Galería pública (RF-04): fotos visibles de servicios visibles, filtrables por servicio, y un cierre para
// pedir lo mismo. El filtro son enlaces (?servicio=<slug>): funciona sin JavaScript.
// Las fotos y el cierre llegan juntos: un título de sección no aparece antes que su contenido (pulido 2.1).
export default function PaginaGaleria({ searchParams }: PageProps<"/galeria">) {
  return (
    <>
      <section className="mx-auto w-full max-w-6xl px-4 pt-12 md:pt-20">
        <TituloPagina>Galería</TituloPagina>
        <p className="mt-3 max-w-2xl text-tinta-suave">Trabajos reales del taller. Toca una foto para verla en grande.</p>
      </section>
      <Suspense fallback={<div className="min-h-screen" />}>
        <FotosYCierre searchParams={searchParams} />
      </Suspense>
      <WhatsAppFijo />
    </>
  );
}

async function FotosYCierre({ searchParams }: Pick<PageProps<"/galeria">, "searchParams">) {
  await connection();
  const [todas, { servicio }] = await Promise.all([galeriaPublica(), searchParams]);
  return (
    <>
      <div className="mx-auto w-full max-w-6xl px-4 pb-12 md:pb-20">
        {todas.length === 0 ? (
          <p className="mt-8 text-tinta-suave">Pronto vas a ver aquí nuestros trabajos.</p>
        ) : (
          <Fotos todas={todas} elegido={typeof servicio === "string" ? servicio : undefined} />
        )}
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
          <ul className="flex flex-wrap gap-2">
            {[{ nombre: "Todos", slug: undefined }, ...opciones].map((o) => {
              const actual = o.slug === activo;
              return (
                <li key={o.slug ?? "todos"}>
                  <Link
                    href={o.slug ? `/galeria?servicio=${o.slug}` : "/galeria"}
                    aria-current={actual ? "page" : undefined}
                    scroll={false}
                    className={cn(
                      "inline-flex min-h-11 items-center border px-4 text-sm font-semibold",
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
