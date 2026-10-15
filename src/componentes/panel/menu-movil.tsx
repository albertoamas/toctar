"use client";

import { useState } from "react";
import { MenuIcon } from "lucide-react";
import { Button } from "@/componentes/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/componentes/ui/sheet";

// Menú del panel en el celular. Se cierra al tocar un enlace: si no, queda abierto tapando la pantalla nueva.
export function MenuMovil({ marca, menu, sesion }: { marca: React.ReactNode; menu: React.ReactNode; sesion: React.ReactNode }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <Sheet open={abierto} onOpenChange={setAbierto}>
      <SheetTrigger render={<Button variant="ghost" size="icon" />}>
        <MenuIcon />
        <span className="sr-only">Abrir menú</span>
      </SheetTrigger>
      <SheetContent
        side="left"
        data-theme="oscuro"
        className="bg-fondo text-tinta"
        onClickCapture={(e) => {
          if ((e.target as HTMLElement).closest("a")) setAbierto(false);
        }}
      >
        <SheetTitle className="px-4 pt-4">{marca}</SheetTitle>
        <div className="px-1">{menu}</div>
        <div className="mt-auto border-t border-border p-4">{sesion}</div>
      </SheetContent>
    </Sheet>
  );
}
