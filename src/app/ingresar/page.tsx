import type { Metadata } from "next";
import Image from "next/image";
import { FormularioIngreso } from "@/modulos/acceso/componentes/formulario-ingreso";

export const metadata: Metadata = {
  title: "Ingresar",
  robots: { index: false, follow: false },
};

// Pantalla de ingreso en tema oscuro, con el logo vertical; el panel después va en claro.
export default function PaginaIngreso() {
  return (
    <main data-theme="oscuro" className="flex flex-1 flex-col items-center justify-center gap-10 bg-fondo px-4 py-12 text-tinta">
      <Image
        src="/marca/toctar-vertical-sobre-oscuro.svg"
        alt="TocTar"
        width={168}
        height={158}
        priority
        unoptimized
      />
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
