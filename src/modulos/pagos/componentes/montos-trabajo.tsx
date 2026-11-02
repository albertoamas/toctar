import { cn } from "cn";
import { CabeceraSeccion } from "@/componentes/panel/seccion-con-editar";
import { formatearFecha } from "@/lib/fechas";
import type { DetalleReserva } from "@/modulos/agenda/consultas";
import { mostrarMonto } from "@/modulos/catalogo/reglas";
import { AnularPago } from "./anular-pago";
import { RegistrarPago } from "./registrar-pago";
import { VerComprobante } from "./ver-comprobante";
import { estaPagada, METODO_EN_FRASE, NOMBRE_TIPO_PAGO, precioCotizadoYFinal } from "../reglas";

// Servicios, saldo y pagos de un trabajo (C3, HU-32): en la reserva, en la orden (C4) y al entregar. Solo para quien ve
// pagos: quien lo usa ya lo verificó (`montos` llega null si no). Una reserva cancelada, sin acciones; una entregada con
// saldo se sigue cobrando (RN-13). Con servicios sumados en el taller (HU-36), el precio cotizado y el final por separado
// (RF-43). Pedido 26: dos tarjetas con su título adentro; en la de servicios, los totales al pie y el saldo resaltado
// (ámbar si falta, verde si está pagado).

const bs = (monto: string) => `${mostrarMonto(monto)} Bs`;

type Props = {
  trabajoId: number;
  montos: NonNullable<DetalleReserva["montos"]>;
  cerrado: boolean;
  hoy: string;
  /** Debajo de los servicios: por ejemplo, "Agregar servicio" para el dueño en la orden. */
  agregar?: React.ReactNode;
  /**
   * Al entregar (pulido 11.4): cobrar el saldo es lo primero, así que va destacado al pie de los pagos ("Falta cobrar")
   * y no sin fondo en la cabecera.
   */
  cobrar?: boolean;
};

export function MontosTrabajo({ trabajoId, montos, cerrado, hoy, agregar, cobrar }: Props) {
  const conAdicionales = montos.lineas.some((l) => l.esAdicional);
  const precios = precioCotizadoYFinal(montos.lineas, montos.descuento);
  const porCobrar = !cerrado && !estaPagada(montos.saldo.saldo);
  const registrar = (variante: "ghost" | "outline") => (
    <RegistrarPago trabajoId={trabajoId} saldo={montos.saldo.saldo} hoy={hoy} conPagos={montos.pagos.some((p) => !p.anulado)} variante={variante} />
  );
  return (
      <>
        <section aria-labelledby="servicios-titulo" className="tt-tarjeta-panel flex flex-col overflow-hidden">
          <h2 id="servicios-titulo" className="tt-titulo-seccion border-b border-border px-4 py-3">
            Servicios
          </h2>
          <ul className="flex flex-col divide-y divide-border">
            {montos.lineas.map((l, i) => (
              <li key={i} className="flex justify-between gap-4 px-4 py-3">
                <span className="flex flex-col">
                  {l.descripcion}
                  {l.esAdicional && <span className="text-sm text-tinta-suave">Adicional</span>}
                </span>
                {/* El monto nunca se corta: con un servicio de nombre largo, se acomoda el nombre */}
                <span className="shrink-0 whitespace-nowrap tabular-nums">{bs(l.precio)}</span>
              </li>
            ))}
          </ul>
          {agregar && <div className="px-4 pb-3">{agregar}</div>}
          {/* Una sola lista: los totales y, al pie, el saldo resaltado (cada grupo de pares, en un div) */}
          <dl className="flex flex-col border-t border-border">
            <div className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-1 px-4 py-3">
              {montos.descuento !== "0.00" && (
                <>
                  <dt className="text-tinta-suave">Descuento</dt>
                  <dd className="text-right tabular-nums">− {bs(montos.descuento)}</dd>
                </>
              )}
              {conAdicionales ? (
                <>
                  <dt className="text-tinta-suave">Precio cotizado</dt>
                  <dd className="text-right tabular-nums">{bs(precios.cotizado)}</dd>
                  <dt className="text-tinta-suave">Adicionales</dt>
                  <dd className="text-right tabular-nums">+ {bs(precios.adicionales)}</dd>
                  <dt className="font-semibold">Precio final</dt>
                  <dd className="text-right font-semibold tabular-nums">{bs(precios.final)}</dd>
                </>
              ) : (
                <>
                  <dt className="font-semibold">Total</dt>
                  <dd className="text-right font-semibold tabular-nums">{bs(montos.saldo.total)}</dd>
                </>
              )}
              <dt className="text-tinta-suave">Pagado</dt>
              <dd className="text-right tabular-nums">{bs(montos.saldo.pagado)}</dd>
            </div>
            {/* El saldo: ámbar mientras falta, verde cuando está pagado */}
            <div
              className={cn(
                "grid grid-cols-[1fr_auto] items-baseline gap-x-6 border-t border-border px-4 py-3",
                estaPagada(montos.saldo.saldo) ? "bg-exito-fondo text-exito" : "bg-aviso-fondo text-aviso",
              )}
            >
              <dt className="font-semibold">Saldo</dt>
              <dd className="text-right text-lg font-bold tabular-nums">{bs(montos.saldo.saldo)}</dd>
            </div>
          </dl>
        </section>
        <section aria-labelledby="pagos-titulo" className="tt-tarjeta-panel flex flex-col overflow-hidden">
          {/* "Registrar pago" sin fondo en la cabecera, como "Editar" (pulido 10.3): el rojo de la pantalla es su paso
              siguiente (recibir, entregar) */}
          <div className="border-b border-border px-4 py-1">
            <CabeceraSeccion id="pagos" titulo="Pagos">
              {porCobrar && !cobrar && registrar("ghost")}
            </CabeceraSeccion>
          </div>
          {montos.pagos.length === 0 ? (
            <p className="px-4 py-3 text-sm text-tinta-suave">Todavía no hay pagos.</p>
          ) : (
            <ul aria-label="Pagos" className="flex flex-col divide-y divide-border">
              {montos.pagos.map((p) => {
                const descripcion = `${NOMBRE_TIPO_PAGO[p.tipo]} ${METODO_EN_FRASE[p.metodo]} de ${bs(p.monto)}, ${formatearFecha(p.fecha)}`;
                return (
                  <li key={p.id} className="flex flex-col gap-3 px-4 py-3">
                    <div className="flex gap-3">
                      {p.comprobante && <VerComprobante foto={p.comprobante} descripcion={descripcion} />}
                      <div className={cn("flex min-w-0 flex-1 flex-col gap-0.5", p.anulado && "text-tinta-suave")}>
                        <span className="flex justify-between gap-4">
                          <span className={cn("font-semibold", p.anulado && "line-through")}>
                            {NOMBRE_TIPO_PAGO[p.tipo]} {METODO_EN_FRASE[p.metodo]}
                          </span>
                          <span className={cn("shrink-0 whitespace-nowrap tabular-nums", p.anulado && "line-through")}>{bs(p.monto)}</span>
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
          {/* Al entregar, cobrar es lo primero: al pie, en ámbar */}
          {porCobrar && cobrar && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-aviso-fondo px-4 py-3">
              <span className="font-semibold text-aviso tabular-nums">Falta cobrar {bs(montos.saldo.saldo)}</span>
              {registrar("outline")}
            </div>
          )}
          {!cerrado && estaPagada(montos.saldo.saldo) && (
            <p className="border-t border-border bg-exito-fondo px-4 py-3 font-semibold text-exito">Pagado por completo.</p>
          )}
        </section>
      </>
  );
}
