"use client";

import { useState } from "react";
import { MenuIcon, XIcon } from "lucide-react";
import { cn } from "cn";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/componentes/ui/sheet";

// Menú desplegable del celular, compartido por el sitio y el panel.
// - Se cierra al tocar cualquier enlace: si no, queda abierto tapando la pantalla nueva.
// - Abrir y cerrar miden 44 × 44 px, el mínimo cómodo para el pulgar.

type Props = {
  lado: "left" | "right";
  /** Lo que va arriba, junto al botón de cerrar (el logo). */
  cabecera: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

const BOTON = "-mx-2 grid size-11 shrink-0 place-items-center rounded-sm text-tinta hover:bg-superficie";

export function MenuDesplegable({ lado, cabecera, children, className }: Props) {
  const [abierto, setAbierto] = useState(false);
  return (
    <Sheet open={abierto} onOpenChange={setAbierto}>
      <SheetTrigger className={BOTON}>
        <MenuIcon className="size-6" aria-hidden />
        <span className="sr-only">Abrir menú</span>
      </SheetTrigger>
      <SheetContent
        side={lado}
        data-theme="oscuro"
        showCloseButton={false}
        className={cn("gap-0 bg-fondo pb-[env(safe-area-inset-bottom)] text-tinta", className)}
        onClickCapture={(e) => {
          if ((e.target as HTMLElement).closest("a")) setAbierto(false);
        }}
      >
        <SheetTitle className="sr-only">Menú</SheetTitle>
        <div className="flex min-h-16 shrink-0 items-center justify-between gap-4 px-4">
          {cabecera}
          <SheetClose className={BOTON}>
            <XIcon className="size-6" aria-hidden />
            <span className="sr-only">Cerrar menú</span>
          </SheetClose>
        </div>
        {children}
      </SheetContent>
    </Sheet>
  );
}
