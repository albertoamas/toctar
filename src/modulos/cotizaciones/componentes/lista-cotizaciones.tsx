import { Insignia } from "@/componentes/panel/insignia";
import { CeldaDoble, TablaLista, type ColumnaTabla } from "@/componentes/panel/tabla-lista";
import { cantidad } from "@/lib/cantidad";
import type { FilaCotizacion } from "../consultas";
import { bs, diasDesde, NOMBRE_ESTADO, sinRespuesta, textoDias, TONO_ESTADO } from "../reglas";

// Cotizaciones en una tabla (pedido 23; pedido 26): en Cotizaciones y en la ficha del cliente. Cada fila: el número, el
// cliente con su vehículo (en la ficha del cliente, solo el vehículo: ya se sabe de quién son), los servicios, el total y
// hace cuánto. Desde `umbral` días (Configuración) una pendiente espera respuesta y lo dice en una insignia de aviso.
// En el celular, el cliente y el total arriba. Una aceptada sin reserva lleva "Sin fecha" (pedido 31). En la ficha del
// cliente, el número arriba (como en la computadora) y el vehículo solo si tiene más de uno (inventario-pantallas.md,
// cambio 4: con uno, cada fila repetía su placa).

type Props = {
  cotizaciones: FilaCotizacion[];
  umbral: number;
  sinCliente?: boolean;
  /** Con `sinCliente`: el vehículo en cada fila. Sin él, el cliente tiene uno solo y ya se sabe cuál es. */
  conVehiculo?: boolean;
  /** El estado en cada fila. Sin él, en una pestaña que ya lo dice: no se repite. */
  conEstado?: boolean;
};

export function ListaCotizaciones({ cotizaciones, umbral, sinCliente = false, conVehiculo = true, conEstado = true }: Props) {
  const hoy = new Date();
  const segunda = !sinCliente || conVehiculo;
  const columnas: ColumnaTabla[] = [
    { titulo: "Número", ancho: "6.5rem", movil: sinCliente ? "titulo" : "detalle" },
    ...(segunda ? [{ titulo: sinCliente ? "Vehículo" : "Cliente", ancho: "minmax(0,1.3fr)", movil: sinCliente ? "detalle" : "titulo" } as const] : []),
    { titulo: "Servicios", ancho: "minmax(0,1.3fr)", movil: "detalle" },
    { titulo: "Total", ancho: "7rem", alinear: "derecha", movil: "estado" },
    { titulo: conEstado ? "Estado" : "Movimiento", ancho: "minmax(0,1.1fr)", movil: "detalle" },
  ];
  return (
    <TablaLista
      etiqueta="Cotizaciones"
      columnas={columnas}
      filas={cotizaciones.map((c) => {
        const dias = diasDesde(c.ultimoMovimientoAt, hoy);
        const esperando = sinRespuesta(c.estado, dias, umbral);
        const vehiculo = [c.placa, c.vehiculo].filter(Boolean).join(", ");
        return {
          href: `/panel/cotizaciones/${c.id}`,
          celdas: [
            <span key="n" className="font-semibold tabular-nums">
              {c.numero}
            </span>,
            ...(!segunda ? [] : sinCliente ? [<CeldaDoble key="c" principal={c.placa} secundario={c.vehiculo} peso="placa" />] : [<CeldaDoble key="c" principal={c.cliente} secundario={vehiculo} />]),
            c.servicios,
            <span key="t" className="font-semibold tabular-nums">
              {bs(c.total)}
            </span>,
            <span key="e" className="flex flex-wrap items-center gap-1.5">
              {conEstado && <Insignia tono={TONO_ESTADO[c.estado]}>{NOMBRE_ESTADO[c.estado]}</Insignia>}
              {/* Aceptada sin reserva (pedido 31): falta darle fecha */}
              {c.sinFecha && <Insignia tono="aviso">Sin fecha</Insignia>}
              {/* Esperando respuesta, los días van en el aviso: no se repiten */}
              {esperando ? <Insignia tono="aviso">Sin respuesta hace {cantidad(dias, "día", "días")}</Insignia> : <span className="inline-block text-tinta-suave first-letter:uppercase">{textoDias(dias)}</span>}
            </span>,
          ],
        };
      })}
    />
  );
}
