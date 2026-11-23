import Link from "next/link";
import type { Route } from "next";
import { BarraPasos } from "@/componentes/panel/barra-pasos";
import { MarcaEstado } from "@/componentes/panel/marca-estado";
import { cantidad } from "@/lib/cantidad";
import { fechaConMes, fechaEnBolivia } from "@/lib/fechas";
import { conDesde } from "@/lib/volver";
import { mostrarMonto } from "@/modulos/catalogo/reglas";
import { resumenServicios } from "@/modulos/ordenes/reglas";
import type { FilaCotizacion } from "../consultas/lista";
import { diasDesde, sinRespuesta, textoDias } from "../reglas";

// Pendientes y Aceptadas en tarjetas (recorrido visual del 22/11, como "En el taller" de Órdenes): cada cotización con
// los pasos del trabajo hasta la reserva (Cotizada, Aceptada, Reservada), que después siguen en Órdenes. Arriba la placa
// y una sola marca (un punto, sin píldora): hace cuánto se envió o, pasado el plazo de Configuración, «Sin respuesta» en
// ámbar; aceptada, «Sin fecha» o para cuándo está reservada. Abajo, el número (el del PDF y el WhatsApp, en chico),
// hasta cuándo vale (vencida, en rojo) y el total.
// Toda la tarjeta abre la cotización. Las rechazadas (el historial) siguen en tabla, como las entregadas de Órdenes.

const PASOS = ["Cotizada", "Aceptada", "Reservada"] as const;

type Props = {
  cotizaciones: FilaCotizacion[];
  /** Días sin respuesta desde los que una pendiente se resalta (Configuración, RF-35). */
  umbral: number;
  /** Esta lista, para "Volver" (pedido 43). */
  desde: string;
};

export function TarjetasCotizaciones({ cotizaciones, umbral, desde }: Props) {
  const ahora = new Date();
  const hoy = fechaEnBolivia(ahora);
  return (
    <ul aria-label="Cotizaciones" className="grid gap-3 @3xl:grid-cols-2">
      {cotizaciones.map((c) => (
        <li key={c.id} className="flex">
          <Tarjeta c={c} umbral={umbral} hoy={hoy} ahora={ahora} href={conDesde(`/panel/cotizaciones/${c.id}`, desde)} />
        </li>
      ))}
    </ul>
  );
}

function Tarjeta({ c, umbral, hoy, ahora, href }: { c: FilaCotizacion; umbral: number; hoy: string; ahora: Date; href: Route }) {
  const dias = diasDesde(c.ultimoMovimientoAt, ahora);
  const aceptada = c.estado === "confirmado";
  const reservada = aceptada && !!c.fechaReserva;
  const actual = reservada ? 2 : aceptada ? 1 : 0;
  // Una sola marca arriba: lo que hay que mirar de esta cotización
  const marca = reservada ? (
    <MarcaEstado tono="exito">{`Reservada para el ${fechaConMes(c.fechaReserva!, hoy)}`}</MarcaEstado>
  ) : aceptada ? (
    <MarcaEstado tono="aviso" problema>
      Sin fecha
    </MarcaEstado>
  ) : sinRespuesta(c.estado, dias, umbral) ? (
    <MarcaEstado tono="aviso" problema>
      Sin respuesta hace {cantidad(dias, "día", "días")}
    </MarcaEstado>
  ) : (
    <MarcaEstado>{dias === 0 ? "Enviada hoy" : `Enviada ${textoDias(dias)}`}</MarcaEstado>
  );
  const vencida = c.validaHasta < hoy;
  return (
    <Link
      href={href}
      className="tt-tarjeta-panel flex w-full flex-col gap-3 p-4 hover:bg-fondo-panel/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="min-w-0">
          {c.placa && <span className="tt-placa text-lg font-semibold">{c.placa}</span>}
          {/* De un interesado (P31b): todavía no está en Clientes */}
          {(c.vehiculo || c.interesado) && <span className="ml-2 text-sm text-tinta-suave">{c.interesado ? "Sin registrar" : c.vehiculo}</span>}
        </p>
        <span className="text-sm">{marca}</span>
      </div>
      {/* Con varios servicios, el primero y cuántos más; todos, al pasar el mouse y en la ficha */}
      <p className="text-sm text-tinta-suave" title={c.listaServicios.length > 1 ? c.servicios : undefined}>
        <span className="font-medium text-tinta">{c.cliente}</span>
        {c.listaServicios.length > 0 && ` · ${resumenServicios(c.listaServicios)}`}
      </p>
      <BarraPasos pasos={PASOS} actual={actual} tono={aceptada ? "exito" : "info"} />
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-t border-border pt-3 text-sm">
        <span className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-tinta-suave tabular-nums">{c.numero}</span>
        {aceptada ? (
          <span className="text-tinta-suave first-letter:uppercase">{`Aceptada ${textoDias(dias)}`}</span>
        ) : vencida ? (
          // Vencida: el precio ya no vale; se manda una versión nueva
          <span className="font-semibold text-peligro">Venció el {fechaConMes(c.validaHasta, hoy)}</span>
        ) : (
          <span>
            <span className="text-tinta-suave">Vale hasta el </span>
            <span className="font-medium">{fechaConMes(c.validaHasta, hoy)}</span>
          </span>
        )}
        </span>
        <span className="font-semibold tabular-nums">{mostrarMonto(c.total)} Bs</span>
      </div>
    </Link>
  );
}
