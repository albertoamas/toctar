import type { Route } from "next";
import { TablaLista } from "@/componentes/panel/tabla-lista";
import { formatearWhatsApp } from "@/lib/whatsapp";
import type { FilaCliente } from "../consultas";
import { coincidenciaDeCliente, placasEnFila, type Busqueda } from "../reglas";

// Clientes en una tabla (pedido 26): el nombre, sus vehículos (las placas, con la buscada primero) y su WhatsApp. La usan
// la lista de Clientes y elegir al cliente en Nueva cotización y Nueva reserva, así las dos se ven y se leen igual. En
// el celular (26/11), dos renglones: el nombre y, debajo, sus placas (eran tres, con el WhatsApp). Sin el teléfono: con
// varios autos no entraba en un renglón, y para escribirle está la ficha. Si se buscó por teléfono, el teléfono en lugar
// de las placas, para que se vea por qué apareció.

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
        // En el celular van en el renglón de debajo del nombre (en la celda del cliente)
        { titulo: "Vehículos", ancho: "minmax(0,1.2fr)", movil: "oculta" },
        { titulo: "WhatsApp", ancho: "10rem", movil: "oculta" },
      ]}
      filas={clientes.map((c) => {
        const placas = placasEnFila(c.placas, busqueda);
        // En el celular, dos: con tres y "y 2 más" no entraba en un renglón de 360 px
        const placasCelular = placasEnFila(c.placas, busqueda, 2);
        const coincidencia = coincidenciaDeCliente(c, busqueda);
        const porTelefono = coincidencia?.startsWith("WhatsApp") ? coincidencia : null;
        return {
          href: href(c.id),
          atenuada: atenuadas,
          celdas: [
            <span key="n" className="flex min-w-0 flex-col gap-0.5">
              <span className="font-semibold">{c.nombre}</span>
              <span className="text-tinta-suave @2xl:hidden">
                {porTelefono ? (
                  <span className="tabular-nums">{porTelefono}</span>
                ) : placas ? (
                  <span className="tt-placa font-medium text-tinta-media">{placasCelular}</span>
                ) : (
                  "Sin vehículos"
                )}
              </span>
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
