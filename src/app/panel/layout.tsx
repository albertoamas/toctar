import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import { MenuDesplegable } from "@/componentes/menu-desplegable";
import { AvisoConexion } from "@/componentes/panel/aviso-conexion";
import { MenuPanel } from "@/componentes/panel/menu-panel";
import { RegistrarServiceWorker } from "@/componentes/panel/registrar-service-worker";
import { UsuarioSesion } from "@/componentes/panel/usuario-sesion";
import { Toaster } from "@/componentes/ui/sonner";

// El panel nunca se indexa en Google (RNF-12). Instalado en el iPhone se abre como app (HU-06).
export const metadata: Metadata = {
  title: "Panel",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "TocTar", statusBarStyle: "black" },
};

// Diseño del panel: barra lateral negra con el monograma (presencia de la marca) y contenido en
// tema claro, que se lee mejor al sol en el taller. En el celular y la tableta (menos de 1024 px), barra
// superior y menú desplegable: con la barra lateral, el contenido quedaba apretado.
// La barra lateral y la superior quedan fijas al bajar: el menú y "Cerrar sesión" siempre a mano.
// Este layout NO protege a las páginas: cada página valida la sesión (src/lib/sesion.ts).
export default function LayoutPanel({ children }: LayoutProps<"/panel">) {
  const menu = (
    <Suspense fallback={<div className="h-40" />}>
      <MenuPanel />
    </Suspense>
  );
  const sesion = (
    <Suspense fallback={<div className="h-10" />}>
      <UsuarioSesion />
    </Suspense>
  );

  return (
    <div className="flex flex-1">
      <aside data-theme="oscuro" className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col bg-fondo p-4 text-tinta lg:flex">
        <div className="mb-6">
          <Marca />
        </div>
        {/* Si el menú no entra (pantalla baja), se desplaza solo él: la marca y "Cerrar sesión" quedan a la vista.
            El margen negativo con su relleno deja ver el borde de foco de los enlaces */}
        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">{menu}</div>
        <div className="mt-4 border-t border-border pt-4">{sesion}</div>
      </aside>

      {/* min-w-0: sin esto, lo ancho del contenido (como la tira de pestañas) estira la columna y la pantalla
          se sale por la derecha en el celular. */}
      <div className="flex min-w-0 flex-1 flex-col">
        <RegistrarServiceWorker />
        {/* Los avisos ("Cambios guardados.") son solo del panel: en el diseño raíz, su código (sonner) se descargaba
            también en cada página del sitio, que no los usa (pulido 2, rendimiento). */}
        <Toaster />
        <header data-theme="oscuro" className="sticky top-0 z-40 flex h-14 items-center gap-2 bg-fondo px-4 text-tinta lg:hidden">
          <MenuDesplegable lado="left" cabecera={<Marca />}>
            {/* Igual que la barra lateral: en un celular bajo se desplaza el menú y "Cerrar sesión" queda a la vista. Con el
                mismo margen que la cabecera, los títulos de grupo quedan alineados con la marca */}
            <div className="min-h-0 flex-1 overflow-y-auto px-4">{menu}</div>
            <div className="border-t border-border p-4">{sesion}</div>
          </MenuDesplegable>
          <Marca />
        </header>

        <div className="sticky top-14 z-40 lg:top-0">
          <AvisoConexion />
        </div>
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