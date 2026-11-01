import type { Route } from "next";
import Link from "next/link";
import { cn } from "cn";
import { UserPlusIcon } from "lucide-react";
import { EstadoVacio } from "@/componentes/panel/estado-vacio";
import { ListaFilas } from "@/componentes/panel/fila-lista";
import { CabeceraSeccion } from "@/componentes/panel/seccion-con-editar";
import { buttonVariants } from "@/componentes/ui/button";
import { formatearWhatsApp } from "@/lib/whatsapp";
import { buscarClientes } from "../consultas";
import { normalizarBusqueda, placasEnFila } from "../reglas";
import { BuscadorClientes } from "./buscador-clientes";

// Elegir al cliente con el buscador de Clientes (HU-22): la nueva cotización (pedido 23) y la reserva directa (HU-30). La
// elección va en la dirección (`hrefCliente`); "Cliente nuevo" es opcional (la reserva pide un cliente ya registrado).
// Pulido 9.2: la misma fila que la lista de Clientes (8.1), con las placas en negrita.

type Props = {
  q: string;
  /** A dónde lleva elegir un cliente, por ejemplo "/panel/cotizaciones/nueva?cliente=12". */
  hrefCliente: (id: number) => Route;
  /** Si se puede registrar ahí mismo: la dirección de "Cliente nuevo". */
  hrefNuevo?: Route;
};

export async function ElegirCliente({ q, hrefCliente, hrefNuevo }: Props) {
  const { clientes, hayMas } = await buscarClientes(q);
  const sugerencia = hrefNuevo ? " Regístralo con «Cliente nuevo»." : " Regístralo primero en Clientes.";
  const busqueda = normalizarBusqueda(q);
  return (
    <div className="flex flex-col gap-4">
      <CabeceraSeccion id="cliente" titulo="Cliente">
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
        <ListaFilas
          etiqueta="Elegir cliente"
          filas={clientes.map((c) => {
            const placas = placasEnFila(c.placas, busqueda);
            return {
              href: hrefCliente(c.id),
              titulo: c.nombre,
              dato: placas,
              detalles: placas ? [formatearWhatsApp(c.telefono)] : [formatearWhatsApp(c.telefono), "Sin vehículos"],
            };
          })}
        />
      )}
      {hayMas && <p className="text-sm text-tinta-suave">Hay más clientes: escribe algo más preciso para encontrar el que buscas.</p>}
    </div>
  );
}
