import Link from "next/link";
import { Insignia } from "@/componentes/panel/insignia";
import { formatearFecha } from "@/lib/fechas";
import { conDesde } from "@/lib/volver";
import { enlaceTrabajo } from "@/modulos/ordenes/reglas";
import type { MantenimientoDelCliente } from "../consultas";
import { ESTADOS_RECORDATORIO_ABIERTO, NOMBRE_ESTADO_RECORDATORIO, textoCadaMeses } from "../reglas";
import { MasPlan } from "./planes";

// Los mantenimientos de un cliente (HU-38, pedido 21) o de un vehículo (pedido 51), en su ficha: cada uno con su fecha,
// su servicio, cada cuántos meses y su estado; el agendado lleva a su reserva (o a su orden, si ya se recibió) y el
// hecho, a la orden que lo hizo. Los abiertos de un vehículo activo se ajustan o se terminan en su "Más" (MasPlan).

type Props = {
  mantenimientos: MantenimientoDelCliente[];
  /** Se ajustan los abiertos: el cliente (el dueño) está activo. */
  editables: boolean;
  ve: { ordenes: boolean; agenda: boolean };
  /** La ficha de la que salen sus enlaces: "Volver" lleva ahí (pedido 43). */
  desde: string;
  hoy: string;
  /** La placa en cada fila: en la ficha del cliente (puede tener varios); en la del vehículo, no hace falta. */
  conPlaca?: boolean;
};

export function ListaMantenimientos({ mantenimientos, editables, ve, desde, hoy, conPlaca = true }: Props) {
  return (
    <ul aria-label="Mantenimientos" className="flex flex-col divide-y divide-border tt-tarjeta-panel">
      {mantenimientos.map((m) => {
        // Agendado: a su reserva, o a su orden si ya se recibió; hecho: a la orden que lo hizo
        const trabajo = (m.agendado && enlaceTrabajo(m.agendado.id, m.agendado.estado, ve)) || (m.hecho && enlaceTrabajo(m.hecho.id, m.hecho.estado, ve));
        // Sin agendar y de un vehículo activo: se edita o se termina
        const editable = m.vehiculoActivo && editables && (ESTADOS_RECORDATORIO_ABIERTO as readonly string[]).includes(m.estado);
        const detalle = [conPlaca ? m.placa : null, textoCadaMeses(m.intervaloMeses)].filter(Boolean).join(", ");
        return (
          <li key={m.id} className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-1 p-3">
            <span className="flex flex-col">
              <span className="font-semibold">
                {formatearFecha(m.fechaProgramada)}: Mantenimiento de {m.servicio}
              </span>
              <span className="text-sm text-tinta-suave">
                {detalle.charAt(0).toUpperCase() + detalle.slice(1)}
                {!m.vehiculoActivo && ", vehículo desactivado: no se avisa"}
              </span>
              {m.nota && <span className="text-sm text-tinta-suave">Nota: {m.nota}</span>}
            </span>
            <span className="flex flex-wrap items-center gap-3">
              {trabajo && (
                <Link href={conDesde(trabajo.href, desde)} className="inline-flex min-h-11 items-center text-sm font-semibold underline">
                  {trabajo.texto}
                </Link>
              )}
              <Insignia>{NOMBRE_ESTADO_RECORDATORIO[m.estado]}</Insignia>
              {editable && <MasPlan plan={{ id: m.id, intervaloMeses: m.intervaloMeses, fechaProgramada: m.fechaProgramada, servicio: m.servicio }} hoy={hoy} />}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
