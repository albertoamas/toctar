import { cn } from "cn";
import { Seccion } from "@/componentes/panel/cabecera-seccion";
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
// (RF-43). Pedido 26: dos tarjetas; en la de servicios, los totales al pie y el saldo resaltado (ámbar si se puede cobrar,
// verde y "Pagado por completo" si está pagado). C6: el título de cada una arriba de su tarjeta, como en las fichas.
// Pulido 13.49: las dos tarjetas con su acción sin fondo en la cabecera ("Agregar servicio", "Registrar pago"); la opción
// del servicio en gris debajo de su nombre; "Anular", en el "⋯" de cada pago.

const bs = (monto: string) => `${mostrarMonto(monto)} Bs`;

type Props = {
  trabajoId: number;
  montos: NonNullable<DetalleReserva["montos"]>;
  cerrado: boolean;
  hoy: string;
  /** En la cabecera de Servicios, sin fondo: "Agregar servicio" para el dueño en la orden. */
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
  const pagada = !cerrado && estaPagada(montos.saldo.saldo);
  const registrar = (variante: "ghost" | "outline") => (
    <RegistrarPago trabajoId={trabajoId} saldo={montos.saldo.saldo} hoy={hoy} variante={variante} />
  );
  return (
      <>
        <Seccion id="servicios" titulo="Servicios" sinRelleno accion={agregar}>
          <ul className="flex flex-col divide-y divide-border">
            {montos.lineas.map((l, i) => {
              const { servicio, opcion } = l;
              return (
                <li key={i} className="flex justify-between gap-4 px-4 py-3">
                  <span className="flex min-w-0 flex-col">
                    {servicio}
                    {(opcion || l.esAdicional) && (
                      <span className="flex flex-wrap gap-x-3 text-sm text-tinta-suave">
                        {opcion && <span>{opcion}</span>}
                        {l.esAdicional && <span>Adicional</span>}
                      </span>
                    )}
                  </span>
                  {/* El monto nunca se corta: con un servicio de nombre largo, se acomoda el nombre */}
                  <span className="shrink-0 whitespace-nowrap tabular-nums">{bs(l.precio)}</span>
                </li>
              );
            })}
          </ul>
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
            {/* El saldo: ámbar mientras se puede cobrar, verde cuando está pagado; una cancelada, sin color (no se cobra) */}
            <div
              className={cn(
                "grid grid-cols-[1fr_auto] items-baseline gap-x-6 border-t border-border px-4 py-3",
                pagada ? "bg-exito-fondo text-exito" : porCobrar && "bg-aviso-fondo text-aviso",
              )}
            >
              <dt className="font-semibold">Saldo</dt>
              <dd className="text-right text-lg font-bold tabular-nums">{bs(montos.saldo.saldo)}</dd>
              {pagada && <dd className="col-span-2 text-sm font-semibold">Pagado por completo.</dd>}
            </div>
          </dl>
        </Seccion>
        {/* "Registrar pago" sin fondo en la cabecera, como "Editar" (pulido 10.3): el rojo de la pantalla es su paso
            siguiente (recibir, entregar) */}
        <Seccion id="pagos" titulo="Pagos" sinRelleno accion={porCobrar && !cobrar && registrar("ghost")}>
          {montos.pagos.length === 0 ? (
            <p className="px-4 py-3 text-sm text-tinta-suave">Todavía no hay pagos.</p>
          ) : (
            <ul aria-label="Pagos" className="flex flex-col divide-y divide-border">
              {montos.pagos.map((p) => {
                const descripcion = `${NOMBRE_TIPO_PAGO[p.tipo]} ${METODO_EN_FRASE[p.metodo]} de ${bs(p.monto)}, ${formatearFecha(p.fecha)}`;
                return (
                  <li key={p.id} className="flex flex-col gap-3 py-3 pl-4 pr-2">
                    <div className="flex items-start gap-3">
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
                      {/* "⋯" a la derecha del monto; sin él (anulado o cerrado), el mismo ancho para que los montos queden en columna */}
                      {!p.anulado && !cerrado ? <div className="-my-1.5"><AnularPago id={p.id} descripcion={descripcion} /></div> : <span aria-hidden className="w-9 shrink-0 pointer-coarse:w-11" />}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {/* Al entregar, cobrar es lo primero: al pie de los pagos, con su botón (el saldo ya va resaltado arriba) */}
          {porCobrar && cobrar && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
              <span className="font-semibold tabular-nums">Falta cobrar {bs(montos.saldo.saldo)}</span>
              {registrar("outline")}
            </div>
          )}
        </Seccion>
      </>
  );
}
