import Image from "next/image";
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

// Componente EncabezadoSitio del Design System: logo horizontal sobre oscuro, navegación y línea LED.
// A 32 px de alto el lema del logo no se lee: va la versión sin lema.
export function Encabezado() {
  return (
    <header className="bg-fondo">
      <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-6 px-4">
        <Link href="/" aria-label="TocTar, inicio" className="shrink-0">
          <Image
            src="/marca/toctar-horizontal-sin-lema-sobre-oscuro.svg"
            alt="TocTar"
            width={127}
            height={32}
            priority
            unoptimized
          />
        </Link>

        <nav aria-label="Principal" className="hidden gap-6 md:flex">
          {enlaces.map((e) => (
            <Link key={e.href} href={e.href} className="text-sm font-medium text-tinta hover:text-rojo-texto">
              {e.texto}
            </Link>
          ))}
        </nav>

        <Sheet>
          <SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden" />}>
            <MenuIcon />
            <span className="sr-only">Abrir menú</span>
          </SheetTrigger>
          <SheetContent side="right" data-theme="oscuro">
            <SheetTitle className="px-4 pt-4">Menú</SheetTitle>
            <nav aria-label="Principal" className="flex flex-col gap-1 px-4">
              {enlaces.map((e) => (
                <Link key={e.href} href={e.href} className="py-2 text-base text-tinta hover:text-rojo-texto">
                  {e.texto}
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
      <hr className="tt-led" />
    </header>
  );
}
