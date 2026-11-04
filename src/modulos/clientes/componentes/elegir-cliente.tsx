import type { Route } from "next";
import Link from "next/link";
import { cn } from "cn";
import { UserPlusIcon } from "lucide-react";
import { EstadoVacio } from "@/componentes/panel/estado-vacio";
import { CabeceraSeccion } from "@/componentes/panel/seccion-con-editar";
import { buttonVariants } from "@/componentes/ui/button";
import { buscarClientes } from "../consultas";
import { normalizarBusqueda } from "../reglas";
import { BuscadorClientes } from "./buscador-clientes";
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
  const { clientes: encontrados, hayMas } = await buscarClientes(q);
  const clientes = encontrados.filter((c) => c.id !== excepto);
  const sugerencia = hrefNuevo ? " Regístralo con «Cliente nuevo»." : " Regístralo primero en Clientes.";
  const busqueda = normalizarBusqueda(q);
  return (
    <div className="flex flex-col gap-4">
      <CabeceraSeccion id="cliente" titulo={titulo}>
        {hrefNuevo && (
          <Link href={hrefNuevo} className={cn(buttonVariants({ variant: "outline" }))}>
            <UserPlusIcon />
            Cliente nuevo
          </Link>
        )}
      </CabeceraSeccion>
      <BuscadorClientes />
      {clientes.length === 0 ? (
        <EstadoVacio>{q ? `No hay clientes con «${q.trim()}».${sugerencia}` : `Todavía no hay clientes.${sugerencia}`}</EstadoVacio>
      ) : (
        <TablaClientes etiqueta="Elegir cliente" clientes={clientes} busqueda={busqueda} href={hrefCliente} />
      )}
      {hayMas && <p className="text-sm text-tinta-suave">Hay más clientes: escribe algo más preciso para encontrar el que buscas.</p>}
    </div>
  );
}
