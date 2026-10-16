import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { cn } from "cn";
import { VisorGaleria } from "@/componentes/sitio/visor-galeria";
import { BotonWhatsApp, WhatsAppFijo } from "@/componentes/sitio/whatsapp";
import { filtrarPorServicio, serviciosConFotos } from "@/modulos/sitio/galeria";
import { descripcionGaleria } from "@/modulos/sitio/metadatos";
import { galeriaPublica } from "@/modulos/sitio/publico";

// La descripción para Google nombra los servicios que tienen fotos.
export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const fotos = await galeriaPublica();
  return { title: "Galería", description: descripcionGaleria(serviciosConFotos(fotos).map((s) => s.nombre)) };
}

// HU-12 Galería pública (RF-04): fotos visibles de servicios visibles, filtrables por servicio.
// El filtro son enlaces (?servicio=<slug>): funciona sin JavaScript.
export default function PaginaGaleria({ searchParams }: PageProps<"/galeria">) {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12 md:py-20">
      <h1 className="font-heading text-[40px] leading-[44px] font-extrabold italic">Galería</h1>
      <p className="mt-3 max-w-2xl text-tinta-suave">Trabajos reales del taller. Toca una foto para verla en grande.</p>
      <Suspense fallback={<div className="min-h-screen" />}>
        <Fotos searchParams={searchParams} />
      </Suspense>
      <WhatsAppFijo />
    </section>
  );
}

async function Fotos({ searchParams }: Pick<PageProps<"/galeria">, "searchParams">) {
  await connection();
  const [todas, { servicio }] = await Promise.all([galeriaPublica(), searchParams]);
  if (todas.length === 0) {
    return (
      <div className="mt-10 flex flex-col items-start gap-5">
        <p className="text-tinta-suave">Pronto vas a ver aquí nuestros trabajos.</p>
        <BotonWhatsApp />
      </div>
    );
  }

  const elegido = typeof servicio === "string" ? servicio : undefined;
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
