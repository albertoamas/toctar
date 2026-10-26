"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { HistoryIcon } from "lucide-react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { conAviso } from "@/componentes/panel/avisos";
import { Campo } from "@/componentes/panel/campo";
import { CancelarSeccion, useCerrarSeccion } from "@/componentes/panel/seccion-editable";
import { CampoMonto } from "@/componentes/panel/campo-monto";
import { Button } from "@/componentes/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/componentes/ui/dialog";
import { Input } from "@/componentes/ui/input";
import { formatearFechaHora } from "@/lib/fechas";
import type { EstadoFormulario } from "@/lib/formularios";
import { guardarPreciosVariante, verHistorialPrecios } from "../acciones";
import type { Tamano } from "@/modulos/configuracion/consultas";
import type { CambioPrecio, VarianteCatalogo } from "../consultas";
import { mostrarMonto, textoDias, type Monto } from "../reglas";

// HU-20: precios de una variante por tamaño de vehículo y su duración propia. Se abre con "Editar" desde la ficha del
// servicio (PreciosVariante, en lectura) y se cierra al guardar.

type Props = { variante: VarianteCatalogo; tamanos: Tamano[]; duracionServicio: number };

export function FormularioPrecios({ variante: v, tamanos, duracionServicio }: Props) {
  const cerrar = useCerrarSeccion();
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
      <p className="text-sm text-tinta-suave">Vacío: «Según evaluación», cuando depende de ver el vehículo.</p>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {tamanos.map((t) => {
          const nombre = `precio-${t.id}`;
          const id = `${prefijo}-${nombre}`;
          const vigente: Monto | undefined = v.precios[t.id];
          return (
            <Campo key={t.id} id={id} etiqueta={t.nombre} error={e[nombre]}>
              <CampoMonto
                id={id}
                name={nombre}
                // Vacío: el campo dice si está "según evaluación" o "sin cargar"
                placeholder={vigente === null ? "Según evaluación" : vigente === undefined ? "Sin cargar" : undefined}
                defaultValue={valores ? valores[nombre] : vigente ? mostrarMonto(vigente) : ""}
                aria-invalid={!!e[nombre]}
                aria-describedby={e[nombre] ? `${id}-error` : undefined}
              />
            </Campo>
          );
        })}
      </div>

      <Campo id={`${prefijo}-duracion`} etiqueta="Duración propia" error={e.duracionDias} ayuda={`Vacío: usa la del servicio (${textoDias(duracionServicio)}).`}>
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

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : "Guardar precios"}
        </Button>
        <CancelarSeccion />
        <Historial variante={v} />
      </div>
    </form>
  );
}

function Historial({ variante }: { variante: VarianteCatalogo }) {
  const [cambios, setCambios] = useState<CambioPrecio[] | null>(null);
  const [cargando, iniciar] = useTransition();
  return (
    <Dialog onOpenChange={(abierto) => abierto && iniciar(async () => setCambios(await verHistorialPrecios(variante.id)))}>
      <DialogTrigger render={<Button type="button" variant="outline" />}>
        <HistoryIcon />
        Ver historial
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Historial de precios: {variante.nombre}</DialogTitle>
          <DialogDescription>Cada cambio queda guardado; los anteriores no se borran.</DialogDescription>
        </DialogHeader>
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
      </DialogContent>
    </Dialog>
  );
}

const textoMonto = (monto: Monto) => (monto === null ? "Según evaluación" : `${mostrarMonto(monto)} Bs`);
