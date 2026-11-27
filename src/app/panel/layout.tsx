import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import { NavegacionPendiente } from "@/componentes/panel/navegacion-pendiente";
import { MenuDesplegable } from "@/componentes/menu-desplegable";
import { ActualizarAlVolver } from "@/componentes/panel/actualizar-al-volver";
import { AvisoConexion } from "@/componentes/panel/aviso-conexion";
import { AvisoVersionNueva } from "@/componentes/panel/aviso-version-nueva";
import { MenuDesplazable } from "@/componentes/panel/menu-desplazable";
import { AlternarMenu, SCRIPT_MENU_COMPRIMIDO } from "@/componentes/panel/menu-comprimido";
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
    // NavegacionPendiente: la barra de progreso y la marca al instante del filtro, la pestaña o el módulo tocado
    <NavegacionPendiente>
      <div className="flex flex-1">
        {/* La columna pinta el fondo negro de arriba abajo, aunque la página sea más larga que la pantalla, y reserva el ancho;
            el menú queda fijo, sujeto al borde de arriba y al de abajo de la ventana. No con un alto en unidades de pantalla
            (h-dvh): en la app instalada de Android, después de actualizar (deslizar o Ctrl + R), el navegador calcula ese alto
            más grande que la ventana y lo de abajo (quién entró, el manual, "Cerrar sesión") quedaba fuera, hasta cerrar la app */}
        {/* Lo guardado (barra comprimida), antes de pintar */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_MENU_COMPRIMIDO }} />
        {/* data-menu-lateral: la barra comprimida (19/11) solo cambia lo de aquí adentro, no el menú del celular */}
        {/* Al comprimirla o abrirla, el ancho cambia con una transición (19/11); sin ella si el equipo pide menos movimiento */}
        <div data-theme="oscuro" data-menu-lateral className="hidden w-62 shrink-0 bg-fondo transition-[width] duration-200 ease-out motion-reduce:transition-none lg:block comprimido:w-16">
          <aside className="fixed inset-y-0 left-0 z-30 flex w-62 flex-col overflow-hidden bg-fondo px-3 py-3 text-tinta transition-[width] duration-200 ease-out [--radius:8px] motion-reduce:transition-none comprimido:w-16">
            {/* El logo oficial y, comprimida, su monograma (manual de marca: no se reemplaza por otro), con un fundido */}
            <div className="relative mt-1 mb-3 flex h-9 shrink-0 items-center px-1">
              <span className="transition-opacity duration-200 comprimido:opacity-0">
                <Marca />
              </span>
              <Image src="/marca/toctar-monograma-sobre-oscuro.svg" alt="" aria-hidden width={32} height={32} unoptimized className="absolute top-1/2 left-1 -translate-y-1/2 opacity-0 transition-opacity duration-200 comprimido:opacity-100" />
            </div>
            {/* Si el menú no entra (pantalla baja), se desplaza solo él: la marca y "Cerrar sesión" quedan a la vista.
                El margen negativo con su relleno deja ver el borde de foco de los enlaces */}
            <MenuDesplazable className="-mx-1 px-1">{menu}</MenuDesplazable>
            {/* Abajo, encima de quién entró, el botón que comprime la barra (19/11, a pedido del dueño: junto al logo lo
                apretaba y la barra parecía más ancha) */}
            <div className="mt-3 flex flex-col gap-1 border-t border-border pt-3">
              <AlternarMenu />
              {sesion}
            </div>
          </aside>
        </div>

        {/* min-w-0: sin esto, lo ancho del contenido (como la tira de pestañas) estira la columna y la pantalla
            se sale por la derecha en el celular. */}
        <div data-fondo="panel" className="flex min-w-0 flex-1 flex-col bg-fondo-panel">
          <RegistrarServiceWorker />
          {/* Los avisos ("Cambios guardados.") son solo del panel: en el diseño raíz, su código (sonner) se descargaba
              también en cada página del sitio, que no los usa (pulido 2, rendimiento). */}
          <Toaster />
          {/* Pedido 39: "Hay una versión nueva del sistema", con "Actualizar" */}
          <AvisoVersionNueva />
          {/* Hallazgo 4: al volver a la app después de un rato, la pantalla se pone al día */}
          <ActualizarAlVolver />
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
    </NavegacionPendiente>
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