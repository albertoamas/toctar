import type { Metadata } from "next";
import { MenuIcon } from "lucide-react";
import { NavegacionPanel } from "@/componentes/panel/navegacion";
import { Button } from "@/componentes/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/componentes/ui/sheet";

// El panel nunca se indexa en Google (RNF-12).
export const metadata: Metadata = {
  title: "Panel",
  robots: { index: false, follow: false },
};

// Diseño del panel: barra lateral en la computadora, menú desplegable en el celular.
// La verificación de sesión se agrega con HU-01.
export default function LayoutPanel({ children }: LayoutProps<"/panel">) {
  return (
    <div className="flex flex-1">
      <aside className="hidden w-60 shrink-0 border-r p-4 md:block">
        <p className="mb-4 px-3 font-semibold">TocTar</p>
        <NavegacionPanel />
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
            </SheetContent>
          </Sheet>
          <span className="font-semibold">TocTar</span>
        </header>

        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
