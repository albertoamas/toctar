import { readFileSync } from "node:fs";
import path from "node:path";
import Link from "next/link";
import { MenuDesplegable } from "@/componentes/menu-desplegable";
import { PAGINAS_PRINCIPALES, PAGINAS_SECUNDARIAS } from "@/lib/sitio";
import { EnlacesMenu, NavegacionPrincipal } from "./enlaces-sitio";
import { BotonWhatsApp } from "./whatsapp";

// Encabezado del sitio (componente EncabezadoSitio del Design System): logo y navegación.
// Queda fijo arriba al bajar, para tener el menú siempre a mano. El logo mide 36 px de alto en el celular y 40 en la
// computadora (más grande desde la demo del 24/10, a pedido del dueño): unos 143 y 159 px de ancho, menos que los
// 360 que pide el manual para el lema, así que va la versión sin lema.
// Se separa del contenido con una línea gris fina, sin brillo: está en todas las páginas y no debe competir
// con ellas. El rojo queda para el logo y la página actual; la línea LED con brillo es de la portada.

// El logo va dentro de la página y no como archivo aparte: así aparece en el primer cuadro, junto con el
// encabezado (como archivo, con una red lenta llegaba último; pulido 2.1). El original sigue siendo el de
// public/marca: se lee de ahí al armar la página, sin copiarlo ni recolorearlo. Es decorativo dentro del enlace,
// que ya se llama "TocTar, inicio".
const LOGO = readFileSync(path.join(process.cwd(), "public/marca/toctar-horizontal-sin-lema-sobre-oscuro.svg"), "utf8")
  .replace(' role="img" aria-label="TocTar"', "")
  .replace("<svg ", '<svg width="143" height="36" aria-hidden="true" focusable="false" ');

function Logo() {
  return (
    <Link
      href="/"
      aria-label="TocTar, inicio"
      className="flex min-h-11 shrink-0 items-center md:[&_svg]:h-10 md:[&_svg]:w-auto"
      dangerouslySetInnerHTML={{ __html: LOGO }}
    />
  );
}

export function Encabezado() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-fondo">
      <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-6 px-4">
        <Logo />
        <NavegacionPrincipal enlaces={PAGINAS_PRINCIPALES} />
        <div className="md:hidden">
          <MenuDesplegable lado="right" cabecera={<Logo />} className="data-[side=right]:w-full">
            <hr className="border-border" />
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
    </header>
  );
}
