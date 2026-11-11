"use client";

import { ChevronDownIcon, EllipsisIcon } from "lucide-react";
import { useHidratado } from "@/componentes/hidratado";
import { Button } from "@/componentes/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/componentes/ui/dropdown-menu";

// Menú "Más" de una ficha (skill pantallas-panel, §3): las acciones que se usan poco (desactivar, cancelar, anular)
// fuera de la vista, junto a la acción principal del encabezado. Cada opción abre su confirmación (un modal): lo
// destructivo nunca se hace con un solo toque. Se habilita al cargar la página, así un toque temprano no se pierde.
// No es menu-desplegable.tsx, que es la navegación del celular. `icono`: en una fila de una lista (cada pago), solo "⋯" sin
// fondo, para no repetir "Más" en cada fila; su nombre para el lector dice de cuál es.

/** Lo que hace al elegirla, o `href`: un enlace que se abre en otra pestaña (el chat de WhatsApp), que sigue siendo un enlace. */
export type AccionMas = { texto: string } & ({ alElegir: () => void; href?: never } | { href: string; alElegir?: never });

type Props = {
  acciones: AccionMas[];
  /** Mientras una de sus acciones corre. */
  deshabilitado?: boolean;
} & ({ /** Con varios en la pantalla, de cuál es: "Más: Pulido en una Hilux". */ etiqueta?: string; icono?: false } | { etiqueta: string; icono: true });

export function MenuMas({ acciones, deshabilitado = false, etiqueta, icono = false }: Props) {
  const hidratado = useHidratado();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button type="button" variant={icono ? "ghost" : "outline"} size={icono ? "icon" : "default"} disabled={!hidratado || deshabilitado} aria-label={etiqueta} className={icono ? "text-tinta-suave" : undefined} />}
      >
        {icono ? (
          <EllipsisIcon />
        ) : (
          <>
            Más
            <ChevronDownIcon />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-48">
        {acciones.map((a) => (
          <DropdownMenuItem
            key={a.texto}
            onClick={a.alElegir}
            render={a.href ? <a href={a.href} target="_blank" rel="noreferrer" /> : undefined}
            className="min-h-9 px-3 text-base pointer-coarse:min-h-11"
          >
            {a.texto}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
