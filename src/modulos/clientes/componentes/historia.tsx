import { Alerta } from "@/componentes/panel/alerta";
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
import { esOrden, resumenServicios, rutaTrabajo } from "@/modulos/ordenes/reglas";
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
  /** En la del cliente: la placa en cada fila solo si tiene más de un vehículo (26/11: con uno, se repetía igual). */
  variosVehiculos?: boolean;
}): HitoHistoria[] {
  const { reservas, cotizaciones, verOrdenes, conSaldo, umbral, desde, duenoActual, variosVehiculos = true } = props;
  const hoy = new Date();
  // En la del cliente, la placa; en la del vehículo, "Con {cliente}" si fue con un dueño anterior
  const placaDe = (placa: string | null) => (duenoActual === undefined && variosVehiculos ? (placa ?? undefined) : undefined);
  const conOtro = (clienteId: number | null, nombre: string) => (duenoActual !== undefined && clienteId !== duenoActual ? [`Con ${nombre}`] : []);
  const deReservas: HitoHistoria[] = (reservas ?? []).map((r) => {
    // Lo que debe, solo cuando ya se cobra (lista o entregada): antes, un saldo es lo normal (el adelanto)
    const debe = conSaldo && r.saldo && (r.estado === "listo" || r.estado === "entregado") && !estaPagada(r.saldo.saldo) ? r.saldo.saldo : null;
    return {
      clave: `t${r.id}`,
      href: conDesde(rutaTrabajo(r.id, r.estado, verOrdenes), desde),
      fecha: r.fechaInicio,
      titulo: esOrden(r.estado) ? "Orden" : "Reserva",
      insignias: (
        <>
          <Insignia tono={TONO_ESTADO_TRABAJO[r.estado]}>{NOMBRE_ESTADO_TRABAJO[r.estado]}</Insignia>
          {debe && <Alerta tipo="dinero">Debe {mostrarMonto(debe)} Bs</Alerta>}
        </>
      ),
      placa: placaDe(r.placa),
      // Los servicios cortos, como en el Taller (26/11): el primero y "+ N más"
      partes: [resumenServicios(r.servicios), ...conOtro(r.clienteId, r.cliente)].filter(Boolean),
      monto: conSaldo && r.saldo && r.estado !== "cancelado" ? `${mostrarMonto(r.saldo.total)} Bs` : undefined,
    };
  });
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
        titulo: `Cotización ${c.numero}`,
        insignias: (
          <>
            <Insignia tono={TONO_ESTADO[c.estado]}>{NOMBRE_ESTADO[c.estado]}</Insignia>
            {c.sinFecha && <Alerta tipo="fecha">Sin fecha</Alerta>}
            {sinRespuesta(c.estado, dias, umbral) && <Alerta tipo="tiempo">Sin respuesta hace {cantidad(dias, "día", "días")}</Alerta>}
          </>
        ),
        placa: placaDe(c.placa),
        partes: [resumenServicios(c.listaServicios), ...conOtro(c.clienteId, c.cliente)].filter(Boolean),
        // Quien ve Cotizaciones ve sus precios (pedido 24)
        monto: bs(c.total),
      };
    });
  return ordenarHistoria([...deReservas, ...deCotizaciones]);
}
