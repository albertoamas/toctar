import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeftIcon } from "lucide-react";
import { FormularioIngreso } from "@/modulos/acceso/componentes/formulario-ingreso";

export const metadata: Metadata = {
  title: "Ingresar",
  robots: { index: false, follow: false },
};

// Pantalla de ingreso en tema oscuro, con el logo vertical; el panel después va en claro.
export default function PaginaIngreso() {
  return (
    <main data-theme="oscuro" className="relative flex flex-1 flex-col items-center justify-center gap-10 bg-fondo px-4 py-12 text-tinta">
      {/* Salida al sitio: sin ella, quien llegaba aquí por error no tenía cómo volver (pulido 3.1) */}
      <Link href="/" className="absolute top-1 left-2 flex min-h-11 items-center gap-1 px-2 text-sm text-tinta-suave hover:text-tinta sm:left-4">
        <ChevronLeftIcon className="size-4" aria-hidden />
        Volver al sitio
      </Link>
      {/* Logo sin lema: a este tamaño el lema del dibujo no se lee. El lema va como texto, nítido. */}
      <div className="flex flex-col items-center gap-4">
        <Image
          src="/marca/toctar-vertical-sin-lema-sobre-oscuro.svg"
          alt="TocTar"
          width={200}
          height={169}
          priority
          unoptimized
        />
        <p className="tt-lema text-tinta">Como ven tu auto, te ven a ti</p>
      </div>
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl font-extrabold italic">Panel del taller</h1>
          <p className="text-sm text-tinta-suave">Ingresa con el usuario que te dio el dueño.</p>
        </div>
        <FormularioIngreso />
      </div>
      <hr className="tt-led w-full max-w-sm" />
    </main>
  );
}
