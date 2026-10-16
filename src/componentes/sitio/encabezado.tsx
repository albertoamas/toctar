import Image from "next/image";
import Link from "next/link";
import { MenuDesplegable } from "@/componentes/menu-desplegable";
import { PAGINAS_PRINCIPALES, PAGINAS_SECUNDARIAS } from "@/lib/sitio";
import { EnlacesMenu, NavegacionPrincipal } from "./enlaces-sitio";
import { BotonWhatsApp } from "./whatsapp";

// Encabezado del sitio (componente EncabezadoSitio del Design System): logo, navegación y línea LED.
// Queda fijo arriba al bajar, para tener el menú siempre a mano. A 32 px de alto el lema del logo
// no se lee: va la versión sin lema.

function Logo() {
  return (
    <Link href="/" aria-label="TocTar, inicio" className="flex min-h-11 shrink-0 items-center">
      <Image src="/marca/toctar-horizontal-sin-lema-sobre-oscuro.svg" alt="TocTar" width={127} height={32} priority unoptimized />
    </Link>
  );
}

export function Encabezado() {
  return (
    <header className="sticky top-0 z-40 bg-fondo">
      <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-6 px-4">
        <Logo />
        <NavegacionPrincipal enlaces={PAGINAS_PRINCIPALES} />
        <div className="md:hidden">
          <MenuDesplegable lado="right" cabecera={<Logo />} className="data-[side=right]:w-full">
            <hr className="tt-led" />
            <div className="flex flex-1 flex-col overflow-y-auto">
              <EnlacesMenu principales={PAGINAS_PRINCIPALES} secundarios={PAGINAS_SECUNDARIAS} />
              <div className="mt-auto flex flex-col gap-5 px-6 pt-8 pb-8">
                <BotonWhatsApp className="w-full" />
                <p className="tt-lema text-tinta-suave">Como ven tu auto, te ven a ti</p>
              </div>
            </div>
          </MenuDesplegable>
        </div>
      </div>
      <hr className="tt-led" />
    </header>
  );
}
