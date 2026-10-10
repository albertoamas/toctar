import Link from "next/link";
import { MenuIcon } from "lucide-react";
import { Button } from "@/componentes/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/componentes/ui/sheet";

// Mapa del sitio público (RF-01 a RF-07). Las páginas se construyen en la entrega 1.
const enlaces = [
  { href: "/servicios", texto: "Servicios" },
  { href: "/galeria", texto: "Galería" },
  { href: "/nosotros", texto: "Nosotros" },
  { href: "/contacto", texto: "Contacto" },
];

export function Encabezado() {
  return (
    <header className="border-b">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-semibold">
          TocTar Detailing
        </Link>

        <nav aria-label="Principal" className="hidden gap-6 md:flex">
          {enlaces.map((e) => (
            <Link key={e.href} href={e.href} className="text-sm hover:underline">
              {e.texto}
            </Link>
          ))}
        </nav>

        <Sheet>
          <SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden" />}>
            <MenuIcon />
            <span className="sr-only">Abrir menú</span>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetTitle className="px-4 pt-4">Menú</SheetTitle>
            <nav aria-label="Principal" className="flex flex-col gap-1 px-4">
              {enlaces.map((e) => (
                <Link key={e.href} href={e.href} className="py-2 text-base">
                  {e.texto}
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
