import Link from "next/link";
import { Insignia } from "@/componentes/panel/insignia";
import { ChevronRightIcon } from "lucide-react";
import { fechaConMes } from "@/lib/fechas";
import { conDesde } from "@/lib/volver";
import { enlaceTrabajo } from "@/modulos/ordenes/reglas";
import type { MantenimientoDelCliente } from "../consultas";
import { ESTADOS_RECORDATORIO_ABIERTO, NOMBRE_ESTADO_RECORDATORIO, textoCadaMeses } from "../reglas";
import { MasPlan } from "./planes";

// Los mantenimientos de un cliente (HU-38, pedido 21) o de un vehículo (pedido 51), en su ficha. Con la forma de la
// historia (26/11): el servicio y su estado; debajo, cada cuántos meses y la fecha ("21 ago."). Antes, "21/08/2026:
// Mantenimiento de …" y "Ver la orden" subrayado; el agendado lleva a su reserva (o a su orden, si ya se recibió) y el
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
    <ul aria-label="Mantenimientos" className="flex flex-col divide-y divide-border">
      {mantenimientos.map((m) => {
        // Agendado: a su reserva, o a su orden si ya se recibió; hecho: a la orden que lo hizo
        const trabajo = (m.agendado && enlaceTrabajo(m.agendado.id, m.agendado.estado, ve)) || (m.hecho && enlaceTrabajo(m.hecho.id, m.hecho.estado, ve));
        // Sin agendar y de un vehículo activo: se edita o se termina
        const editable = m.vehiculoActivo && editables && (ESTADOS_RECORDATORIO_ABIERTO as readonly string[]).includes(m.estado);
        const cada = textoCadaMeses(m.intervaloMeses);
        const detalle = [conPlaca ? m.placa : null, cada.charAt(0).toUpperCase() + cada.slice(1), fechaConMes(m.fechaProgramada, hoy)].filter(Boolean).join(" · ");
        const contenido = (
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold">
              {m.servicio}
              <Insignia>{NOMBRE_ESTADO_RECORDATORIO[m.estado]}</Insignia>
            </span>
            <span className="text-sm text-tinta-suave">
              {detalle}
              {!m.vehiculoActivo && " · vehículo desactivado: no se avisa"}
            </span>
            {m.nota && <span className="text-sm text-tinta-suave">Nota: {m.nota}</span>}
          </span>
        );
        return (
          <li key={m.id} className="flex items-center gap-2 pr-2">
            {/* Con su reserva u orden, la fila entera la abre (26/11, como la historia; antes, "Ver la orden" subrayado) */}
            {trabajo ? (
              <Link
                href={conDesde(trabajo.href, desde)}
                aria-label={`${m.servicio}: ${trabajo.texto.charAt(0).toLowerCase()}${trabajo.texto.slice(1)}`}
                className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] gap-x-3 py-3 pl-4 hover:bg-superficie/60 focus-visible:-outline-offset-2"
              >
                {contenido}
                <ChevronRightIcon className="size-5 shrink-0 self-center text-tinta-suave" aria-hidden />
              </Link>
            ) : (
              <span className="flex min-w-0 flex-1 py-3 pl-4">{contenido}</span>
            )}
            {editable && <MasPlan plan={{ id: m.id, intervaloMeses: m.intervaloMeses, fechaProgramada: m.fechaProgramada, servicio: m.servicio }} hoy={hoy} />}
          </li>
        );
      })}
    </ul>
  );
}
