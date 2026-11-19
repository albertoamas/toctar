"use client";

import { useState } from "react";
import { SeccionFormulario } from "@/componentes/panel/seccion-formulario";
import { Campo, MensajeError } from "@/componentes/panel/campo";
import { CampoMonto } from "@/componentes/panel/campo-monto";
import { MasDatos } from "@/componentes/panel/mas-datos";
import { Input } from "@/componentes/ui/input";
import { leerMonto, mostrarMonto } from "@/modulos/catalogo/reglas";
import type { OpcionServicio } from "../consultas/servicios";
import { bs, calcularTotales, leerMontoOCero, MODOS, NOMBRE_MODO, type Modo } from "../reglas";
import { LineasServicio, type Linea } from "./lineas-servicio";
import { ANCHO_DATO } from "@/componentes/panel/anchos";
import { OpcionesEnTarjetas } from "@/componentes/panel/opciones-en-tarjetas";
import { FilaResumen } from "@/componentes/panel/con-resumen";

// Lo que lleva cada versión de una cotización (pedido 23): los servicios con su precio, el total, cómo se cotizó y las
// condiciones del PDF. Lo comparten la nueva cotización y la versión nueva. Todo controlado: React reinicia el
// formulario al terminar la acción y así nada se pierde tras un error.
// Pulido final (09/11): en el celular ocupaban casi dos pantallas. Ahora la primera fila de servicio llega lista (sola y
// sin tocar no cuenta: `conFilaLista`) y "Agrega al menos un servicio." se va al elegir uno; el descuento, que casi no
// se usa, y las condiciones, que vienen de Configuración, van plegados (las condiciones, diciendo cuáles van al PDF). El
// total va en el pie, en todos los tamaños; el desglose, solo si hay descuento.

type Inicial = { lineas: { varianteId: number; precio: string }[]; descuento: string; adelanto: string; validaHasta: string; modo: Modo | "" };

/** El estado de los campos de precio y el total que sale de ellos, mientras se escribe (el servidor lo recalcula). */
export function usePrecios(inicial: Inicial) {
  const mostrar = (monto: string) => (monto === "0.00" ? "" : mostrarMonto(monto));
  const [lineas, setLineas] = useState<Linea[]>(
    inicial.lineas.length > 0 ? inicial.lineas.map((l) => ({ ...l, precio: mostrarMonto(l.precio) })) : [{ varianteId: 0, precio: "" }],
  );
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
  /**
   * En una versión nueva, el total de la que reemplaza (el de su PDF): se ve debajo del total cuando cambió, y por qué
   * si arranca distinto (`quitados`: sus servicios que ya no se ofrecen).
   */
  anterior?: { version: number; total: string; quitados: number };
};

export function CamposPrecio({ precios: p, opciones, errores: e, hoy, anterior }: Props) {
  return (
    <>
      <SeccionFormulario titulo="Servicios" claseContenido="gap-4">
        {opciones ? (
          <LineasServicio opciones={opciones} lineas={p.lineas} onChange={p.setLineas} errores={e} conFilaLista />
        ) : (
          // Sin tamaño no hay precio sugerido: primero el vehículo
          <p className="text-tinta-suave">Elige el vehículo (o su tamaño) para ver los servicios con su precio.</p>
        )}
        {!opciones && e.lineas && <MensajeError id="lineas-error">{e.lineas}</MensajeError>}
      </SeccionFormulario>

      {/* En tarjetas que se tocan enteras, como "¿Cómo pagó?" (C7 §5.2) */}
      <SeccionFormulario titulo="¿Cómo se cotizó?" claseContenido="gap-3">
        <OpcionesEnTarjetas
          id="modo"
          titulo="¿Cómo se cotizó?"
          tituloOculto
          nombre="modo"
          valor={p.modo}
          cambiar={p.setModo}
          opciones={MODOS.map((m) => ({ valor: m, texto: NOMBRE_MODO[m], detalle: m === "fotos" ? "Precio estimado: el PDF dice que se confirma al ver el vehículo." : "Vio el vehículo" }))}
          error={e.modo}
          className="grid-cols-1 sm:grid-cols-2"
        />
      </SeccionFormulario>

      {/* El total y lo que va al PDF, juntos en su tarjeta (pulido final, 10/11: plegados sueltos debajo de la última
          tarjeta no se sabía a qué pertenecían). El descuento, que casi no se usa, y las condiciones, que vienen de
          Configuración, plegados */}
      <SeccionFormulario titulo="Total y condiciones" claseContenido="gap-4">
        {/* En la computadora el total va en el resumen del costado (ResumenPrecios, C7 §5.2); aquí, en lo angosto */}
        <div className="flex flex-col gap-0.5 @4xl:hidden">
          {/* Solo el total se anuncia al cambiar: la comparación aparece y se va */}
          <p className="flex items-baseline justify-between gap-4" aria-live="polite">
            <span className="font-semibold">Total</span>
            <span className="text-lg font-bold tabular-nums">{bs(p.totales.total)}</span>
          </p>
          {/* En una versión nueva, con cuánto se compara al cambiar los precios */}
          {anterior && anterior.total !== p.totales.total && (
            <p className="text-sm text-tinta-suave tabular-nums">
              Versión {anterior.version}: {bs(anterior.total)}
              {anterior.quitados > 0 && `, con ${anterior.quitados === 1 ? "un servicio que ya no se ofrece" : `${anterior.quitados} servicios que ya no se ofrecen`}`}
            </p>
          )}
        </div>
        <MasDatos texto="Agregar descuento" titulo="Descuento" abierto={!!p.descuento || !!e.descuento}>
          <Campo id="descuento" etiqueta="Monto del descuento" error={e.descuento}>
            <CampoMonto id="descuento" name="descuento" value={p.descuento} onChange={(ev) => p.setDescuento(ev.target.value)} aria-invalid={!!e.descuento} aria-describedby={e.descuento ? "descuento-error" : undefined} />
          </Campo>
          {/* El desglose, con descuento: el total va arriba */}
          {p.totales.descuento !== "0.00" && (
            <dl className="grid max-w-sm grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-sm">
              <dt className="text-tinta-suave">Subtotal</dt>
              <dd className="text-right tabular-nums">{bs(p.totales.subtotal)}</dd>
              <dt className="text-tinta-suave">Descuento</dt>
              <dd className="text-right tabular-nums">− {bs(p.totales.descuento)}</dd>
            </dl>
          )}
        </MasDatos>
        {/* Siempre a la vista (hallazgo 8 de la prueba en celulares, 15/11): el adelanto y la validez se revisan en cada
            cotización, y plegados detrás de "Cambiar adelanto o validez" se pasaban por alto */}
        <div className="grid gap-5 sm:grid-cols-2">
          <Campo id="adelanto" etiqueta="Adelanto sugerido" opcional error={e.adelanto}>
            <CampoMonto id="adelanto" name="adelanto" value={p.adelanto} onChange={(ev) => p.setAdelanto(ev.target.value)} aria-invalid={!!e.adelanto} aria-describedby={e.adelanto ? "adelanto-error" : undefined} />
          </Campo>
          <Campo id="validaHasta" etiqueta="Válida hasta" error={e.validaHasta}>
            <Input id="validaHasta" name="validaHasta" type="date" min={hoy} value={p.validaHasta} onChange={(ev) => p.setValidaHasta(ev.target.value)} aria-invalid={!!e.validaHasta} aria-describedby={e.validaHasta ? "validaHasta-error" : undefined} className={ANCHO_DATO.fecha} />
          </Campo>
        </div>
      </SeccionFormulario>
    </>
  );
}

/**
 * Los montos del resumen del costado en la computadora (ConResumen, C7 §5.2), al pie de "Cotización para": el subtotal y
 * el descuento si hay, el total (que se anuncia al cambiar), el adelanto sugerido y, en una versión nueva, con cuánto se
 * compara.
 */
export function ResumenPrecios({ precios: p, anterior }: { precios: Precios; anterior?: Props["anterior"] }) {
  const conDescuento = p.totales.descuento !== "0.00";
  return (
    <>
      <dl className="flex flex-col gap-2">
        {conDescuento && <FilaResumen etiqueta="Subtotal" valor={bs(p.totales.subtotal)} />}
        {conDescuento && <FilaResumen etiqueta="Descuento" valor={`− ${bs(p.totales.descuento)}`} />}
        <div aria-live="polite">
          <FilaResumen etiqueta="Total" valor={bs(p.totales.total)} fuerte separada={conDescuento} />
        </div>
        {p.adelanto && <FilaResumen etiqueta="Adelanto sugerido" valor={`${p.adelanto} Bs`} suave />}
      </dl>
      {anterior && anterior.total !== p.totales.total && <p className="text-sm text-tinta-suave tabular-nums">Versión {anterior.version}: {bs(anterior.total)}</p>}
    </>
  );
}

/** El total a la vista en el pie fijo del celular, junto al botón. "Total y condiciones" ya lo anuncia (aria-live). */
export function TotalEnPie({ total }: { total: string }) {
  return (
    <p className="flex items-baseline gap-2 sm:hidden" aria-hidden>
      <span className="text-tinta-suave">Total</span>
      <span className="text-lg font-bold tabular-nums">{bs(total)}</span>
    </p>
  );
}
