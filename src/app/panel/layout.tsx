import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import { MenuDesplegable } from "@/componentes/menu-desplegable";
import { AvisoConexion } from "@/componentes/panel/aviso-conexion";
import { AvisoVersionNueva } from "@/componentes/panel/aviso-version-nueva";
import { MenuDesplazable } from "@/componentes/panel/menu-desplazable";
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

// Diseño del panel (pedido 26, etapas/P26-rediseno-panel.md): un panel administrativo estándar. Menú lateral oscuro con
// el logo, y el área de trabajo gris claro con las tarjetas blancas encima, que se lee mejor al sol en el taller. En el
// celular y la tableta (menos de 1024 px), barra superior y menú desplegable: con la barra lateral, el contenido quedaba
// apretado. El menú (la barra lateral y la hoja del celular) va con las esquinas del panel (8 px), no con las de la marca
// del tema oscuro.
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
      {/* La columna pinta el fondo negro de arriba abajo, aunque la página sea más larga que la pantalla; adentro, el menú
          queda fijo al bajar (sticky, del alto de la pantalla). Con el fondo en el menú, debajo quedaba un hueco blanco */}
      <div data-theme="oscuro" className="hidden w-62 shrink-0 bg-fondo lg:block">
        <aside className="sticky top-0 flex h-dvh flex-col p-4 text-tinta [--radius:8px]">
          <div className="mt-1 mb-6">
            <Marca />
          </div>
          {/* Si el menú no entra (pantalla baja), se desplaza solo él: la marca y "Cerrar sesión" quedan a la vista.
              El margen negativo con su relleno deja ver el borde de foco de los enlaces */}
          <MenuDesplazable className="-mx-1 px-1">{menu}</MenuDesplazable>
          <div className="mt-4 border-t border-border pt-4">{sesion}</div>
        </aside>
      </div>

      {/* min-w-0: sin esto, lo ancho del contenido (como la tira de pestañas) estira la columna y la pantalla
          se sale por la derecha en el celular. */}
      <div className="flex min-w-0 flex-1 flex-col bg-fondo-panel">
        <RegistrarServiceWorker />
        {/* Los avisos ("Cambios guardados.") son solo del panel: en el diseño raíz, su código (sonner) se descargaba
            también en cada página del sitio, que no los usa (pulido 2, rendimiento). */}
        <Toaster />
        {/* Pedido 39: "Hay una versión nueva del sistema", con "Actualizar" */}
        <AvisoVersionNueva />
        <header data-theme="oscuro" className="sticky top-0 z-40 flex h-14 items-center gap-2 bg-fondo px-4 text-tinta lg:hidden">
          <MenuDesplegable lado="left" cabecera={<Marca />} className="[--radius:8px]">
            {/* Igual que la barra lateral: en un celular bajo se desplaza el menú y "Cerrar sesión" queda a la vista. Con el
                mismo margen que la cabecera, los títulos de grupo quedan alineados con la marca */}
            <MenuDesplazable className="px-4">{menu}</MenuDesplazable>
            <div className="border-t border-border p-4">{sesion}</div>
          </MenuDesplegable>
          <Marca />
        </header>

        <div className="sticky top-14 z-40 lg:top-0">
          <AvisoConexion />
        </div>
        {/* @container: las tablas del panel (TablaLista) se acomodan al ancho del área de trabajo, no al de la pantalla */}
        <main className="@container flex-1 px-4 py-5 md:px-8 md:py-7">{children}</main>
      </div>
    </div>
  );
}

/** El logo horizontal sin lema (el lema pide 360 px de ancho), sobre el fondo oscuro del menú. */
function Marca() {
  return (
    <span className="flex items-center px-3">
      <Image src="/marca/toctar-horizontal-sin-lema-sobre-oscuro.svg" alt="TocTar, panel" width={120} height={30} unoptimized priority />
    </span>
  );
}