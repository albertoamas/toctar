import type { Metadata } from "next";
import Image from "next/image";
import { EnlaceVolver } from "@/componentes/enlace-volver";
import { FormularioIngreso } from "@/modulos/acceso/componentes/formulario-ingreso";

export const metadata: Metadata = {
  title: "Ingresar",
  robots: { index: false, follow: false },
};

// Pantalla de ingreso en tema oscuro; el panel después va en claro. Pulido 3.2 (maqueta aprobada el 05/11): la marca en
// una franja gris cortada a 60° (arriba en el celular, a la izquierda y a lo alto en la computadora) y el formulario a
// la vista sin bajar. Todo alineado a la izquierda. data-fondo="oscuro": el fondo de toda la página también en negro.
export default function PaginaIngreso() {
  return (
    <main data-theme="oscuro" data-fondo="oscuro" className="grid flex-1 grid-rows-[auto_1fr] bg-fondo text-tinta lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:grid-rows-none">
      <header className="tt-franja-ingreso flex flex-col gap-7 px-4 pt-2 pb-14 lg:py-8 lg:pr-48 lg:pl-16">
        {/* Salida al sitio: sin ella, quien llegaba aquí por error no tenía cómo volver (pulido 3.1) */}
        <EnlaceVolver href="/" className="-ml-1">
          Volver al sitio
        </EnlaceVolver>
        {/* El logo horizontal sin lema, y el lema como texto: a este tamaño, el del dibujo no se lee. En la computadora va
            arriba, donde la franja es más ancha: más abajo, la diagonal lo alcanza */}
        <div className="flex flex-col items-start gap-3 lg:mt-24 lg:gap-4">
          <Image
            src="/marca/toctar-horizontal-sin-lema-sobre-oscuro.svg"
            alt="TocTar"
            width={1235}
            height={310}
            priority
            unoptimized
            className="h-auto w-[200px] lg:w-[320px]"
          />
          <p className="tt-lema text-tinta-suave">Como ven tu auto, te ven a ti</p>
          {/* La línea LED une la marca con lo que sigue; antes quedaba suelta al final de la pantalla */}
          <hr className="tt-led w-18 lg:w-24" />
        </div>
      </header>

      <div className="flex w-full flex-col gap-6 px-4 pt-6 pb-10 lg:max-w-[560px] lg:justify-center lg:px-20 lg:py-12">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-4xl leading-none font-extrabold italic lg:text-[44px]">Panel del taller</h1>
          <p className="text-tinta-suave">Ingresa con el usuario que te dio el dueño.</p>
        </div>
        <FormularioIngreso />
        <p className="text-sm text-tinta-suave">¿Olvidaste tu contraseña? Pídele al dueño que te dé una nueva.</p>
      </div>
    </main>
  );
}
