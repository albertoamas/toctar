"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronDownIcon } from "lucide-react";
import { useHidratado } from "@/componentes/hidratado";
import { Button } from "@/componentes/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/componentes/ui/dropdown-menu";

// "Ordenar: Más antiguas ▾" en la barra de la lista (10/11): en Saldos el orden eran pestañas, que se veían igual que
// las vistas y hacían otra cosa. Cada opción es un enlace (?orden=…), así se comparte y Atrás funciona, sin perder lo
// buscado. El primero es el de siempre: sin parámetro en la dirección. Lee la dirección: va dentro de un Suspense.

export type OpcionOrden = { valor: string; texto: string };

export function Ordenar({ opciones, parametro = "orden" }: { opciones: OpcionOrden[]; parametro?: string }) {
  const ruta = usePathname();
  const actuales = useSearchParams();
  const hidratado = useHidratado();
  const elegida = opciones.find((o) => o.valor === actuales.get(parametro)) ?? opciones[0];
  const enlace = (o: OpcionOrden) => {
    const siguientes = new URLSearchParams(actuales);
    siguientes.delete("pagina");
    if (o === opciones[0]) siguientes.delete(parametro);
    else siguientes.set(parametro, o.valor);
    const consulta = siguientes.toString();
    return (consulta ? `${ruta}?${consulta}` : ruta) as Route;
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button type="button" variant="outline" disabled={!hidratado} />}>
        <span className="text-tinta-suave">Ordenar:</span> {elegida.texto}
        <ChevronDownIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-48">
        {opciones.map((o) => (
          <DropdownMenuItem
            key={o.valor}
            render={<Link href={enlace(o)} aria-current={o === elegida ? "true" : undefined} />}
            className="min-h-9 px-3 text-base pointer-coarse:min-h-11 aria-[current=true]:font-semibold"
          >
            {o.texto}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
