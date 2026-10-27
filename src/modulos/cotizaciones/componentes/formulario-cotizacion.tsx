"use client";

import Image from "next/image";
import { useActionState, useRef, useState } from "react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { Campo, MensajeError } from "@/componentes/panel/campo";
import { CampoMonto } from "@/componentes/panel/campo-monto";
import { PieFormulario } from "@/componentes/panel/pie-formulario";
import { Button } from "@/componentes/ui/button";
import { Checkbox } from "@/componentes/ui/checkbox";
import { Input } from "@/componentes/ui/input";
import type { EstadoFormulario } from "@/lib/formularios";
import { leerMonto, mostrarMonto } from "@/modulos/catalogo/reglas";
import { guardarCotizacion } from "../acciones";
import type { DatosParaCotizar } from "../consultas";
import { calcularTotales, leerMontoOCero, MAXIMO_FOTOS_PDF } from "../reglas";
import { LineasServicio, type Linea } from "./lineas-servicio";

// HU-25: armar la cotización (RF-31). Solo el dueño. Las líneas salen del catálogo con el precio sugerido del tamaño
// del vehículo; el precio se puede cambiar y "según evaluación" obliga a escribirlo. Los totales se ven mientras se
// escribe y el servidor los vuelve a calcular. Guardar es enviar: corregir después crea otra versión (RN-02).
// Pulido 9.4: el total y "Guardar y generar PDF" fijos abajo en el celular (se ve el total mientras se cargan los
// precios); el precio (descuento y resumen) separado de las condiciones del PDF (adelanto, validez y estimado).

type Props = { datos: DatosParaCotizar; hoy: string };

/** "1250,50 Bs": el mismo formato que en la consulta y el catálogo (y no depende del idioma del servidor o del teléfono). */
const bs = (monto: string) => `${mostrarMonto(monto)} Bs`;

export function FormularioCotizacion({ datos, hoy }: Props) {
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(guardarCotizacion, {});
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);
  const e = estado.errores ?? {};

  // Todo controlado: React reinicia el formulario al terminar la acción y así nada se pierde tras un error
  const mostrar = (monto: string) => (monto === "0.00" ? "" : mostrarMonto(monto));
  const [lineas, setLineas] = useState<Linea[]>(datos.inicial.lineas.map((l) => ({ varianteId: l.varianteId, precio: mostrarMonto(l.precio) })));
  const [descuento, setDescuento] = useState(mostrar(datos.inicial.descuento));
  const [adelanto, setAdelanto] = useState(mostrarMonto(datos.inicial.adelanto));
  const [validaHasta, setValidaHasta] = useState(datos.inicial.validaHasta);
  const [esEstimado, setEsEstimado] = useState(datos.inicial.esEstimado);
  const [fotos, setFotos] = useState<number[]>(datos.inicial.fotos);

  const totales = calcularTotales(
    lineas.map((l) => leerMonto(l.precio) ?? "0"),
    leerMontoOCero(descuento) ?? "0",
  );

  return (
    <form ref={formulario} action={accion} className="flex max-w-3xl flex-col gap-10" noValidate>
      <input type="hidden" name="consultaId" value={datos.consultaId} />
      {datos.desdeId && <input type="hidden" name="desde" value={datos.desdeId} />}
      {estado.mensaje && !estado.ok && <MensajeError id="cotizacion-error">{estado.mensaje}</MensajeError>}

      <fieldset className="flex flex-col gap-4">
        {/* Sin la ayuda de los precios del tamaño: el tamaño está en el encabezado y cada línea dice su sugerido */}
        <legend className="mb-4 font-heading text-2xl font-bold italic">Servicios</legend>
        <LineasServicio opciones={datos.opciones} lineas={lineas} onChange={setLineas} errores={e} />
      </fieldset>

      <fieldset className="flex flex-col gap-5">
        <legend className="mb-5 font-heading text-2xl font-bold italic">Total</legend>
        <Campo id="descuento" etiqueta="Descuento" error={e.descuento} ayuda="Opcional.">
          <CampoMonto id="descuento" name="descuento" value={descuento} onChange={(ev) => setDescuento(ev.target.value)} aria-invalid={!!e.descuento} aria-describedby={e.descuento ? "descuento-error" : "descuento-ayuda"} />
        </Campo>
        <dl className="grid max-w-sm grid-cols-[1fr_auto] gap-x-6 gap-y-2 rounded-sm border border-border p-4" aria-live="polite">
          <dt className="text-tinta-suave">Subtotal</dt>
          <dd className="text-right tabular-nums">{bs(totales.subtotal)}</dd>
          <dt className="text-tinta-suave">Descuento</dt>
          <dd className="text-right tabular-nums">{totales.descuento === "0.00" ? "—" : `− ${bs(totales.descuento)}`}</dd>
          <dt className="font-semibold">Total</dt>
          <dd className="text-right text-lg font-bold tabular-nums">{bs(totales.total)}</dd>
        </dl>
      </fieldset>

      <fieldset className="flex flex-col gap-5">
        <legend className="mb-5 font-heading text-2xl font-bold italic">Condiciones</legend>
        {/* Vienen de Configuración y casi siempre se dejan así: sin ayudas que lo repitan */}
        <div className="grid gap-5 sm:grid-cols-2">
          <Campo id="adelanto" etiqueta="Adelanto sugerido" error={e.adelanto}>
            <CampoMonto id="adelanto" name="adelanto" value={adelanto} onChange={(ev) => setAdelanto(ev.target.value)} aria-invalid={!!e.adelanto} aria-describedby={e.adelanto ? "adelanto-error" : undefined} />
          </Campo>
          <Campo id="validaHasta" etiqueta="Válida hasta" error={e.validaHasta}>
            <Input id="validaHasta" name="validaHasta" type="date" min={hoy} value={validaHasta} onChange={(ev) => setValidaHasta(ev.target.value)} aria-invalid={!!e.validaHasta} aria-describedby={e.validaHasta ? "validaHasta-error" : undefined} className="max-w-48" />
          </Campo>
        </div>
        <div className="flex flex-col gap-1">
          {esEstimado && <input type="hidden" name="esEstimado" value="on" />}
          <label htmlFor="esEstimado" className="flex min-h-11 cursor-pointer items-center gap-3">
            <Checkbox id="esEstimado" checked={esEstimado} onCheckedChange={(marcado) => setEsEstimado(marcado === true)} aria-describedby="esEstimado-ayuda" />
            <span className="font-medium">Estimado según fotos o video</span>
          </label>
          <p id="esEstimado-ayuda" className="text-sm text-tinta-suave">El PDF avisa que el precio se confirma al ver el vehículo.</p>
        </div>
      </fieldset>

      {datos.fotos.length > 0 && (
        <fieldset className="flex flex-col gap-3" aria-describedby={e.fotos ? "fotos-error" : undefined}>
          <legend className="mb-3 font-heading text-2xl font-bold italic">Fotos para el PDF (hasta {MAXIMO_FOTOS_PDF})</legend>
          {fotos.map((f) => (
            <input key={f} type="hidden" name="fotos" value={f} />
          ))}
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {datos.fotos.map((f, i) => {
              const marcada = fotos.includes(f.id);
              const lleno = !marcada && fotos.length >= MAXIMO_FOTOS_PDF;
              return (
                <li key={f.id}>
                  <label htmlFor={`foto-${f.id}`} className={`relative block cursor-pointer overflow-hidden rounded-sm border-2 ${marcada ? "border-tinta" : "border-transparent"} ${lleno ? "cursor-not-allowed opacity-50" : ""}`}>
                    <Image src={f.miniatura} alt="" width={f.ancho ?? 640} height={f.alto ?? 640} unoptimized className="aspect-square w-full object-cover" />
                    <span className="absolute top-1 left-1 rounded-sm bg-fondo p-1">
                      <Checkbox
                        id={`foto-${f.id}`}
                        checked={marcada}
                        disabled={lleno}
                        onCheckedChange={(si) => setFotos((actuales) => (si ? [...actuales, f.id] : actuales.filter((x) => x !== f.id)))}
                        aria-label={`Foto ${i + 1} en el PDF`}
                      />
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          {e.fotos && <MensajeError id="fotos-error">{e.fotos}</MensajeError>}
        </fieldset>
      )}

      <PieFormulario>
        <div className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-2 sm:justify-start">
          {/* El resumen de arriba lo anuncia (aria-live): este repite el total a la vista, sin volver a anunciarlo */}
          <p className="flex items-baseline gap-2" aria-hidden>
            <span className="text-tinta-suave">Total</span>
            <span className="text-lg font-bold tabular-nums">{bs(totales.total)}</span>
          </p>
          <Button type="submit" disabled={enviando}>
            {enviando ? "Guardando y generando el PDF…" : datos.desde ? `Guardar versión ${datos.desde.version + 1} y generar PDF` : "Guardar y generar PDF"}
          </Button>
        </div>
      </PieFormulario>
    </form>
  );
}
