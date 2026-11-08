"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { HistoryIcon } from "lucide-react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { conAviso } from "@/componentes/panel/avisos";
import { Campo, MensajeError } from "@/componentes/panel/campo";
import { CancelarModal, ModalFormulario, PieModal, useCerrarModal } from "@/componentes/panel/modal-formulario";
import { CampoMonto } from "@/componentes/panel/campo-monto";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { formatearFechaHora } from "@/lib/fechas";
import type { EstadoFormulario } from "@/lib/formularios";
import { guardarPreciosVariante, verHistorialPrecios } from "../acciones";
import type { Tamano } from "@/modulos/configuracion/consultas";
import type { CambioPrecio, VarianteCatalogo } from "../consultas";
import { mostrarMonto, textoDias, type Monto } from "../reglas";

// HU-20: precios de una variante por tamaño de vehículo y su duración propia. Va en el modal de "Editar" de la ficha
// del servicio (PreciosVariante, en lectura) y lo cierra al guardar.

type Props = { variante: VarianteCatalogo; tamanos: Tamano[]; duracionServicio: number };

export function FormularioPrecios({ variante: v, tamanos, duracionServicio }: Props) {
  const cerrar = useCerrarModal();
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(
    conAviso(guardarPreciosVariante, (r) => r.ok && cerrar()),
    {},
  );
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);
  const valores = estado.valores;
  const e = estado.errores ?? {};
  const prefijo = `variante-${v.id}`;

  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-5" noValidate aria-label={`Precios de ${v.nombre}`}>
      <input type="hidden" name="varianteId" value={v.id} />
      {/* El historial se consulta, no guarda: arriba, y en el pie solo guardar o cancelar */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="text-sm text-tinta-suave">Vacío: «Según evaluación», cuando depende de ver el vehículo.</p>
        <Historial variante={v} />
      </div>

      {/* Una fila por tamaño, como la lectura: el nombre a la izquierda y el monto a la derecha, alineados aunque el nombre
          ocupe dos líneas (en una grilla, los nombres largos movían los campos de altura) */}
      <div className="flex flex-col divide-y divide-border">
        {tamanos.map((t) => {
          const nombre = `precio-${t.id}`;
          const id = `${prefijo}-${nombre}`;
          const vigente: Monto | undefined = v.precios[t.id];
          return (
            <div key={t.id} className="flex flex-col gap-1 py-2">
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor={id} className="min-w-0 font-normal">
                  {t.nombre}
                </Label>
                {/* Ancho fijo: un nombre de dos líneas no achica el campo, y todos quedan en columna */}
                <div className="w-40 shrink-0">
                  <CampoMonto
                    id={id}
                    name={nombre}
                    // Vacío: el campo dice si está "según evaluación" o "sin cargar"
                    placeholder={vigente === null ? "Según evaluación" : vigente === undefined ? "Sin cargar" : undefined}
                    defaultValue={valores ? valores[nombre] : vigente ? mostrarMonto(vigente) : ""}
                    aria-invalid={!!e[nombre]}
                    aria-describedby={e[nombre] ? `${id}-error` : undefined}
                  />
                </div>
              </div>
              {e[nombre] && <MensajeError id={`${id}-error`}>{e[nombre]}</MensajeError>}
            </div>
          );
        })}
      </div>

      <Campo id={`${prefijo}-duracion`} etiqueta="Duración propia" opcional error={e.duracionDias} ayuda={`Vacío: usa la del servicio (${textoDias(duracionServicio)}).`}>
        <div className="flex items-center gap-2">
          <Input
            id={`${prefijo}-duracion`}
            name="duracionDias"
            inputMode="numeric"
            autoComplete="off"
            defaultValue={valores ? valores.duracionDias : (v.duracionDias ?? "")}
            aria-invalid={!!e.duracionDias}
            aria-describedby={e.duracionDias ? `${prefijo}-duracion-error` : `${prefijo}-duracion-ayuda`}
            className="max-w-24"
          />
          <span className="text-tinta-suave">días</span>
        </div>
      </Campo>

      <PieModal>
        <Button type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : "Guardar precios"}
        </Button>
        <CancelarModal />
      </PieModal>
    </form>
  );
}

function Historial({ variante }: { variante: VarianteCatalogo }) {
  const [cambios, setCambios] = useState<CambioPrecio[] | null>(null);
  const [cargando, iniciar] = useTransition();
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      {/* -ml: el texto del botón sin fondo queda alineado con la línea de ayuda */}
      <Button
        type="button"
        variant="ghost"
        className="-ml-2.5"
        onClick={() => {
          setAbierto(true);
          iniciar(async () => setCambios(await verHistorialPrecios(variante.id)));
        }}
      >
        <HistoryIcon />
        Ver historial
      </Button>
      <ModalFormulario titulo={`Historial de precios: ${variante.nombre}`} abierto={abierto} alCambiar={setAbierto}>
        <p className="text-sm text-tinta-suave">Cada cambio queda guardado; los anteriores no se borran.</p>
        {cargando || cambios === null ? (
          <p className="text-sm text-tinta-suave">Cargando…</p>
        ) : cambios.length === 0 ? (
          <p className="text-sm text-tinta-suave">Todavía no hay cambios de precio.</p>
        ) : (
          <ol aria-label="Cambios de precio" className="flex flex-col divide-y divide-border">
            {cambios.map((c) => (
              <li key={c.id} className="flex flex-col gap-0.5 py-2">
                <span className="font-semibold">{c.tamano}</span>
                <span>
                  {c.anterior === undefined ? "Sin cargar" : textoMonto(c.anterior)} → {textoMonto(c.monto)}
                </span>
                <span className="text-sm text-tinta-suave">
                  {formatearFechaHora(new Date(c.fecha))}, {c.autor}
                </span>
              </li>
            ))}
          </ol>
        )}
        <PieModal>
          <CancelarModal texto="Listo" />
        </PieModal>
      </ModalFormulario>
    </>
  );
}

const textoMonto = (monto: Monto) => (monto === null ? "Según evaluación" : `${mostrarMonto(monto)} Bs`);
