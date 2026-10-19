"use client";

import { useActionState, useRef } from "react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { conAviso } from "@/componentes/panel/avisos";
import { Campo } from "@/componentes/panel/campo";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
import type { EstadoFormulario } from "@/lib/formularios";
import { guardarParametros } from "../acciones";
import { PARAMETROS, type ClaveParametro } from "../parametros";

const guardarConAviso = conAviso(guardarParametros);

const NUMEROS: ClaveParametro[] = ["adelanto_sugerido", "validez_cotizacion_dias", "intervalo_mantenimiento_meses"];
const TEXTOS: ClaveParametro[] = ["condiciones_cotizacion", "garantia_cotizacion"];

// HU-05: valores que usan las cotizaciones, las reservas y los avisos de mantenimiento.
export function FormularioParametros({ valores: iniciales }: { valores: Record<ClaveParametro, string> }) {
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(guardarConAviso, {});
  const v = estado.valores ?? iniciales;
  const e = estado.errores ?? {};
  const describir = (c: string) => (e[c] ? `${c}-error` : `${c}-ayuda`);
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);

  return (
    <form ref={formulario} action={accion} className="flex max-w-2xl flex-col gap-10" noValidate>
      <p className="text-tinta-suave">
        Cambiar un valor no toca lo ya guardado: las cotizaciones y reservas hechas conservan el que tenían.
      </p>

      <fieldset className="flex flex-col gap-5">
        <legend className="mb-5 font-heading text-2xl font-bold italic">Valores sugeridos</legend>
        {NUMEROS.map((c) => {
          const p = PARAMETROS[c];
          return (
            <Campo key={c} id={c} etiqueta={p.etiqueta} error={e[c]} ayuda={p.ayuda}>
              {/* La unidad siempre después ("250 Bs", "15 días"): así los tres campos quedan alineados (pulido 6.3) */}
              <div className="flex items-center gap-2">
                <Input
                  id={c}
                  name={c}
                  inputMode="numeric"
                  autoComplete="off"
                  defaultValue={v[c]}
                  aria-invalid={!!e[c]}
                  aria-describedby={describir(c)}
                  className="max-w-32"
                />
                <span className="text-tinta-suave">{p.unidad}</span>
              </div>
            </Campo>
          );
        })}
      </fieldset>

      <fieldset className="flex flex-col gap-5">
        <legend className="mb-5 flex flex-col gap-1">
          <span className="font-heading text-2xl font-bold italic">Textos del PDF de cotización</span>
          <span className="text-sm text-tinta-suave">Salen al pie de cada cotización.</span>
        </legend>
        {TEXTOS.map((c) => (
          <Campo key={c} id={c} etiqueta={PARAMETROS[c].etiqueta} error={e[c]} ayuda={PARAMETROS[c].ayuda}>
            <Textarea id={c} name={c} rows={5} defaultValue={v[c]} aria-invalid={!!e[c]} aria-describedby={describir(c)} />
          </Campo>
        ))}
      </fieldset>

      <div>
        <Button type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
