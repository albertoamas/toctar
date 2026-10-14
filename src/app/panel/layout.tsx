import type { Metadata } from "next";
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

// Diseño del panel: barra lateral en la computadora, menú desplegable en el celular.
// Este layout NO protege a las páginas: cada página valida la sesión (src/lib/sesion.ts).
export default function LayoutPanel({ children }: LayoutProps<"/panel">) {
  const sesion = (
    <Suspense fallback={<div className="h-10" />}>
      <UsuarioSesion />
    </Suspense>
  );

  return (
    <div className="flex flex-1">
      <aside className="hidden w-60 shrink-0 flex-col border-r p-4 md:flex">
        <p className="mb-4 px-3 font-semibold">TocTar</p>
        <NavegacionPanel />
        <div className="mt-auto border-t pt-4">{sesion}</div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center gap-2 border-b px-4 md:hidden">
          <Sheet>
            <SheetTrigger render={<Button variant="ghost" size="icon" />}>
              <MenuIcon />
              <span className="sr-only">Abrir menú</span>
            </SheetTrigger>
            <SheetContent side="left">
              <SheetTitle className="px-4 pt-4">TocTar</SheetTitle>
              <div className="px-1">
                <NavegacionPanel />
              </div>
              <div className="mt-auto border-t p-4">{sesion}</div>
            </SheetContent>
          </Sheet>
          <span className="font-semibold">TocTar</span>
        </header>

        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
