"use client";

import { useState } from "react";
import { Campo } from "@/componentes/panel/campo";
import { MenuMas } from "@/componentes/panel/menu-mas";
import { CancelarModal, ModalFormulario, PieModal, useFormularioEnModal } from "@/componentes/panel/modal-formulario";
import { Button } from "@/componentes/ui/button";
import { Textarea } from "@/componentes/ui/textarea";
import { anularPago } from "../acciones";

// HU-32: anular un pago (D-6). No se borra: queda tachado con su motivo y deja de contar para el saldo.
// Pulido 13.49: se usa poco y no se deshace, así que va en el "⋯" de cada pago (no como texto suelto debajo) y pide el
// motivo en un modal, como "Cancelar reserva".

type Props = { id: number; /** "Adelanto en efectivo de 150 Bs", para el lector de pantalla y el modal. */ descripcion: string };

export function AnularPago({ id, descripcion }: Props) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <MenuMas icono etiqueta={`Más: ${descripcion}`} acciones={[{ texto: "Anular pago", alElegir: () => setAbierto(true) }]} />
      <ModalFormulario titulo="Anular pago" abierto={abierto} alCambiar={setAbierto}>
        <Formulario id={id} descripcion={descripcion} />
      </ModalFormulario>
    </>
  );
}

function Formulario({ id, descripcion }: Props) {
  const { accion, enviando, formulario, e } = useFormularioEnModal(anularPago);
  // Controlado: React reinicia el formulario al terminar la acción y así el motivo no se pierde tras un error
  const [motivo, setMotivo] = useState("");
  const base = `anular-${id}`;
  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-5" noValidate aria-label={`Anular ${descripcion}`}>
      <input type="hidden" name="id" value={id} />
      <p className="font-semibold">{descripcion}</p>
      <Campo id={`${base}-motivo`} etiqueta="Motivo" error={e.motivo} ayuda="El pago queda tachado con este motivo y deja de contar para el saldo.">
        <Textarea
          id={`${base}-motivo`}
          name="motivo"
          rows={2}
          value={motivo}
          onChange={(ev) => setMotivo(ev.target.value)}
          aria-invalid={!!e.motivo}
          aria-describedby={e.motivo ? `${base}-motivo-error` : `${base}-motivo-ayuda`}
        />
      </Campo>
      <PieModal>
        <Button type="submit" variant="destructive" disabled={enviando}>
          {enviando ? "Anulando…" : "Anular pago"}
        </Button>
        <CancelarModal texto="Volver" />
      </PieModal>
    </form>
  );
}
