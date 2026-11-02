"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useActionState, useRef, useState } from "react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { conAviso } from "@/componentes/panel/avisos";
import { Campo, MensajeError } from "@/componentes/panel/campo";
import { MenuMas, type AccionMas } from "@/componentes/panel/menu-mas";
import { CancelarModal, ModalFormulario, PieModal, useCerrarModal } from "@/componentes/panel/modal-formulario";
import { Button } from "@/componentes/ui/button";
import { RadioGroup, RadioGroupItem } from "@/componentes/ui/radio-group";
import { Textarea } from "@/componentes/ui/textarea";
import type { EstadoFormulario } from "@/lib/formularios";
import { cambiarEstadoCotizacion } from "../acciones";
import { MOTIVOS, NOMBRE_MOTIVO } from "../reglas";

// El menú "Más" de una cotización (pedido 23, como en las demás fichas): "Nueva versión" y "Rechazar" en una pendiente
// (rechazar pide el motivo en un modal); "Volver a pendiente" en una rechazada. Se usan poco: el paso siguiente
// ("Agendar") va solo en el encabezado.

type Props = {
  id: number;
  /** A dónde lleva "Nueva versión" (pendiente y quien mira puede cotizar). */
  nuevaVersion: Route | null;
  /** "rechazar": una pendiente; "reabrir": una rechazada. */
  cambio: "rechazar" | "reabrir" | null;
};

export function MasCotizacion({ id, nuevaVersion, cambio }: Props) {
  const router = useRouter();
  const [abierta, setAbierta] = useState<"rechazar" | "reabrir" | null>(null);
  const cerrar = (abierto: boolean) => !abierto && setAbierta(null);
  const acciones: AccionMas[] = [];
  if (nuevaVersion) acciones.push({ texto: "Nueva versión", alElegir: () => router.push(nuevaVersion) });
  if (cambio === "rechazar") acciones.push({ texto: "Rechazar", alElegir: () => setAbierta("rechazar") });
  if (cambio === "reabrir") acciones.push({ texto: "Volver a pendiente", alElegir: () => setAbierta("reabrir") });
  if (acciones.length === 0) return null;
  return (
    <>
      <MenuMas acciones={acciones} />
      <ModalFormulario titulo="Rechazar la cotización" abierto={abierta === "rechazar"} alCambiar={cerrar}>
        <FormularioRechazar id={id} />
      </ModalFormulario>
      <ModalFormulario titulo="Volver a pendiente" abierto={abierta === "reabrir"} alCambiar={cerrar}>
        <FormularioReabrir id={id} />
      </ModalFormulario>
    </>
  );
}

function FormularioRechazar({ id }: { id: number }) {
  const cerrar = useCerrarModal();
  const [resultado, accion, enviando] = useActionState<EstadoFormulario, FormData>(
    conAviso(cambiarEstadoCotizacion, (r) => r.ok && cerrar()),
    {},
  );
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, resultado);
  const v = resultado.valores ?? {};
  const e = resultado.errores ?? {};
  // Controlado, con su campo oculto: React reinicia el formulario tras un error y los radios de base-ui se vaciaban
  const [elegido, setElegido] = useState(v.motivo ?? "");

  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-6" noValidate aria-label="Rechazar la cotización">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="accion" value="rechazar" />
      {resultado.mensaje && !resultado.ok && <MensajeError id="rechazar-error">{resultado.mensaje}</MensajeError>}
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
            <label key={m} htmlFor={`motivo-${m}`} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border bg-fondo px-3 py-2 has-data-checked:border-tinta">
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
          {enviando ? "Guardando…" : "Sí, rechazar"}
        </Button>
        <CancelarModal />
      </PieModal>
    </form>
  );
}

function FormularioReabrir({ id }: { id: number }) {
  const cerrar = useCerrarModal();
  const [resultado, accion, enviando] = useActionState<EstadoFormulario, FormData>(
    conAviso(cambiarEstadoCotizacion, (r) => r.ok && cerrar()),
    {},
  );
  return (
    <form action={accion} className="flex flex-col gap-5" aria-label="Volver a pendiente">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="accion" value="reabrir" />
      {resultado.mensaje && !resultado.ok && <MensajeError id="reabrir-error">{resultado.mensaje}</MensajeError>}
      <p>La cotización vuelve a pendiente con su versión vigente, y se puede agendar o hacer una nueva versión.</p>
      <PieModal>
        <Button type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : "Sí, volver a pendiente"}
        </Button>
        <CancelarModal focoInicial />
      </PieModal>
    </form>
  );
}
