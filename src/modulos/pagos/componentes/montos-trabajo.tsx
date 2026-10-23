import { cn } from "cn";
import { formatearFecha } from "@/lib/fechas";
import type { DetalleReserva } from "@/modulos/agenda/consultas";
import { mostrarMonto } from "@/modulos/catalogo/reglas";
import { AnularPago } from "./anular-pago";
import { RegistrarPago } from "./registrar-pago";
import { VerComprobante } from "./ver-comprobante";
import { estaPagada, METODO_EN_FRASE, NOMBRE_TIPO_PAGO } from "../reglas";

// Servicios, saldo y pagos de un trabajo (C3, HU-32): en la reserva y en la orden (C4). Solo para quien ve pagos: quien
// lo usa ya lo verificó (`montos` llega null si no). Una reserva cancelada, sin acciones; una entregada con saldo se
// sigue cobrando (RN-13).

const bs = (monto: string) => `${mostrarMonto(monto)} Bs`;

type Props = { trabajoId: number; montos: NonNullable<DetalleReserva["montos"]>; cerrado: boolean; hoy: string };

export function MontosTrabajo({ trabajoId, montos, cerrado, hoy }: Props) {
  return (
      <>
        <section aria-labelledby="servicios-titulo" className="flex flex-col gap-3">
          <h2 id="servicios-titulo" className="font-heading text-2xl font-bold italic">Servicios</h2>
          <ul className="flex flex-col divide-y divide-border rounded-sm border border-border">
            {montos.lineas.map((l, i) => (
              <li key={i} className="flex justify-between gap-4 p-3">
                <span>{l.descripcion}</span>
                <span className="tabular-nums">{bs(l.precio)}</span>
              </li>
            ))}
          </ul>
          <dl className="grid max-w-sm grid-cols-[1fr_auto] gap-x-6 gap-y-1">
            {montos.descuento !== "0.00" && (
              <>
                <dt className="text-tinta-suave">Descuento</dt>
                <dd className="text-right tabular-nums">− {bs(montos.descuento)}</dd>
              </>
            )}
            <dt className="font-semibold">Total</dt>
            <dd className="text-right font-semibold tabular-nums">{bs(montos.saldo.total)}</dd>
            <dt className="text-tinta-suave">Pagado</dt>
            <dd className="text-right tabular-nums">{bs(montos.saldo.pagado)}</dd>
            <dt className="font-semibold">Saldo</dt>
            <dd className="text-right text-lg font-bold tabular-nums">{bs(montos.saldo.saldo)}</dd>
          </dl>
        </section>
        <section aria-labelledby="pagos-titulo" className="flex flex-col gap-3">
          <h2 id="pagos-titulo" className="font-heading text-2xl font-bold italic">Pagos</h2>
          {montos.pagos.length === 0 ? (
            <p className="text-tinta-suave">Todavía no hay pagos.</p>
          ) : (
            <ul aria-label="Pagos" className="flex flex-col divide-y divide-border rounded-sm border border-border">
              {montos.pagos.map((p) => {
                const descripcion = `${NOMBRE_TIPO_PAGO[p.tipo]} ${METODO_EN_FRASE[p.metodo]} de ${bs(p.monto)}, ${formatearFecha(p.fecha)}`;
                return (
                  <li key={p.id} className="flex flex-col gap-3 p-3">
                    <div className="flex gap-3">
                      {p.comprobante && <VerComprobante foto={p.comprobante} descripcion={descripcion} />}
                      <div className={cn("flex min-w-0 flex-1 flex-col gap-0.5", p.anulado && "text-tinta-suave")}>
                        <span className="flex justify-between gap-4">
                          <span className={cn("font-semibold", p.anulado && "line-through")}>
                            {NOMBRE_TIPO_PAGO[p.tipo]} {METODO_EN_FRASE[p.metodo]}
                          </span>
                          <span className={cn("tabular-nums", p.anulado && "line-through")}>{bs(p.monto)}</span>
                        </span>
                        <span className="text-sm text-tinta-suave">
                          {formatearFecha(p.fecha)}, registrado por {p.registradoPor}
                        </span>
                        {p.anulado && <span className="text-sm text-tinta">Anulado: {p.motivoAnulacion}</span>}
                      </div>
                    </div>
                    {!p.anulado && !cerrado && <AnularPago id={p.id} descripcion={descripcion} />}
                  </li>
                );
              })}
            </ul>
          )}
          {!cerrado &&
            (estaPagada(montos.saldo.saldo) ? (
              <p className="font-semibold text-exito">Pagado por completo.</p>
            ) : (
              <RegistrarPago trabajoId={trabajoId} saldo={montos.saldo.saldo} hoy={hoy} conPagos={montos.pagos.some((p) => !p.anulado)} />
            ))}
        </section>
      </>
  );
}
