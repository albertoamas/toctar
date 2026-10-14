import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import { MenuIcon } from "lucide-react";
import { NavegacionPanel } from "@/componentes/panel/navegacion";
import { UsuarioSesion } from "@/componentes/panel/usuario-sesion";
import { Button } from "@/componentes/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/componentes/ui/sheet";

// El panel nunca se indexa en Google (RNF-12).
export const metadata: Metadata = {
  title: "Panel",
  robots: { index: false, follow: false },
};

// Diseño del panel: barra lateral negra con el monograma (presencia de la marca) y contenido en
// tema claro, que se lee mejor al sol en el taller. En el celular, barra superior y menú desplegable.
// Este layout NO protege a las páginas: cada página valida la sesión (src/lib/sesion.ts).
export default function LayoutPanel({ children }: LayoutProps<"/panel">) {
  const sesion = (
    <Suspense fallback={<div className="h-10" />}>
      <UsuarioSesion />
    </Suspense>
  );

  return (
    <div className="flex flex-1">
      <aside data-theme="oscuro" className="hidden w-60 shrink-0 flex-col bg-fondo p-4 text-tinta md:flex">
        <div className="mb-6">
          <Marca />
        </div>
        <NavegacionPanel />
        <div className="mt-auto border-t border-border pt-4">{sesion}</div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header data-theme="oscuro" className="flex h-14 items-center gap-2 bg-fondo px-4 text-tinta md:hidden">
          <Sheet>
            <SheetTrigger render={<Button variant="ghost" size="icon" />}>
              <MenuIcon />
              <span className="sr-only">Abrir menú</span>
            </SheetTrigger>
            <SheetContent side="left" data-theme="oscuro" className="bg-fondo text-tinta">
              <SheetTitle className="px-4 pt-4">
                <Marca />
              </SheetTitle>
              <div className="px-1">
                <NavegacionPanel />
              </div>
              <div className="mt-auto border-t border-border p-4">{sesion}</div>
            </SheetContent>
          </Sheet>
          <Marca />
        </header>

        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}

function Marca() {
  return (
    <span className="flex items-center gap-3 px-3">
      <Image src="/marca/toctar-monograma-sobre-oscuro.svg" alt="" width={32} height={24} unoptimized />
      <span className="font-heading text-xl font-extrabold italic">Panel</span>
    </span>
  );
}