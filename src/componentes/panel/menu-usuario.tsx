"use client";

import { useId } from "react";
import { BookOpenIcon, ChevronsUpDownIcon, LogOutIcon } from "lucide-react";
import { useHidratado } from "@/componentes/hidratado";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/componentes/ui/dropdown-menu";
import { cerrarSesion } from "@/modulos/acceso/acciones";

// Quién entró, abajo de la barra (19/11, a pedido del dueño): un círculo con su inicial, su nombre y su rol. Al tocarlo,
// un menú con el manual del panel y "Cerrar sesión". Comprimida la barra, solo el círculo.
// "Cerrar sesión" es un botón de verdad asociado a su formulario (`form`): así, con cambios sin guardar, la pantalla
// pregunta antes de salir (cambios-sin-guardar.tsx busca `button[data-preguntar-salir]` y su formulario). El formulario
// queda fuera del menú, que se abre en otra capa.

export function MenuUsuario({ nombre, rol }: { nombre: string; rol: string }) {
  const hidratado = useHidratado();
  const idFormulario = `cerrar-sesion-${useId().replace(/:/g, "")}`;
  const inicial = nombre.trim().charAt(0).toUpperCase() || "?";
  return (
    <>
      <form id={idFormulario} action={cerrarSesion} hidden />
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={!hidratado}
          aria-label={`Tu cuenta: ${nombre}`}
          title={nombre}
          className="flex min-h-12 w-full items-center gap-3 overflow-hidden rounded-md px-1.5 text-left hover:bg-superficie focus-visible:outline-2 focus-visible:outline-(--foco) data-popup-open:bg-superficie"
        >
          <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-superficie-alta text-sm font-semibold ring-1 ring-border">
            {inicial}
          </span>
          <span className="flex min-w-0 flex-1 flex-col whitespace-nowrap transition-opacity duration-200 comprimido:opacity-0">
            <span className="truncate text-sm font-semibold">{nombre}</span>
            <span className="truncate text-xs text-tinta-suave">{rol}</span>
          </span>
          <ChevronsUpDownIcon aria-hidden className="size-4 shrink-0 text-tinta-suave transition-opacity duration-200 comprimido:opacity-0" />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="min-w-56">
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- /panel/manual es una ruta que devuelve su propio HTML */}
          <DropdownMenuItem render={<a href="/panel/manual" data-sin-preguntar />} className="min-h-9 gap-2 px-3 text-base pointer-coarse:min-h-11">
            <BookOpenIcon aria-hidden />
            Manual del panel
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem render={<button type="submit" form={idFormulario} data-preguntar-salir />} className="min-h-9 w-full gap-2 px-3 text-base pointer-coarse:min-h-11">
            <LogOutIcon aria-hidden />
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
