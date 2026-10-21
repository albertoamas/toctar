"use client";

import Image from "next/image";
import { useActionState, useRef, useState } from "react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { Campo, MensajeError } from "@/componentes/panel/campo";
import { CampoMonto } from "@/componentes/panel/campo-monto";
import { EditorLista } from "@/componentes/panel/editor-lista";
import { Selector } from "@/componentes/panel/selector";
import { Button } from "@/componentes/ui/button";
import { Checkbox } from "@/componentes/ui/checkbox";
import { Input } from "@/componentes/ui/input";
import type { EstadoFormulario } from "@/lib/formularios";
import { leerMonto, mostrarMonto } from "@/modulos/catalogo/reglas";
import { guardarCotizacion } from "../acciones";
import type { DatosParaCotizar, OpcionServicio } from "../consultas";
import { calcularTotales, leerMontoOCero, MAXIMO_FOTOS_PDF, MAXIMO_LINEAS, type Sugerencia } from "../reglas";

// HU-25: armar la cotización (RF-31). Solo el dueño. Las líneas salen del catálogo con el precio sugerido del tamaño
// del vehículo; el precio se puede cambiar y "según evaluación" obliga a escribirlo. Los totales se ven mientras se
// escribe y el servidor los vuelve a calcular. Guardar es enviar: corregir después crea otra versión (RN-02).

type Linea = { varianteId: number; precio: string };
type Props = { datos: DatosParaCotizar; hoy: string };

const textoSugerencia = (s: Sugerencia) =>
  s.tipo === "monto"
    ? `Precio sugerido: ${mostrarMonto(s.monto)} Bs`
    : s.tipo === "evaluacion"
      ? "Según evaluación: escribe el precio"
      : "Sin precio en el catálogo para este tamaño: escribe el precio";

/** "1250,50 Bs": el mismo formato que en la consulta y el catálogo (y no depende del idioma del servidor o del teléfono). */
const bs = (monto: string) => `${mostrarMonto(monto)} Bs`;

/** Agrupa las opciones por servicio para el selector (un servicio con varias variantes). */
function porServicio(opciones: OpcionServicio[]) {
  const grupos = new Map<string, OpcionServicio[]>();
  for (const o of opciones) grupos.set(o.servicio, [...(grupos.get(o.servicio) ?? []), o]);
  return [...grupos];
}

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

  const opcion = (varianteId: number) => datos.opciones.find((o) => o.varianteId === varianteId);
  const totales = calcularTotales(
    lineas.map((l) => leerMonto(l.precio) ?? "0"),
    leerMontoOCero(descuento) ?? "0",
  );
  const grupos = porServicio(datos.opciones);

  return (
    <form ref={formulario} action={accion} className="flex max-w-3xl flex-col gap-10" noValidate>
      <input type="hidden" name="consultaId" value={datos.consultaId} />
      {datos.desdeId && <input type="hidden" name="desde" value={datos.desdeId} />}
      {estado.mensaje && !estado.ok && <MensajeError id="cotizacion-error">{estado.mensaje}</MensajeError>}

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-4 flex flex-col gap-1">
          <span className="font-heading text-2xl font-bold italic">Servicios</span>
          <span className="text-sm text-tinta-suave">Los precios sugeridos son los del catálogo para {datos.tamano}.</span>
        </legend>
        <EditorLista<Linea>
          nombre="lineas"
          etiqueta="Servicio"
          valor={lineas}
          onChange={setLineas}
          nueva={() => ({ varianteId: 0, precio: "" })}
          maximo={MAXIMO_LINEAS}
          textoAgregar="Agregar servicio"
          errores={e}
          fila={(l, cambiar, i, marca) => {
            const elegida = opcion(l.varianteId);
            // El error de la fila va al campo que falta: el servicio si no se eligió; si no, el precio
            const sinMarca = { "aria-invalid": false, "aria-describedby": undefined };
            return (
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                <Selector
                  aria-label={`Servicio ${i + 1}`}
                  value={l.varianteId || ""}
                  onChange={(ev) => {
                    const nueva = opcion(Number(ev.target.value));
                    // Al elegir, el precio sugerido; "según evaluación" o sin cargar lo dejan vacío para escribirlo
                    cambiar({ varianteId: Number(ev.target.value), precio: nueva?.sugerencia.tipo === "monto" ? mostrarMonto(nueva.sugerencia.monto) : "" });
                  }}
                  {...(elegida ? sinMarca : marca)}
                >
                  <option value="">Elige el servicio</option>
                  {grupos.map(([servicio, opciones]) =>
                    opciones.length === 1 ? (
                      <option key={servicio} value={opciones[0].varianteId}>{opciones[0].descripcion}</option>
                    ) : (
                      <optgroup key={servicio} label={servicio}>
                        {opciones.map((o) => (
                          <option key={o.varianteId} value={o.varianteId}>{o.descripcion}</option>
                        ))}
                      </optgroup>
                    ),
                  )}
                </Selector>
                <div className="flex flex-col gap-1">
                  <CampoMonto aria-label={`Precio del servicio ${i + 1}`} value={l.precio} onChange={(ev) => cambiar({ ...l, precio: ev.target.value })} {...(elegida ? marca : sinMarca)} />
                </div>
                {elegida && <p className="text-sm text-tinta-suave sm:col-span-2">{textoSugerencia(elegida.sugerencia)}</p>}
              </div>
            );
          }}
        />
      </fieldset>

      <fieldset className="flex flex-col gap-5">
        <legend className="mb-5 font-heading text-2xl font-bold italic">Total</legend>
        <Campo id="descuento" etiqueta="Descuento" error={e.descuento} ayuda="En bolivianos. Opcional.">
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
        <Campo id="adelanto" etiqueta="Adelanto sugerido" error={e.adelanto} ayuda="El de Configuración; se puede cambiar para este cliente.">
          <CampoMonto id="adelanto" name="adelanto" value={adelanto} onChange={(ev) => setAdelanto(ev.target.value)} aria-invalid={!!e.adelanto} aria-describedby={e.adelanto ? "adelanto-error" : "adelanto-ayuda"} />
        </Campo>
        <Campo id="validaHasta" etiqueta="Válida hasta" error={e.validaHasta} ayuda="Sugerida con los días de Configuración.">
          <Input id="validaHasta" name="validaHasta" type="date" min={hoy} value={validaHasta} onChange={(ev) => setValidaHasta(ev.target.value)} aria-invalid={!!e.validaHasta} aria-describedby={e.validaHasta ? "validaHasta-error" : "validaHasta-ayuda"} className="max-w-48" />
        </Campo>
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

      <div>
        <Button type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : datos.desde ? `Guardar versión ${datos.desde.version + 1}` : "Guardar cotización"}
        </Button>
      </div>
    </form>
  );
}
