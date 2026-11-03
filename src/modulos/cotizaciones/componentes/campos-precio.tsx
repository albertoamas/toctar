"use client";

import { useState } from "react";
import { SeccionFormulario } from "@/componentes/panel/seccion-formulario";
import { Campo, MensajeError } from "@/componentes/panel/campo";
import { CampoMonto } from "@/componentes/panel/campo-monto";
import { Input } from "@/componentes/ui/input";
import { RadioGroup, RadioGroupItem } from "@/componentes/ui/radio-group";
import { leerMonto, mostrarMonto } from "@/modulos/catalogo/reglas";
import type { OpcionServicio } from "../consultas";
import { bs, calcularTotales, leerMontoOCero, MODOS, NOMBRE_MODO, type Modo } from "../reglas";
import { LineasServicio, type Linea } from "./lineas-servicio";

// Lo que lleva cada versión de una cotización (pedido 23): los servicios con su precio, el total, cómo se cotizó y las
// condiciones del PDF. Lo comparten la nueva cotización y la versión nueva. Todo controlado: React reinicia el
// formulario al terminar la acción y así nada se pierde tras un error.

type Inicial = { lineas: { varianteId: number; precio: string }[]; descuento: string; adelanto: string; validaHasta: string; modo: Modo | "" };

/** El estado de los campos de precio y el total que sale de ellos, mientras se escribe (el servidor lo recalcula). */
export function usePrecios(inicial: Inicial) {
  const mostrar = (monto: string) => (monto === "0.00" ? "" : mostrarMonto(monto));
  const [lineas, setLineas] = useState<Linea[]>(inicial.lineas.map((l) => ({ ...l, precio: mostrarMonto(l.precio) })));
  const [descuento, setDescuento] = useState(mostrar(inicial.descuento));
  const [adelanto, setAdelanto] = useState(mostrarMonto(inicial.adelanto));
  const [validaHasta, setValidaHasta] = useState(inicial.validaHasta);
  const [modo, setModo] = useState<string>(inicial.modo);
  const totales = calcularTotales(
    lineas.map((l) => leerMonto(l.precio) ?? "0"),
    leerMontoOCero(descuento) ?? "0",
  );
  return { lineas, setLineas, descuento, setDescuento, adelanto, setAdelanto, validaHasta, setValidaHasta, modo, setModo, totales };
}

type Precios = ReturnType<typeof usePrecios>;

type Props = {
  precios: Precios;
  /** Las opciones del catálogo con el precio sugerido del tamaño del vehículo; null si todavía no se sabe el tamaño. */
  opciones: OpcionServicio[] | null;
  errores: Partial<Record<string, string>>;
  hoy: string;
};

export function CamposPrecio({ precios: p, opciones, errores: e, hoy }: Props) {
  return (
    <>
      <SeccionFormulario titulo="Servicios" className="gap-4">
        {opciones ? (
          <LineasServicio opciones={opciones} lineas={p.lineas} onChange={p.setLineas} errores={e} />
        ) : (
          // Sin tamaño no hay precio sugerido: primero el vehículo
          <p className="text-tinta-suave">Elige el vehículo (o su tamaño) para ver los servicios con su precio.</p>
        )}
        {!opciones && e.lineas && <MensajeError id="lineas-error">{e.lineas}</MensajeError>}
      </SeccionFormulario>

      <SeccionFormulario titulo="¿Cómo se cotizó?" className="gap-3">
        <input type="hidden" name="modo" value={p.modo} />
        <RadioGroup
          value={p.modo}
          onValueChange={(valor) => p.setModo(String(valor))}
          aria-label="¿Cómo se cotizó?"
          aria-describedby={e.modo ? "modo-error" : undefined}
          className="flex flex-col gap-2 sm:flex-row"
        >
          {MODOS.map((m, i) => (
            <label key={m} htmlFor={`modo-${m}`} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border bg-fondo px-3 py-2 has-data-checked:border-tinta">
              <RadioGroupItem id={`modo-${m}`} value={m} data-invalido={(!!e.modo && i === 0) || undefined} />
              <span className="flex flex-col">
                <span className="font-semibold">{NOMBRE_MODO[m]}</span>
                {m === "fotos" && <span className="text-sm text-tinta-suave">Precio estimado: el PDF dice que se confirma al ver el vehículo.</span>}
              </span>
            </label>
          ))}
        </RadioGroup>
        {e.modo && <MensajeError id="modo-error">{e.modo}</MensajeError>}
      </SeccionFormulario>

      <SeccionFormulario titulo="Total">
        <Campo id="descuento" etiqueta="Descuento" error={e.descuento} ayuda="Opcional.">
          <CampoMonto id="descuento" name="descuento" value={p.descuento} onChange={(ev) => p.setDescuento(ev.target.value)} aria-invalid={!!e.descuento} aria-describedby={e.descuento ? "descuento-error" : "descuento-ayuda"} />
        </Campo>
        <dl className="grid max-w-sm grid-cols-[1fr_auto] gap-x-6 gap-y-2 tt-tarjeta-panel p-4" aria-live="polite">
          <dt className="text-tinta-suave">Subtotal</dt>
          <dd className="text-right tabular-nums">{bs(p.totales.subtotal)}</dd>
          <dt className="text-tinta-suave">Descuento</dt>
          <dd className="text-right tabular-nums">{p.totales.descuento === "0.00" ? "Sin descuento" : `− ${bs(p.totales.descuento)}`}</dd>
          <dt className="font-semibold">Total</dt>
          <dd className="text-right text-lg font-bold tabular-nums">{bs(p.totales.total)}</dd>
        </dl>
      </SeccionFormulario>

      <SeccionFormulario titulo="Condiciones">
        {/* Vienen de Configuración y casi siempre se dejan así: sin ayudas que lo repitan */}
        <div className="grid gap-5 sm:grid-cols-2">
          <Campo id="adelanto" etiqueta="Adelanto sugerido" error={e.adelanto}>
            <CampoMonto id="adelanto" name="adelanto" value={p.adelanto} onChange={(ev) => p.setAdelanto(ev.target.value)} aria-invalid={!!e.adelanto} aria-describedby={e.adelanto ? "adelanto-error" : undefined} />
          </Campo>
          <Campo id="validaHasta" etiqueta="Válida hasta" error={e.validaHasta}>
            <Input id="validaHasta" name="validaHasta" type="date" min={hoy} value={p.validaHasta} onChange={(ev) => p.setValidaHasta(ev.target.value)} aria-invalid={!!e.validaHasta} aria-describedby={e.validaHasta ? "validaHasta-error" : undefined} className="max-w-48" />
          </Campo>
        </div>
      </SeccionFormulario>
    </>
  );
}

/** El total a la vista en el pie fijo del celular, junto al botón. El resumen de arriba ya lo anuncia (aria-live). */
export function TotalEnPie({ total }: { total: string }) {
  return (
    <p className="flex items-baseline gap-2 sm:hidden" aria-hidden>
      <span className="text-tinta-suave">Total</span>
      <span className="text-lg font-bold tabular-nums">{bs(total)}</span>
    </p>
  );
}
