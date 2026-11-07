"use client";

import { useActionState, useRef } from "react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { conAviso } from "@/componentes/panel/avisos";
import { SeccionFormulario } from "@/componentes/panel/seccion-formulario";
import { Campo } from "@/componentes/panel/campo";
import { BarraGuardar } from "@/componentes/panel/cambios-sin-guardar";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
import type { EstadoFormulario } from "@/lib/formularios";
import { guardarParametros } from "../acciones";
import { CLAVES_PARAMETRO, PARAMETROS, SECCIONES_PARAMETROS, type ClaveParametro, type SeccionParametros } from "../parametros";

const guardarConAviso = conAviso(guardarParametros);

const SECCIONES = Object.keys(SECCIONES_PARAMETROS) as SeccionParametros[];

// HU-05: valores que usan las consultas, las cotizaciones, las reservas y los avisos de mantenimiento, por tema (C5 §0).
// Las secciones y lo que va en cada una salen de PARAMETROS: un parámetro nuevo aparece solo en su sección.
export function FormularioParametros({ valores: iniciales }: { valores: Record<ClaveParametro, string> }) {
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(guardarConAviso, {});
  const v = estado.valores ?? iniciales;
  const e = estado.errores ?? {};
  const describir = (c: string) => (e[c] ? `${c}-error` : `${c}-ayuda`);
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);

  return (
    <form ref={formulario} action={accion} className="flex max-w-2xl flex-col gap-6" noValidate>
      <p className="text-tinta-suave">
        Cambiar un valor no toca lo ya guardado: las cotizaciones y reservas hechas conservan el que tenían.
      </p>

      {SECCIONES.map((s) => {
        const { titulo, descripcion } = SECCIONES_PARAMETROS[s];
        return (
          <SeccionFormulario key={s} titulo={titulo} descripcion={descripcion ?? undefined}>
            {CLAVES_PARAMETRO.filter((c) => PARAMETROS[c].seccion === s).map((c) => {
              const p = PARAMETROS[c];
              return (
                <Campo key={c} id={c} etiqueta={p.etiqueta} error={e[c]} ayuda={p.ayuda}>
                  {p.unidad ? (
                    // La unidad siempre después ("250 Bs", "15 días"): así los números quedan alineados (pulido 6.3)
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
                  ) : (
                    <Textarea id={c} name={c} rows={5} defaultValue={v[c]} aria-invalid={!!e[c]} aria-describedby={describir(c)} />
                  )}
                </Campo>
              );
            })}
          </SeccionFormulario>
        );
      })}

      <BarraGuardar formulario={formulario} estado={estado} texto="Guardar cambios" enviando={enviando} />
    </form>
  );
}
