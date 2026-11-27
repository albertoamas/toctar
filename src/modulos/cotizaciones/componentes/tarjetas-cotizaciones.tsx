import Link from "next/link";
import type { Route } from "next";
import { CalendarIcon } from "lucide-react";
import { Alerta } from "@/componentes/panel/alerta";
import { Insignia } from "@/componentes/panel/insignia";
import { buttonVariants } from "@/componentes/ui/button";
import { cantidad } from "@/lib/cantidad";
import { fechaConMes, fechaEnBolivia } from "@/lib/fechas";
import { conDesde } from "@/lib/volver";
import { mostrarMonto } from "@/modulos/catalogo/reglas";
import { resumenServicios } from "@/modulos/ordenes/reglas";
import type { FilaCotizacion } from "../consultas/lista";
import { diasDesde, sinRespuesta, textoDias } from "../reglas";

// Pendientes y Aceptadas en tarjetas (recorrido visual del 22/11, como "En el taller" de Órdenes). Sin barra de pasos
// (23/11, a pedido del desarrollador): una cotización no avanza por pasos parejos, de cotizada se acepta o se rechaza, y
// la barra lo hacía parecer un camino. Cada tarjeta dice lo que hay que mirar: arriba la placa, debajo el cliente y sus
// servicios, una sola marca (un punto, sin píldora): hace cuánto se envió o, pasado el plazo de Configuración, «Sin
// respuesta» en ámbar; aceptada, «Sin fecha» o para cuándo está reservada. Al pie, el número, hasta cuándo vale
// (vencida, en rojo) y el total. Toda la tarjeta abre la cotización; una aceptada sin fecha lleva además «Reservar», la
// única acción de la lista (se hace todos los días), para quien ve la Agenda. Las rechazadas siguen en tabla.

type Props = {
  cotizaciones: FilaCotizacion[];
  /** Días sin respuesta desde los que una pendiente se resalta (Configuración, RF-35). */
  umbral: number;
  /** Esta lista, para "Volver" (pedido 43). */
  desde: string;
  /** Quien ve la Agenda reserva desde la tarjeta. */
  conReservar: boolean;
};

export function TarjetasCotizaciones({ cotizaciones, umbral, desde, conReservar }: Props) {
  const ahora = new Date();
  const hoy = fechaEnBolivia(ahora);
  return (
    <ul aria-label="Cotizaciones" className="grid gap-3 @3xl:grid-cols-2">
      {cotizaciones.map((c) => (
        <li key={c.id} className="flex">
          <Tarjeta
            c={c}
            umbral={umbral}
            hoy={hoy}
            ahora={ahora}
            href={conDesde(`/panel/cotizaciones/${c.id}`, desde)}
            reservar={conReservar && c.sinFecha ? conDesde(`/panel/agenda/nueva?cotizacion=${c.cotizacionId}`, desde) : null}
          />
        </li>
      ))}
    </ul>
  );
}

function Tarjeta({ c, umbral, hoy, ahora, href, reservar }: { c: FilaCotizacion; umbral: number; hoy: string; ahora: Date; href: Route; reservar: Route | null }) {
  const dias = diasDesde(c.ultimoMovimientoAt, ahora);
  const aceptada = c.estado === "confirmado";
  // Lo que hay que mirar (paleta del 23/11): la pestaña ya dice el estado, así que va la alerta si la hay (con su ícono)
  // o, con su reserva, para cuándo; si no, hace cuánto, en gris
  const cuando = <span className="text-tinta-suave first-letter:uppercase">{aceptada ? `Aceptada ${textoDias(dias)}` : dias === 0 ? "Enviada hoy" : `Enviada ${textoDias(dias)}`}</span>;
  const marca =
    aceptada && c.fechaReserva ? (
      <Insignia tono="info">{`Reservada para el ${fechaConMes(c.fechaReserva, hoy)}`}</Insignia>
    ) : aceptada ? (
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Alerta tipo="fecha">Sin fecha</Alerta>
        {cuando}
      </span>
    ) : sinRespuesta(c.estado, dias, umbral) ? (
      <Alerta tipo="tiempo">Sin respuesta hace {cantidad(dias, "día", "días")}</Alerta>
    ) : (
      cuando
    );
  const vencida = c.validaHasta < hoy;
  return (
    // Toda la tarjeta abre la cotización con un enlace que la cubre; «Reservar» va encima, con su propio enlace (un
    // enlace dentro de otro no vale)
    <div className="tt-tarjeta-panel relative flex w-full flex-col gap-2.5 p-4 has-[a[data-tarjeta]:hover]:bg-fondo-panel/60 sm:p-5">
      <p className="min-w-0">
        <Link
          href={href}
          data-tarjeta
          className="after:absolute after:inset-0 after:rounded-[inherit] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-ring"
        >
          {c.placa && <span className="tt-placa text-lg font-semibold">{c.placa}</span>}
          {/* De un interesado (P31b): todavía no está en Clientes */}
          {(c.vehiculo || c.interesado) && <span className="ml-2 text-sm text-tinta-suave">{c.interesado ? "Sin registrar" : c.vehiculo}</span>}
        </Link>
      </p>
      {/* Con varios servicios, el primero y cuántos más; todos, al pasar el mouse y en la ficha */}
      <p className="text-sm text-tinta-suave" title={c.listaServicios.length > 1 ? c.servicios : undefined}>
        <span className="font-medium text-tinta">{c.cliente}</span>
        {c.listaServicios.length > 0 && ` · ${resumenServicios(c.listaServicios)}`}
      </p>
      <div className="text-sm">{marca}</div>
      <div className="mt-0.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-border pt-3 text-sm">
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-tinta-suave tabular-nums">{c.numero}</span>
          {!aceptada &&
            (vencida ? (
              // Vencida: el precio ya no vale; se manda una versión nueva
              <span className="font-semibold text-peligro">Venció el {fechaConMes(c.validaHasta, hoy)}</span>
            ) : (
              <span>
                <span className="text-tinta-suave">Vale hasta el </span>
                <span className="font-medium">{fechaConMes(c.validaHasta, hoy)}</span>
              </span>
            ))}
        </span>
        <span className="flex items-center gap-3">
          <span className="font-semibold tabular-nums">{mostrarMonto(c.total)} Bs</span>
          {reservar && (
            <Link href={reservar} className={buttonVariants({ variant: "outline", className: "relative z-10" })}>
              <CalendarIcon />
              Reservar
            </Link>
          )}
        </span>
      </div>
    </div>
  );
}
