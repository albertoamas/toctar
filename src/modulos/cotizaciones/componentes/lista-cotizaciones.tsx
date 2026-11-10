import { Insignia } from "@/componentes/panel/insignia";
import { CeldaDoble, TablaLista, type ColumnaTabla } from "@/componentes/panel/tabla-lista";
import { cantidad } from "@/lib/cantidad";
import type { FilaCotizacion } from "../consultas";
import { bs, diasDesde, NOMBRE_ESTADO, sinRespuesta, textoDias, TONO_ESTADO } from "../reglas";

// Cotizaciones en una tabla (pedido 23; pedido 26): en Cotizaciones y en la ficha del cliente. Cada fila: el número, el
// cliente con su vehículo (en la ficha del cliente, solo el vehículo: ya se sabe de quién son), los servicios, el total y
// hace cuánto. Desde `umbral` días (Configuración) una pendiente espera respuesta y lo dice en una insignia de aviso.
// En el celular, el cliente y el total arriba. Una aceptada sin reserva lleva "Sin fecha" (pedido 31). En la ficha del
// cliente, el número arriba, como en la computadora (inventario-pantallas.md, cambio 4), y la placa siempre.

type Props = {
  cotizaciones: FilaCotizacion[];
  umbral: number;
  sinCliente?: boolean;
  /** El estado en cada fila. Sin él, en una pestaña que ya lo dice: no se repite. */
  conEstado?: boolean;
};

/** Una columna con lo que pone en cada fila: van juntas, así una celda no cae bajo el título de otra. */
type Columna = ColumnaTabla & { celda: (c: FilaCotizacion) => React.ReactNode };

export function ListaCotizaciones({ cotizaciones, umbral, sinCliente = false, conEstado = true }: Props) {
  const hoy = new Date();
  const columnas: (Columna | false)[] = [
    // En la ficha del cliente, el número es lo que identifica a la fila, también en el celular
    { titulo: "Número", ancho: "6.5rem", movil: sinCliente ? "titulo" : "detalle", celda: (c) => <span className="font-semibold tabular-nums">{c.numero}</span> },
    !sinCliente && {
      titulo: "Cliente",
      ancho: "minmax(0,1.3fr)",
      movil: "titulo",
      celda: (c) => <CeldaDoble principal={c.cliente} secundario={[c.placa, c.vehiculo].filter(Boolean).join(", ")} />,
    },
    // De ancho fijo: la placa y el modelo entran, y el estado queda en una línea
    sinCliente && { titulo: "Vehículo", ancho: "8.5rem", movil: "detalle", celda: (c) => <CeldaDoble principal={c.placa} secundario={c.vehiculo} peso="placa" /> },
    { titulo: "Servicios", ancho: "minmax(0,1.3fr)", movil: "detalle", celda: (c) => c.servicios },
    { titulo: "Total", ancho: "7rem", alinear: "derecha", movil: "estado", celda: (c) => <span className="font-semibold tabular-nums">{bs(c.total)}</span> },
    {
      titulo: conEstado ? "Estado" : "Movimiento",
      ancho: "minmax(0,1.1fr)",
      movil: "detalle",
      celda: (c) => {
        const dias = diasDesde(c.ultimoMovimientoAt, hoy);
        return (
          <span className="flex flex-wrap items-center gap-1.5">
            {conEstado && <Insignia tono={TONO_ESTADO[c.estado]}>{NOMBRE_ESTADO[c.estado]}</Insignia>}
            {/* Aceptada sin reserva (pedido 31): falta darle fecha */}
            {c.sinFecha && <Insignia tono="aviso">Sin fecha</Insignia>}
            {/* Esperando respuesta, los días van en el aviso: no se repiten */}
            {sinRespuesta(c.estado, dias, umbral) ? (
              <Insignia tono="aviso">Sin respuesta hace {cantidad(dias, "día", "días")}</Insignia>
            ) : (
              <span className="inline-block text-tinta-suave first-letter:uppercase">{textoDias(dias)}</span>
            )}
          </span>
        );
      },
    },
  ];
  const visibles = columnas.filter((c) => c !== false);
  return (
    <TablaLista
      etiqueta="Cotizaciones"
      columnas={visibles}
      filas={cotizaciones.map((c) => ({ href: `/panel/cotizaciones/${c.id}`, celdas: visibles.map((col) => col.celda(c)) }))}
    />
  );
}
