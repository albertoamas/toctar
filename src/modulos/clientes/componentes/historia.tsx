import { Insignia } from "@/componentes/panel/insignia";
import { ordenarHistoria, type HitoHistoria } from "@/componentes/panel/linea-de-tiempo";
import { cantidad } from "@/lib/cantidad";
import { fechaEnBolivia } from "@/lib/fechas";
import { conDesde } from "@/lib/volver";
import type { ReservaDelCliente } from "@/modulos/agenda/consultas/listas";
import { NOMBRE_ESTADO_TRABAJO, TONO_ESTADO_TRABAJO } from "@/modulos/agenda/reglas";
import { mostrarMonto } from "@/modulos/catalogo/reglas";
import type { FilaCotizacion } from "@/modulos/cotizaciones/consultas/lista";
import { bs, diasDesde, NOMBRE_ESTADO, sinRespuesta, TONO_ESTADO } from "@/modulos/cotizaciones/reglas";
import { rutaTrabajo } from "@/modulos/ordenes/reglas";
import { estaPagada } from "@/modulos/pagos/reglas";

// La historia de la ficha del cliente y de la del vehículo (C7 §5.6, 18/11): sus reservas y órdenes, y sus cotizaciones,
// en una sola lista (`LineaDeTiempo`). Una cotización aceptada que ya tiene su reserva no se repite: se ve la reserva, que
// lleva a su cotización. Las que se muestran: pendientes, perdidas y aceptadas sin fecha.

export const HISTORIA_CORTA = 5;

/**
 * Las filas de la historia. `reservas`, solo si quien mira ve la Agenda; `cotizaciones`, solo si ve Cotizaciones. En la
 * del cliente, la placa de cada una (puede tener varios vehículos); en la del vehículo (`duenoActual`), "Con {cliente}"
 * si fue con un dueño anterior.
 */
export function historia(props: {
  reservas: ReservaDelCliente[] | null;
  cotizaciones: FilaCotizacion[] | null;
  verOrdenes: boolean;
  /** El saldo de cada reserva: para quien ve pagos (sin el permiso, las reservas llegan sin él, RN-12). */
  conSaldo: boolean;
  umbral: number;
  desde: string;
  duenoActual?: number;
}): HitoHistoria[] {
  const { reservas, cotizaciones, verOrdenes, conSaldo, umbral, desde, duenoActual } = props;
  const hoy = new Date();
  const deQuien = (clienteId: number, nombre: string, placa: string) => (duenoActual === undefined ? placa : clienteId === duenoActual ? undefined : `Con ${nombre}`);
  const deReservas: HitoHistoria[] = (reservas ?? []).map((r) => ({
    clave: `t${r.id}`,
    href: conDesde(rutaTrabajo(r.id, r.estado, verOrdenes), desde),
    fecha: r.fechaInicio,
    titulo: r.servicios || "Reserva",
    detalle: deQuien(r.clienteId, r.cliente, r.placa),
    insignias: <Insignia tono={TONO_ESTADO_TRABAJO[r.estado]}>{NOMBRE_ESTADO_TRABAJO[r.estado]}</Insignia>,
    monto: conSaldo && r.saldo && r.estado !== "cancelado" ? (estaPagada(r.saldo.saldo) ? "Pagado" : `Debe ${mostrarMonto(r.saldo.saldo)} Bs`) : undefined,
  }));
  // Sin la Agenda no se ven las reservas: entonces las cotizaciones aceptadas tampoco se esconden
  const conReservas = reservas !== null;
  const deCotizaciones: HitoHistoria[] = (cotizaciones ?? [])
    .filter((c) => !conReservas || c.estado !== "confirmado" || c.sinFecha)
    .map((c) => {
      const dias = diasDesde(c.ultimoMovimientoAt, hoy);
      return {
        clave: `c${c.id}`,
        href: conDesde(`/panel/cotizaciones/${c.id}`, desde),
        fecha: fechaEnBolivia(c.ultimoMovimientoAt),
        // Sin servicios (una cotización vieja), su número es el título: no se repite abajo
        titulo: c.servicios || `Cotización ${c.numero}`,
        detalle: [c.servicios && `Cotización ${c.numero}`, deQuien(c.clienteId, c.cliente, c.placa)].filter(Boolean).join(" · "),
        insignias: (
          <>
            <Insignia tono={TONO_ESTADO[c.estado]}>{NOMBRE_ESTADO[c.estado]}</Insignia>
            {c.sinFecha && <Insignia tono="aviso">Sin fecha</Insignia>}
            {sinRespuesta(c.estado, dias, umbral) && <Insignia tono="aviso">Sin respuesta hace {cantidad(dias, "día", "días")}</Insignia>}
          </>
        ),
        // Quien ve Cotizaciones ve sus precios (pedido 24)
        monto: bs(c.total),
      };
    });
  return ordenarHistoria([...deReservas, ...deCotizaciones]);
}
