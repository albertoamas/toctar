import { Insignia } from "@/componentes/panel/insignia";
import { CeldaDoble, TablaLista, type ColumnaTabla } from "@/componentes/panel/tabla-lista";
import { formatearFecha } from "@/lib/fechas";
import { mostrarMonto } from "@/modulos/catalogo/reglas";
import { rutaTrabajo } from "@/modulos/ordenes/reglas";
import { estaPagada } from "@/modulos/pagos/reglas";
import type { ReservaDelCliente } from "../consultas";
import { NOMBRE_ESTADO_TRABAJO, TONO_ESTADO_TRABAJO } from "../reglas";

// Las reservas de un cliente, en su ficha (HU-32), en una tabla como sus cotizaciones (inventario-pantallas.md, cambio 4:
// eran tarjetas al lado de la tabla de cotizaciones). Cada fila: la fecha, el espacio, el vehículo si tiene más de uno, el
// saldo para quien ve pagos y el estado. Una ya recibida abre su orden, si quien mira ve órdenes.

type Props = {
  reservas: ReservaDelCliente[];
  verOrdenes: boolean;
  /** La placa en cada fila: solo si el cliente tiene o tuvo más de un vehículo. Con uno, ya se sabe cuál es. */
  conVehiculo: boolean;
};

export function ReservasCliente({ reservas, verOrdenes, conVehiculo }: Props) {
  // Sin Pagos, las reservas llegan sin saldo: la columna no se muestra
  const conSaldo = reservas.some((r) => r.saldo);
  const columnas: (ColumnaTabla | false)[] = [
    { titulo: "Fecha", ancho: "7rem", movil: "titulo" },
    { titulo: "Espacio", ancho: "minmax(0,1fr)", movil: "detalle" },
    conVehiculo && { titulo: "Vehículo", ancho: "minmax(0,1fr)", movil: "detalle" },
    conSaldo && { titulo: "Saldo", ancho: "7rem", alinear: "derecha", movil: "estado" },
    { titulo: "Estado", ancho: "minmax(0,1fr)", movil: "detalle" },
  ];
  return (
    <TablaLista
      etiqueta="Reservas"
      columnas={columnas.filter((c) => c !== false)}
      filas={reservas.map((r) => {
        const celdas: (React.ReactNode | false)[] = [
          <span key="f" className="font-semibold tabular-nums">
            {formatearFecha(r.fechaInicio)}
          </span>,
          r.espacio,
          conVehiculo && <CeldaDoble key="v" principal={r.placa} peso="placa" />,
          // El saldo de una cancelada no se cobra: no se muestra. En el celular, sin el título de la columna, dice qué es
          conSaldo &&
            (r.saldo && r.estado !== "cancelado" ? (
              <span key="s" className="font-semibold tabular-nums">
                {estaPagada(r.saldo.saldo) ? (
                  "Pagado"
                ) : (
                  <>
                    <span className="@2xl:sr-only">Saldo: </span>
                    {mostrarMonto(r.saldo.saldo)} Bs
                  </>
                )}
              </span>
            ) : null),
          <Insignia key="e" tono={TONO_ESTADO_TRABAJO[r.estado]}>
            {NOMBRE_ESTADO_TRABAJO[r.estado]}
          </Insignia>,
        ];
        return { href: rutaTrabajo(r.id, r.estado, verOrdenes), celdas: celdas.filter((c) => c !== false) };
      })}
    />
  );
}
