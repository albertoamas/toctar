"use client";

import { useActionState, useRef, useState } from "react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { conAviso } from "@/componentes/panel/avisos";
import { Campo, MensajeError } from "@/componentes/panel/campo";
import { CancelarModal, PieModal, useCerrarModal } from "@/componentes/panel/modal-formulario";
import { Selector } from "@/componentes/panel/selector";
import { Button } from "@/componentes/ui/button";
import { Checkbox } from "@/componentes/ui/checkbox";
import { Input } from "@/componentes/ui/input";
import type { EstadoFormulario } from "@/lib/formularios";
import { guardarDatosCatalogo } from "../acciones";

// HU-19: nombre, duración, mantenimiento y si el servicio está activo en el catálogo. Va en el modal de "Editar" de la
// ficha del servicio y lo cierra al guardar. Pedido 21: el mantenimiento es el servicio que se agenda (puede ser él
// mismo) y cada cuántos meses; los campos aparecen al marcar la casilla.

type Props = {
  servicio: { id: number; nombre: string; duracionDias: number; mantenimiento: { servicioId: number; meses: number } | null; activo: boolean };
  /** Los servicios activos para elegir su mantenimiento, este primero. */
  servicios: { id: number; nombre: string }[];
};

export function FormularioDatosCatalogo({ servicio: s, servicios }: Props) {
  const cerrar = useCerrarModal();
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(
    conAviso(guardarDatosCatalogo, (r) => r.ok && cerrar()),
    {},
  );
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);
  const v = estado.valores;
  const e = estado.errores ?? {};
  const activo = v ? v.activo === "on" : s.activo;
  // Controlados: los campos del mantenimiento aparecen con la casilla, y nada se pierde tras un error
  const [conMantenimiento, setConMantenimiento] = useState(v ? v.conMantenimiento === "on" : !!s.mantenimiento);
  const [servicioMantenimiento, setServicioMantenimiento] = useState(v?.mantenimientoServicioId ?? String(s.mantenimiento?.servicioId ?? ""));
  const [meses, setMeses] = useState(v?.mantenimientoMeses ?? String(s.mantenimiento?.meses ?? ""));

  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-6" noValidate aria-label="Datos del servicio">
      <input type="hidden" name="id" value={s.id} />
      <Campo id="nombre" etiqueta="Nombre del servicio" error={e.nombre}>
        <Input
          id="nombre"
          name="nombre"
          autoComplete="off"
          defaultValue={v?.nombre ?? s.nombre}
          aria-invalid={!!e.nombre}
          aria-describedby={e.nombre ? "nombre-error" : undefined}
          className="max-w-md"
        />
      </Campo>
      <Campo
        id="duracionDias"
        etiqueta="Duración estimada"
        error={e.duracionDias}
        ayuda="Los días que suele ocupar un espacio. Solo sugiere la entrega al agendar."
      >
        <div className="flex items-center gap-2">
          <Input
            id="duracionDias"
            name="duracionDias"
            inputMode="numeric"
            autoComplete="off"
            defaultValue={v?.duracionDias ?? s.duracionDias}
            aria-invalid={!!e.duracionDias}
            aria-describedby={e.duracionDias ? "duracionDias-error" : "duracionDias-ayuda"}
            className="max-w-24"
          />
          <span className="text-tinta-suave">días</span>
        </div>
      </Campo>

      <div className="flex flex-col gap-4">
        {/* El valor en un campo oculto propio: la casilla de base-ui se vacía al reiniciarse el formulario */}
        {conMantenimiento && <input type="hidden" name="conMantenimiento" value="on" />}
        <label className="flex cursor-pointer items-start gap-3">
          <Checkbox checked={conMantenimiento} onCheckedChange={(si) => setConMantenimiento(si === true)} className="mt-0.5" />
          <span className="flex flex-col">
            <span className="font-semibold">Programa un mantenimiento al entregarlo</span>
            <span className="text-sm text-tinta-suave">Cada vehículo queda con su plan; se ajusta en la ficha del cliente.</span>
          </span>
        </label>
        {conMantenimiento && (
          <div className="flex flex-col gap-4 border-l-2 border-border pl-4">
            <Campo id="mantenimientoServicioId" etiqueta="Servicio de mantenimiento" error={e.mantenimientoServicioId}>
              <Selector
                id="mantenimientoServicioId"
                name="mantenimientoServicioId"
                value={servicioMantenimiento}
                onChange={(ev) => setServicioMantenimiento(ev.target.value)}
                aria-invalid={!!e.mantenimientoServicioId}
                aria-describedby={e.mantenimientoServicioId ? "mantenimientoServicioId-error" : undefined}
                className="max-w-md"
              >
                <option value="">Elige el servicio</option>
                {servicios.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.id === s.id ? "Este mismo servicio" : x.nombre}
                  </option>
                ))}
              </Selector>
            </Campo>
            <Campo id="mantenimientoMeses" etiqueta="Cada" error={e.mantenimientoMeses}>
              <div className="flex items-center gap-2">
                <Input
                  id="mantenimientoMeses"
                  name="mantenimientoMeses"
                  inputMode="numeric"
                  autoComplete="off"
                  value={meses}
                  onChange={(ev) => setMeses(ev.target.value)}
                  aria-invalid={!!e.mantenimientoMeses}
                  aria-describedby={e.mantenimientoMeses ? "mantenimientoMeses-error" : undefined}
                  className="max-w-24"
                />
                <span className="text-tinta-suave">meses</span>
              </div>
            </Campo>
          </div>
        )}
      </div>

      <label className="flex cursor-pointer items-start gap-3">
        {/* La key reinicia la casilla si el servidor devuelve otro valor */}
        <Checkbox key={String(activo)} name="activo" defaultChecked={activo} className="mt-0.5" />
        <span className="flex flex-col">
          <span className="font-semibold">Activo en el catálogo</span>
          <span className="text-sm text-tinta-suave">Inactivo, no se cotiza ni sale en el sitio. No se borra nada.</span>
        </span>
      </label>
      {/* No se desactiva si otro servicio lo usa como su mantenimiento (pedido 21) */}
      {e.activo && <MensajeError id="activo-error">{e.activo}</MensajeError>}
      <PieModal>
        <Button type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : "Guardar datos"}
        </Button>
        <CancelarModal />
      </PieModal>
    </form>
  );
}
