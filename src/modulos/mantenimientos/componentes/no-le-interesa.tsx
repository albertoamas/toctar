"use client";

import { useActionState, useRef, useState } from "react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { useHidratado } from "@/componentes/hidratado";
import { conAviso } from "@/componentes/panel/avisos";
import { Campo, MensajeError } from "@/componentes/panel/campo";
import { CancelarModal, ModalFormulario, PieModal, useCerrarModal } from "@/componentes/panel/modal-formulario";
import { Button } from "@/componentes/ui/button";
import { Textarea } from "@/componentes/ui/textarea";
import type { EstadoFormulario } from "@/lib/formularios";
import { cerrarMantenimiento } from "../acciones";

// HU-38: "No le interesa" cierra el recordatorio (no se le vuelve a avisar). Pulido 12.2: se usa poco, así que va sin
// fondo en la fila, y su confirmación en un modal (como "Cancelar reserva"), con el foco en "Volver" para no cerrarlo
// sin querer; la nota es opcional.

export function NoLeInteresa({ id }: { id: number }) {
  const [abierto, setAbierto] = useState(false);
  // Abre un modal (necesita JavaScript): se habilita al hidratar, así un toque temprano no se pierde
  const listo = useHidratado();
  return (
    <>
      <Button type="button" variant="ghost" disabled={!listo} onClick={() => setAbierto(true)} className="self-start lg:self-end">
        No le interesa
      </Button>
      <ModalFormulario titulo="No le interesa" abierto={abierto} alCambiar={setAbierto}>
        <Formulario id={id} />
      </ModalFormulario>
    </>
  );
}

function Formulario({ id }: { id: number }) {
  const cerrar = useCerrarModal();
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(
    conAviso(cerrarMantenimiento, (r) => r.ok && cerrar()),
    {},
  );
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);
  const e = estado.errores ?? {};
  // Controlada: React reinicia el formulario al terminar la acción y así nada se pierde tras un error
  const [nota, setNota] = useState("");
  const campo = `nota-${id}`;

  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-5" noValidate aria-label="No le interesa">
      <input type="hidden" name="id" value={id} />
      {estado.mensaje && !estado.ok && <MensajeError id={`${campo}-mensaje`}>{estado.mensaje}</MensajeError>}
      <p>No se le volverá a avisar de este mantenimiento.</p>
      <Campo id={campo} etiqueta="Nota (opcional)" error={e.nota} ayuda="Por qué: ya lo hace en otro lado, vendió el vehículo…">
        <Textarea id={campo} name="nota" rows={2} maxLength={300} value={nota} onChange={(ev) => setNota(ev.target.value)} aria-invalid={!!e.nota} aria-describedby={e.nota ? `${campo}-error` : `${campo}-ayuda`} />
      </Campo>
      <PieModal>
        <Button type="submit" variant="destructive" disabled={enviando}>
          {enviando ? "Cerrando…" : "Sí, no le interesa"}
        </Button>
        <CancelarModal texto="Volver" focoInicial />
      </PieModal>
    </form>
  );
}
