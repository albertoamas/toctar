import type { Route } from "next";
import Link from "next/link";
import { cn } from "cn";
import { UserPlusIcon } from "lucide-react";
import { EstadoVacio } from "@/componentes/panel/estado-vacio";
import { buttonVariants } from "@/componentes/ui/button";
import { formatearWhatsApp } from "@/lib/whatsapp";
import { buscarClientes } from "../consultas";
import { BuscadorClientes } from "./buscador-clientes";

// Elegir al cliente con el buscador de Clientes (HU-22): la nueva consulta (HU-24) y la reserva directa (HU-30). La
// elección va en la dirección (`hrefCliente`); "Cliente nuevo" es opcional (la reserva pide un cliente ya registrado).

type Props = {
  q: string;
  /** A dónde lleva elegir un cliente, por ejemplo "/panel/consultas/nueva?cliente=12". */
  hrefCliente: (id: number) => Route;
  /** Si se puede registrar ahí mismo: la dirección de "Cliente nuevo". */
  hrefNuevo?: Route;
};

export async function ElegirCliente({ q, hrefCliente, hrefNuevo }: Props) {
  const { clientes, hayMas } = await buscarClientes(q);
  const sugerencia = hrefNuevo ? " Regístralo con «Cliente nuevo»." : " Regístralo primero en Clientes.";
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-heading text-2xl font-bold italic">Cliente</h2>
        {hrefNuevo && (
          <Link href={hrefNuevo} className={cn(buttonVariants({ variant: "outline" }))}>
            <UserPlusIcon />
            Cliente nuevo
          </Link>
        )}
      </div>
      <BuscadorClientes />
      {clientes.length === 0 ? (
        <EstadoVacio>{q ? `No hay clientes con «${q.trim()}».${sugerencia}` : `Todavía no hay clientes.${sugerencia}`}</EstadoVacio>
      ) : (
        <ul aria-label="Elegir cliente" className="flex flex-col gap-2">
          {clientes.map((c) => (
            <li key={c.id}>
              <Link href={hrefCliente(c.id)} className="flex flex-col gap-0.5 rounded-sm border border-border p-4 hover:bg-superficie">
                <span className="truncate font-semibold">{c.nombre}</span>
                <span className="flex flex-wrap gap-x-3 text-sm text-tinta-suave">
                  <span className="whitespace-nowrap">{formatearWhatsApp(c.telefono)}</span>
                  {c.placas.map((p) => (
                    <span key={p} className="whitespace-nowrap">{p}</span>
                  ))}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {hayMas && <p className="text-sm text-tinta-suave">Hay más clientes: escribe algo más preciso para encontrar el que buscas.</p>}
    </div>
  );
}
