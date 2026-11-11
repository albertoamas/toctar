import { Insignia } from "@/componentes/panel/insignia";
import { CeldaDoble, TablaLista, type ColumnaTabla } from "@/componentes/panel/tabla-lista";
import { formatearFecha } from "@/lib/fechas";
import { mostrarMonto } from "@/modulos/catalogo/reglas";
import { rutaTrabajo } from "@/modulos/ordenes/reglas";
import { estaPagada } from "@/modulos/pagos/reglas";
import type { ReservaDelCliente } from "../consultas";
import { NOMBRE_ESTADO_TRABAJO, TONO_ESTADO_TRABAJO } from "../reglas";
import { conDesde } from "@/lib/volver";

// Las reservas de un cliente, en su ficha (HU-32), en una tabla como sus cotizaciones (inventario-pantallas.md, cambio 4:
// eran tarjetas al lado de la tabla de cotizaciones). Cada fila: la fecha, el espacio, el vehículo (siempre, aunque tenga
// uno solo: la placa es como se reconoce un trabajo en el taller), el saldo para quien ve pagos y el estado. Una ya recibida abre su orden, si quien mira ve órdenes.

type Props = {
  reservas: ReservaDelCliente[];
  verOrdenes: boolean;
  /** El saldo de cada una: para quien ve pagos (sin el permiso, las reservas llegan sin él). */
  conSaldo: boolean;
  /** La ficha de la que salen sus enlaces: "Volver" lleva ahí (pedido 43). */
  desde: string;
};

/** Una columna con lo que pone en cada fila: van juntas, así una celda no cae bajo el título de otra. */
type Columna = ColumnaTabla & { celda: (r: ReservaDelCliente) => React.ReactNode };

/** En el celular, sin el título de la columna, dice qué es: "Saldo: 1900 Bs". */
function Saldo({ saldo }: { saldo: string }) {
  return (
    <span className="font-semibold tabular-nums">
      {estaPagada(saldo) ? (
        "Pagado"
      ) : (
        <>
          <span className="@2xl:sr-only">Saldo: </span>
          {mostrarMonto(saldo)} Bs
        </>
      )}
    </span>
  );
}

export function ReservasCliente({ reservas, verOrdenes, conSaldo, desde }: Props) {
  const columnas: (Columna | false)[] = [
    {
      titulo: "Fecha",
      ancho: "7rem",
      movil: "titulo",
      celda: (r) => <span className="font-semibold tabular-nums">{formatearFecha(r.fechaInicio)}</span>,
    },
    { titulo: "Espacio", ancho: "minmax(0,1fr)", movil: "detalle", celda: (r) => r.espacio },
    { titulo: "Vehículo", ancho: "minmax(0,1fr)", movil: "detalle", celda: (r) => <CeldaDoble principal={r.placa} peso="placa" /> },
    // El saldo de una cancelada no se cobra: no se muestra
    conSaldo && { titulo: "Saldo", ancho: "7rem", alinear: "derecha", movil: "estado", celda: (r) => (r.saldo && r.estado !== "cancelado" ? <Saldo saldo={r.saldo.saldo} /> : null) },
    {
      titulo: "Estado",
      ancho: "minmax(0,1fr)",
      movil: "detalle",
      celda: (r) => <Insignia tono={TONO_ESTADO_TRABAJO[r.estado]}>{NOMBRE_ESTADO_TRABAJO[r.estado]}</Insignia>,
    },
  ];
  const visibles = columnas.filter((c) => c !== false);
  return (
    <TablaLista
      etiqueta="Reservas"
      columnas={visibles}
      filas={reservas.map((r) => ({
        href: conDesde(rutaTrabajo(r.id, r.estado, verOrdenes), desde),
        celdas: visibles.map((c) => c.celda(r)),
      }))}
    />
  );
}
