"use client";

import { XIcon } from "lucide-react";
import { cn } from "cn";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@/componentes/ui/sheet";
import { BOTON_MENU, type PropsMenu } from "./menu-desplegable-comun";

// La hoja del menú desplegable (con su librería, base-ui). Va en un archivo aparte para que se descargue recién
// cuando hace falta y no compita con la primera pintura de la página (ver menu-desplegable.tsx).
export default function HojaMenu({
  lado,
  cabecera,
  children,
  className,
  abierto,
  cambiar,
}: PropsMenu & { abierto: boolean; cambiar: (abierto: boolean) => void }) {
  return (
    <Sheet open={abierto} onOpenChange={cambiar}>
      <SheetContent
        side={lado}
        data-theme="oscuro"
        showCloseButton={false}
        className={cn("gap-0 bg-fondo pb-[env(safe-area-inset-bottom)] text-tinta", className)}
        onClickCapture={(e) => {
          if ((e.target as HTMLElement).closest("a")) cambiar(false);
        }}
      >
        <SheetTitle className="sr-only">Menú</SheetTitle>
        <div className="flex min-h-16 shrink-0 items-center justify-between gap-4 px-4">
          {cabecera}
          <SheetClose className={BOTON_MENU}>
            <XIcon className="size-6" aria-hidden />
            <span className="sr-only">Cerrar menú</span>
          </SheetClose>
        </div>
        {children}
      </SheetContent>
    </Sheet>
  );
}
