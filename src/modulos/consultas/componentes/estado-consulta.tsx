"use client";

import { useActionState, useRef, useState } from "react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { conAviso } from "@/componentes/panel/avisos";
import { Campo, MensajeError } from "@/componentes/panel/campo";
import { MenuMas } from "@/componentes/panel/menu-mas";
import { CancelarModal, ModalFormulario, PieModal, useCerrarModal } from "@/componentes/panel/modal-formulario";
import { Button } from "@/componentes/ui/button";
import { RadioGroup, RadioGroupItem } from "@/componentes/ui/radio-group";
import { Textarea } from "@/componentes/ui/textarea";
import type { MotivoPerdida } from "@/db/esquema/consultas";
import type { EstadoFormulario } from "@/lib/formularios";
import { cambiarEstadoConsulta } from "../acciones";
import { NOMBRE_MOTIVO } from "../reglas";

// HU-28: marcar la consulta como perdida (con motivo) o reabrirla (RF-30). Pulido 9.3: perderla se hace pocas veces y
// va en el menú "Más" del encabezado, con su formulario en un modal (como "Desactivar cliente"); reabrir no pierde nada
// y es la acción principal del encabezado de una perdida.

// Del texto de cada motivo, no del esquema de la base: así este componente no arrastra Drizzle al navegador
const MOTIVOS = Object.keys(NOMBRE_MOTIVO) as MotivoPerdida[];

export function MasConsulta({ id }: { id: number }) {
  const [perdiendo, setPerdiendo] = useState(false);
  return (
    <>
      <MenuMas acciones={[{ texto: "Marcar como perdida", alElegir: () => setPerdiendo(true) }]} />
      <ModalFormulario titulo="Marcar como perdida" abierto={perdiendo} alCambiar={setPerdiendo}>
        <FormularioPerder id={id} />
      </ModalFormulario>
    </>
  );
}

function FormularioPerder({ id }: { id: number }) {
  const cerrar = useCerrarModal();
  const [resultado, accion, enviando] = useActionState<EstadoFormulario, FormData>(
    conAviso(cambiarEstadoConsulta, (r) => r.ok && cerrar()),
    {},
  );
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, resultado);
  const v = resultado.valores ?? {};
  const e = resultado.errores ?? {};
  // Controlado, con su campo oculto: React reinicia el formulario tras un error y los radios de base-ui se vaciaban
  const [elegido, setElegido] = useState(v.motivo ?? "");

  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-6" noValidate aria-label="Marcar como perdida">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="accion" value="perder" />
      <div className="flex flex-col gap-3">
        <p id="motivo-titulo" className="text-sm font-medium">Motivo</p>
        <input type="hidden" name="motivo" value={elegido} />
        <RadioGroup
          value={elegido}
          onValueChange={(valor) => setElegido(String(valor))}
          aria-labelledby="motivo-titulo"
          aria-describedby={e.motivo ? "motivo-error" : undefined}
          className="flex flex-wrap gap-2"
        >
          {MOTIVOS.map((m, i) => (
            <label key={m} htmlFor={`motivo-${m}`} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-sm border border-border px-3 py-2 has-data-checked:border-tinta">
              <RadioGroupItem id={`motivo-${m}`} value={m} data-invalido={(!!e.motivo && i === 0) || undefined} />
              <span className="font-semibold">{NOMBRE_MOTIVO[m]}</span>
            </label>
          ))}
        </RadioGroup>
        {e.motivo && <MensajeError id="motivo-error">{e.motivo}</MensajeError>}
      </div>
      <Campo id="detalle" etiqueta="Detalle" error={e.detalle} ayuda={elegido === "otro" ? "Con «Otro», escribe qué pasó." : "Opcional."}>
        <Textarea id="detalle" name="detalle" rows={2} defaultValue={v.detalle} aria-invalid={!!e.detalle} aria-describedby={e.detalle ? "detalle-error" : "detalle-ayuda"} />
      </Campo>
      <PieModal>
        <Button type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : "Marcar como perdida"}
        </Button>
        <CancelarModal />
      </PieModal>
    </form>
  );
}

const reabrirConAviso = conAviso(cambiarEstadoConsulta);

export function ReabrirConsulta({ id }: { id: number }) {
  const [, accion, enviando] = useActionState<EstadoFormulario, FormData>(reabrirConAviso, {});
  return (
    <form action={accion}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="accion" value="reabrir" />
      <Button type="submit" disabled={enviando}>
        {enviando ? "Reabriendo…" : "Reabrir"}
      </Button>
    </form>
  );
}
