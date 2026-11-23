import Link from "next/link";
import type { Route } from "next";
import { BarraPasos } from "@/componentes/panel/barra-pasos";
import { MarcaEstado } from "@/componentes/panel/marca-estado";
import { conDesde } from "@/lib/volver";
import { mostrarMonto } from "@/modulos/catalogo/reglas";
import { NOMBRE_ESTADO_TRABAJO, TONO_ESTADO_TRABAJO } from "@/modulos/agenda/reglas";
import { textoEntregaAtrasada } from "@/modulos/inicio/reglas";
import type { OrdenEnLista } from "../consultas";
import { resumenServicios, textoEntrega } from "../reglas";

// "En el taller" en tarjetas (recorrido visual del 20/11, a pedido del dueño, con su SaaS de pedidos de referencia): son
// pocas a la vez (las que caben en los espacios) y lo que importa es en qué paso va cada auto, así que cada orden es una
// tarjeta con sus pasos (Recibida, En proceso, Lista). Dos columnas en pantalla ancha, una en el celular. Toda la
// tarjeta se toca y abre la orden; las acciones viven en la ficha (una acción por pantalla). Sin borde de color: el
// color es del estado, y ya lo dice su marca. "Entregadas" (el historial, muchas y de a páginas) sigue en tabla.

/**
 * Los pasos de una orden en el taller. Los hechos y el actual, en el color de su estado (Recibida violeta, En proceso azul,
 * Lista verde; 20/11, a pedido del dueño): la barra es el estado de la orden (`BarraPasos`).
 */
const PASOS = [
  { estado: "recibido", texto: "Recibida" },
  { estado: "en_proceso", texto: "En proceso" },
  { estado: "listo", texto: "Lista" },
] as const;

export function TarjetasOrdenes({ ordenes, hoy, desde }: { ordenes: OrdenEnLista[]; hoy: string; /** Esta lista, para "Volver" (pedido 43). */ desde: string }) {
  return (
    <ul aria-label="Órdenes en el taller" className="grid gap-3 @3xl:grid-cols-2">
      {ordenes.map((o) => (
        <li key={o.id} className="flex">
          <Tarjeta orden={o} hoy={hoy} href={conDesde(`/panel/ordenes/${o.id}`, desde)} />
        </li>
      ))}
    </ul>
  );
}

function Tarjeta({ orden: o, hoy, href }: { orden: OrdenEnLista; hoy: string; href: Route }) {
  const atrasada = textoEntregaAtrasada(o, hoy);
  // Una sola marca: el problema en su color (como en el inicio) o, si no hay, el estado
  const marca = atrasada ? (
    <MarcaEstado tono="peligro" problema>
      {atrasada}
    </MarcaEstado>
  ) : o.sinAvisar ? (
    <MarcaEstado tono="aviso" problema>
      Sin avisar
    </MarcaEstado>
  ) : (
    <MarcaEstado tono={TONO_ESTADO_TRABAJO[o.estado]}>{NOMBRE_ESTADO_TRABAJO[o.estado]}</MarcaEstado>
  );
  const actual = PASOS.findIndex((p) => p.estado === o.estado);
  const conSaldo = o.saldo !== null && Number(o.saldo) > 0;
  return (
    <Link
      href={href}
      className="tt-tarjeta-panel flex w-full flex-col gap-3 p-4 hover:bg-fondo-panel/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="min-w-0">
          <span className="tt-placa text-lg font-semibold">{o.placa}</span>
          {o.vehiculo && <span className="ml-2 text-sm text-tinta-suave">{o.vehiculo}</span>}
        </p>
        <span className="text-sm">{marca}</span>
      </div>
      {/* Con varios servicios, el primero y cuántos más (20/11); todos, al pasar el mouse y en la ficha */}
      <p className="text-sm text-tinta-suave" title={o.servicios.length > 1 ? o.servicios.join(", ") : undefined}>
        <span className="font-medium text-tinta">{o.cliente}</span>
        {o.servicios.length > 0 && ` · ${resumenServicios(o.servicios)}`}
      </p>
      <BarraPasos pasos={PASOS.map((p) => p.texto)} actual={actual} tono={TONO_ESTADO_TRABAJO[o.estado]} />
      {/* Atrasada, la entrega ya la dice la marca de arriba */}
      {(!atrasada || conSaldo) && (
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-t border-border pt-3 text-sm">
          {!atrasada ? (
            <span>
              <span className="text-tinta-suave">Entrega: </span>
              <span className="font-medium">{textoEntrega(o.fechaFin, hoy)}</span>
            </span>
          ) : (
            <span />
          )}
          {conSaldo && (
            <span className="tabular-nums">
              <span className="text-tinta-suave">Falta </span>
              <span className="font-semibold">{mostrarMonto(o.saldo!)} Bs</span>
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
