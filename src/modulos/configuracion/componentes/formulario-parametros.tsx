"use client";

import { useActionState, useRef } from "react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { conAviso } from "@/componentes/panel/avisos";
import { Campo } from "@/componentes/panel/campo";
import { CancelarModal, PieModal, useCerrarModal } from "@/componentes/panel/modal-formulario";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
import type { EstadoFormulario } from "@/lib/formularios";
import { guardarParametros } from "../acciones";
import { clavesDeSeccion, PARAMETROS, SECCIONES_PARAMETROS, type ClaveParametro, type SeccionParametros } from "../parametros";

// HU-05: valores que usan las cotizaciones, las reservas y los avisos de mantenimiento, por tema (C5 §0). Pulido 13.29:
// cada sección va en el modal de "Editar" de la ficha de Parámetros y guarda solo lo suyo. Los campos de cada sección
// salen de PARAMETROS: uno nuevo aparece solo en su sección.

type Props = { seccion: SeccionParametros; valores: Record<ClaveParametro, string> };

export function FormularioSeccionParametros({ seccion, valores }: Props) {
  const cerrar = useCerrarModal();
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(
    conAviso(guardarParametros, (r) => r.ok && cerrar()),
    {},
  );
  const v = estado.valores;
  const e = estado.errores ?? {};
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);
  const { boton, descripcion } = SECCIONES_PARAMETROS[seccion];

  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="seccion" value={seccion} />
      {/* Donde se cambia: el aviso que antes iba arriba de toda la pestaña */}
      <p className="text-sm text-tinta-suave">
        {descripcion && `${descripcion} `}Cambiar un valor no toca lo ya guardado: las cotizaciones y reservas hechas conservan el que tenían.
      </p>
      {clavesDeSeccion(seccion).map((c) => {
        const p = PARAMETROS[c];
        const valor = v?.[c] ?? valores[c];
        return (
          <Campo key={c} id={c} etiqueta={p.etiqueta} error={e[c]} ayuda={p.ayuda}>
            {p.unidad ? (
              // La unidad siempre después ("250 Bs", "15 días"): así los números quedan alineados (pulido 6.3)
              <div className="flex items-center gap-2">
                <Input id={c} name={c} inputMode="numeric" autoComplete="off" defaultValue={valor} aria-invalid={!!e[c]} className="max-w-32" />
                <span className="text-tinta-suave">{p.unidad}</span>
              </div>
            ) : (
              <Textarea id={c} name={c} rows={5} defaultValue={valor} aria-invalid={!!e[c]} />
            )}
          </Campo>
        );
      })}
      <PieModal>
        <Button type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : boton}
        </Button>
        <CancelarModal />
      </PieModal>
    </form>
  );
}
