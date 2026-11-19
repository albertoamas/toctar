"use client";

import { useState } from "react";
import { Campo } from "@/componentes/panel/campo";
import { MenuMas } from "@/componentes/panel/menu-mas";
import { useFormularioEnModal } from "@/componentes/panel/modal-contexto";
import { ModalFormulario } from "@/componentes/panel/modal-formulario";
import { CancelarModal, PieModal } from "@/componentes/panel/modal-pie";
import { Button } from "@/componentes/ui/button";
import { Textarea } from "@/componentes/ui/textarea";
import { anularGasto } from "../acciones";

// Pedido 16: anular un gasto (RN-14), como un pago (pulido 13.49): en el "⋯" de su fila y con el motivo en un modal. No
// se borra: queda tachado con su motivo y deja de contar en el total y en los reportes.

type Props = { id: number; /** "Insumos y productos, 1180 Bs, del 12/11/2026", para el lector de pantalla y el modal. */ descripcion: string };

export function AnularGasto({ id, descripcion }: Props) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <MenuMas icono etiqueta={`Opciones del gasto: ${descripcion}`} acciones={[{ texto: "Anular gasto", alElegir: () => setAbierto(true) }]} />
      <ModalFormulario titulo="Anular gasto" abierto={abierto} alCambiar={setAbierto}>
        <Formulario id={id} descripcion={descripcion} />
      </ModalFormulario>
    </>
  );
}

function Formulario({ id, descripcion }: Props) {
  const { accion, enviando, formulario, e } = useFormularioEnModal(anularGasto);
  // Controlado: React reinicia el formulario al terminar la acción y así el motivo no se pierde tras un error
  const [motivo, setMotivo] = useState("");
  const base = `anular-gasto-${id}`;
  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-5" noValidate aria-label={`Anular ${descripcion}`}>
      <input type="hidden" name="id" value={id} />
      <p className="font-semibold">{descripcion}</p>
      <Campo id={`${base}-motivo`} etiqueta="Motivo" error={e.motivo} ayuda="El gasto queda tachado con este motivo y deja de contar.">
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
          {enviando ? "Anulando…" : "Anular gasto"}
        </Button>
        <CancelarModal texto="Volver" />
      </PieModal>
    </form>
  );
}
