import type { Route } from "next";
import Link from "next/link";
import { cn } from "cn";
import { UserPlusIcon } from "lucide-react";
import { Seccion } from "@/componentes/panel/cabecera-seccion";
import { buttonVariants } from "@/componentes/ui/button";
import { buscarClientes } from "../consultas";
import { normalizarBusqueda } from "../reglas";
import { Buscador } from "@/componentes/panel/buscador";
import { TablaClientes } from "./tabla-clientes";

// Elegir al cliente con el buscador de Clientes (HU-22): la nueva cotización (pedido 23) y la reserva directa (HU-30). La
// elección va en la dirección (`hrefCliente`); "Cliente nuevo" es opcional (la reserva pide un cliente ya registrado).
// Pulido 9.2: la misma tabla que la lista de Clientes (TablaClientes, pedido 26).

type Props = {
  q: string;
  /** A dónde lleva elegir un cliente, por ejemplo "/panel/cotizaciones/nueva?cliente=12". */
  hrefCliente: (id: number) => Route;
  /** Si se puede registrar ahí mismo: la dirección de "Cliente nuevo". */
  hrefNuevo?: Route;
  /** El título de la sección. Por defecto, "Cliente". */
  titulo?: string;
  /** Quien no se puede elegir: el dueño actual, al cambiar de dueño un vehículo (pedido 37). */
  excepto?: number;
};

export async function ElegirCliente({ q, hrefCliente, hrefNuevo, titulo = "Cliente", excepto }: Props) {
  const { clientes, hayMas } = await buscarClientes(q, false, excepto);
  const otros = excepto ? "otros clientes" : "clientes";
  const sugerencia = hrefNuevo ? " Regístralo con «Cliente nuevo»." : " Regístralo primero en Clientes.";
  const busqueda = normalizarBusqueda(q);
  return (
    // En su tarjeta con el título adentro, como las demás secciones (C7, 18/11): el buscador arriba y la tabla sin su marco
    <Seccion
      id="cliente"
      titulo={titulo}
      sinRelleno
      accion={
        hrefNuevo && (
          <Link href={hrefNuevo} className={cn(buttonVariants({ variant: "outline" }))}>
            <UserPlusIcon />
            Cliente nuevo
          </Link>
        )
      }
    >
      <div className="p-4 sm:px-4">
        <Buscador />
      </div>
      {clientes.length === 0 ? (
        <p className="px-4 pb-4 text-tinta-suave">{q ? `No hay ${otros} con «${q.trim()}».${sugerencia}` : `Todavía no hay ${otros}.${sugerencia}`}</p>
      ) : (
        <div className="border-t border-border">
          <TablaClientes etiqueta="Elegir cliente" clientes={clientes} busqueda={busqueda} href={hrefCliente} />
        </div>
      )}
      {hayMas && <p className="border-t border-border px-4 py-3 text-sm text-tinta-suave">Hay más clientes: escribe algo más preciso para encontrar el que buscas.</p>}
    </Seccion>
  );
}
