import { cn } from "cn";
import { Insignia } from "@/componentes/panel/insignia";
import { MarcaEstado } from "@/componentes/panel/marca-estado";
import { CeldaDoble, TablaLista, type ColumnaTabla } from "@/componentes/panel/tabla-lista";
import { cantidad } from "@/lib/cantidad";
import { fechaConMes, fechaEnBolivia } from "@/lib/fechas";
import type { FilaCotizacion } from "../consultas/lista";
import { bs, diasDesde, NOMBRE_ESTADO, NOMBRE_MOTIVO, sinRespuesta, textoDias, TONO_ESTADO, type Vista } from "../reglas";
import { conDesde } from "@/lib/volver";

// Cotizaciones en una tabla (pedido 23; pedido 26): en Cotizaciones y en la ficha del cliente. Cada fila: el número, el
// cliente con su vehículo (en la ficha del cliente, solo el vehículo: ya se sabe de quién son), los servicios, el total y
// hace cuánto. Desde `umbral` días (Configuración) una pendiente espera respuesta y lo dice en una insignia de aviso.
// En el celular, el cliente y el total arriba. Una aceptada sin reserva lleva "Sin fecha" (pedido 31). En la ficha del
// cliente, el número arriba, como en la computadora (inventario-pantallas.md, cambio 4), y la placa siempre.
// Recorrido visual del 22/11: en el celular, sin el número (la placa y el modelo entran en un renglón); la columna del
// tiempo dice qué mide según la pestaña ("Enviada", "Aceptada", "Rechazada"); las rechazadas, su motivo; las aceptadas
// con reserva, para cuándo; y más lugar para los servicios.

type Props = {
  cotizaciones: FilaCotizacion[];
  umbral: number;
  sinCliente?: boolean;
  /** El estado en cada fila. Sin él, en una pestaña que ya lo dice: no se repite. */
  conEstado?: boolean;
  /** La pantalla de la que salen sus enlaces: "Volver" lleva ahí, con su pestaña y búsqueda (pedido 43). */
  desde?: string;
  /** La pestaña: el título de la columna del tiempo y lo que dice cada fila. */
  vista?: Vista;
};

/** Qué mide la columna del tiempo en cada pestaña: desde cuándo está así. */
const TITULO_TIEMPO: Record<Vista, string> = { pendientes: "Enviada", aceptadas: "Aceptada", rechazadas: "Rechazada" };

/** Una columna con lo que pone en cada fila: van juntas, así una celda no cae bajo el título de otra. */
type Columna = ColumnaTabla & { celda: (c: FilaCotizacion) => React.ReactNode };

export function ListaCotizaciones({ cotizaciones, umbral, sinCliente = false, conEstado = true, desde, vista }: Props) {
  const hoy = new Date();
  const hoyBolivia = fechaEnBolivia(hoy);
  const columnas: (Columna | false)[] = [
    // En la ficha del cliente, el número es lo que identifica a la fila, también en el celular
    // En el celular, con el cliente, el número va en el renglón de su vehículo (C7 fase 3: la fila tenía 5 renglones)
    { titulo: "Número", ancho: "6.5rem", movil: sinCliente ? "titulo" : "oculta", celda: (c) => <span className="font-semibold tabular-nums">{c.numero}</span> },
    !sinCliente && {
      titulo: "Cliente",
      ancho: "minmax(0,1fr)",
      movil: "titulo",
      celda: (c) => (
        <CeldaDoble
          principal={c.cliente}
          // De un interesado (P31b): todavía no está en Clientes. El número, en su columna (en el celular, en la ficha)
          secundario={[c.placa, c.vehiculo, c.interesado && "Sin registrar"].filter(Boolean).join(", ")}
        />
      ),
    },
    // De ancho fijo: la placa y el modelo entran, y el estado queda en una línea
    sinCliente && { titulo: "Vehículo", ancho: "8.5rem", movil: "detalle", celda: (c) => <CeldaDoble principal={c.placa} secundario={c.vehiculo} peso="placa" /> },
    { titulo: "Servicios", ancho: "minmax(0,1.6fr)", movil: "detalle", celda: (c) => c.servicios },
    { titulo: "Total", ancho: "7rem", alinear: "derecha", movil: "estado", celda: (c) => <span className="font-semibold tabular-nums">{bs(c.total)}</span> },
    {
      titulo: conEstado ? "Estado" : vista ? TITULO_TIEMPO[vista] : "Movimiento",
      // Con lugar para «No respondió · hace 12 días» en un renglón
      ancho: "minmax(13rem,1.1fr)",
      movil: "detalle",
      celda: (c) => {
        const dias = diasDesde(c.ultimoMovimientoAt, hoy);
        return (
          <span className="flex flex-wrap items-center gap-1.5">
            {conEstado && <Insignia tono={TONO_ESTADO[c.estado]}>{NOMBRE_ESTADO[c.estado]}</Insignia>}
            {/* Aceptada sin reserva (pedido 31): falta darle fecha; con reserva, para cuándo */}
            {c.sinFecha && <Insignia tono="aviso">Sin fecha</Insignia>}
            {c.estado === "confirmado" && c.fechaReserva && (
              <span className="font-medium">
                {c.fechaReserva >= hoyBolivia ? "Reservada para el" : "Reservada el"} {fechaConMes(c.fechaReserva, hoyBolivia)}
              </span>
            )}
            {/* Rechazada: por qué se perdió, y después hace cuánto */}
            {c.estado === "perdido" && c.motivo && (
              <MarcaEstado tono="peligro">
                <span className="whitespace-nowrap">
                  <span className="font-medium">{NOMBRE_MOTIVO[c.motivo]}</span>
                  <span className="text-tinta-suave"> · {textoDias(dias)}</span>
                </span>
              </MarcaEstado>
            )}
            {/* Esperando respuesta, los días van en el aviso: no se repiten. Con su reserva, la fecha alcanza */}
            {sinRespuesta(c.estado, dias, umbral) ? (
              <Insignia tono="aviso">Sin respuesta hace {cantidad(dias, "día", "días")}</Insignia>
            ) : (
              !(c.estado === "confirmado" && c.fechaReserva) &&
              !(c.estado === "perdido" && c.motivo) && (
                <span className={cn("inline-block text-tinta-suave", !(c.estado === "perdido" && c.motivo) && "first-letter:uppercase")}>{textoDias(dias)}</span>
              )
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
      filas={cotizaciones.map((c) => ({ href: conDesde(`/panel/cotizaciones/${c.id}`, desde), celdas: visibles.map((col) => col.celda(c)) }))}
    />
  );
}
