"use client";

import { useActionState, useRef, useState } from "react";
import { CalendarPlusIcon } from "lucide-react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { conAviso } from "@/componentes/panel/avisos";
import { Campo, MensajeError } from "@/componentes/panel/campo";
import { Selector } from "@/componentes/panel/selector";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { sumarDias } from "@/lib/fechas";
import type { EstadoFormulario } from "@/lib/formularios";
import { useEspaciosLibres } from "@/modulos/agenda/componentes/espacios-libres";
import { DIAS_MAXIMOS_TRABAJO } from "@/modulos/agenda/reglas";
import { espaciosParaExtender, extenderEntrega } from "../acciones";

// HU-34: extender la entrega de una orden que se atrasa (decisión del 20/10). Se queda en su espacio si sigue libre en
// los días nuevos; si no, se ofrecen los libres para todo el período, desde el ingreso. La base frena un cruce (D-5).

type Props = { id: number; fechaInicio: string; fechaFin: string; espacioId: number; espacio: string; hoy: string };

export function ExtenderEntrega(props: Props) {
  const [abierto, setAbierto] = useState(false);
  if (abierto) return <Formulario {...props} cerrar={() => setAbierto(false)} />;
  return (
    <div>
      <Button type="button" variant="outline" onClick={() => setAbierto(true)}>
        <CalendarPlusIcon />
        Extender entrega
      </Button>
    </div>
  );
}

function Formulario({ id, fechaInicio, fechaFin: finActual, espacioId: espacioActual, espacio: nombreActual, hoy, cerrar }: Props & { cerrar: () => void }) {
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(
    conAviso(extenderEntrega, (r) => r.ok && cerrar()),
    {},
  );
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);
  const e = estado.errores ?? {};
  // Después de la actual y, si ya está atrasada, desde hoy: una fecha que ya pasó no sirve
  const minima = sumarDias(finActual, 1) > hoy ? sumarDias(finActual, 1) : hoy;
  const [fechaFin, setFechaFin] = useState(minima);
  const { libres, activos, buscando, ayuda } = useEspaciosLibres(fechaInicio, fechaFin, {
    excepto: id,
    consultar: espaciosParaExtender,
    ayudaFechas: `Revisa la fecha: después de la entrega actual, desde hoy y hasta ${DIAS_MAXIMOS_TRABAJO} días desde el ingreso.`,
  });
  // Se queda en su espacio mientras siga libre; si no, hay que elegir otro
  const [espacioElegido, setEspacioId] = useState(String(espacioActual));
  const espacioId = libres.some((x) => String(x.id) === espacioElegido) ? espacioElegido : "";
  // Su espacio, si ya no sirve: ocupado esos días, o desactivado (los activos no lo traen)
  const suyo = buscando || activos.length === 0 || libres.some((x) => x.id === espacioActual) ? null : activos.some((x) => x.id === espacioActual) ? "ocupado en esas fechas" : "desactivado";

  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-5 rounded-sm border border-border p-4" noValidate aria-labelledby="extender-titulo">
      <h3 id="extender-titulo" className="font-heading text-xl font-bold italic">Extender entrega</h3>
      <input type="hidden" name="id" value={id} />
      {estado.mensaje && !estado.ok && <MensajeError id="extender-error">{estado.mensaje}</MensajeError>}
      <Campo id="fechaFin" etiqueta="Nueva entrega" error={e.fechaFin}>
        <Input
          id="fechaFin"
          name="fechaFin"
          type="date"
          min={minima}
          max={sumarDias(fechaInicio, DIAS_MAXIMOS_TRABAJO)}
          value={fechaFin}
          onChange={(ev) => setFechaFin(ev.target.value)}
          className="max-w-xs"
          aria-invalid={!!e.fechaFin}
          aria-describedby={e.fechaFin ? "fechaFin-error" : undefined}
        />
      </Campo>
      {suyo && (
        <p role="status" className="rounded-sm border border-aviso p-3 text-sm">
          {nombreActual} está {suyo}: muévela a un espacio libre.
        </p>
      )}
      <Campo id="espacioId" etiqueta="Espacio" error={e.espacioId} ayuda={ayuda}>
        <Selector
          id="espacioId"
          name="espacioId"
          value={espacioId}
          onChange={(ev) => setEspacioId(ev.target.value)}
          disabled={buscando}
          aria-invalid={!!e.espacioId}
          aria-describedby={e.espacioId ? "espacioId-error" : "espacioId-ayuda"}
          className="max-w-xs"
        >
          <option value="">Elige el espacio</option>
          {libres.map((x) => (
            <option key={x.id} value={x.id}>{x.nombre}</option>
          ))}
        </Selector>
      </Campo>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={enviando || buscando}>
          {enviando ? "Guardando…" : "Extender entrega"}
        </Button>
        <Button type="button" variant="outline" onClick={cerrar}>
          Volver
        </Button>
      </div>
    </form>
  );
}
