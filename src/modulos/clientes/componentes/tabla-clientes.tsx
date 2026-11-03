import type { Route } from "next";
import { TablaLista } from "@/componentes/panel/tabla-lista";
import { formatearWhatsApp } from "@/lib/whatsapp";
import type { FilaCliente } from "../consultas";
import { placasEnFila, type Busqueda } from "../reglas";

// Clientes en una tabla (pedido 26): el nombre, sus vehículos (las placas, con la buscada primero) y su WhatsApp. La usan
// la lista de Clientes y elegir al cliente en Nueva cotización y Nueva reserva, así las dos se ven y se leen igual. En
// el celular, el nombre arriba y las placas y el WhatsApp de a dos debajo.

type Props = {
  etiqueta: string;
  clientes: FilaCliente[];
  busqueda: Busqueda | null;
  /** A dónde lleva cada fila: su ficha, o elegirlo para una cotización o una reserva. */
  href: (id: number) => Route;
  /** Los desactivados, en tinta suave. */
  atenuadas?: boolean;
};

export function TablaClientes({ etiqueta, clientes, busqueda, href, atenuadas = false }: Props) {
  return (
    <TablaLista
      etiqueta={etiqueta}
      columnas={[
        { titulo: "Cliente", ancho: "minmax(0,1.3fr)", movil: "titulo" },
        { titulo: "Vehículos", ancho: "minmax(0,1.2fr)", movil: "par" },
        { titulo: "WhatsApp", ancho: "10rem", movil: "par" },
      ]}
      filas={clientes.map((c) => {
        const placas = placasEnFila(c.placas, busqueda);
        return {
          href: href(c.id),
          atenuada: atenuadas,
          celdas: [
            <span key="n" className="font-semibold">
              {c.nombre}
            </span>,
            placas ? (
              <span key="p" className="tt-placa">
                {placas}
              </span>
            ) : (
              <span key="p" className="text-tinta-suave">
                Sin vehículos
              </span>
            ),
            <span key="w" className="tabular-nums">
              {formatearWhatsApp(c.telefono)}
            </span>,
          ],
        };
      })}
    />
  );
}
