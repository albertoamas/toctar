"use client";

import { useActionState, useState } from "react";
import { conAviso } from "@/componentes/panel/avisos";
import { MensajeError } from "@/componentes/panel/campo";
import { MenuMas, type AccionMas } from "@/componentes/panel/menu-mas";
import { CancelarModal, ModalFormulario, PieModal, useCerrarModal } from "@/componentes/panel/modal-formulario";
import { Button } from "@/componentes/ui/button";
import type { EstadoTrabajo } from "@/db/esquema/trabajos";
import type { EstadoFormulario } from "@/lib/formularios";
import { cambiarEstadoOrden } from "../acciones";
import { ExtenderEntrega } from "./extender-entrega";

// Pulido 11.2: lo que se usa poco en una orden va en el menú "Más" del encabezado, cada cosa con su modal (como
// MasReserva). Volver un paso atrás es para un toque sin querer; extender la entrega, de quien puede tocar la agenda.

type Props = {
  id: number;
  /** El paso de vuelta ("Volver a en proceso"), si quien mira trabaja la orden. */
  anterior?: { estado: EstadoTrabajo; texto: string };
  /** Los datos para extender la entrega, si se puede y quien mira puede hacerlo. */
  extender?: Omit<React.ComponentProps<typeof ExtenderEntrega>, "id">;
  /** Ya se avisó al cliente que estaba lista: al volver, el aviso se borra. */
  avisada: boolean;
};

export function MasOrden({ id, anterior, extender, avisada }: Props) {
  const [abierta, setAbierta] = useState<"extender" | "volver" | null>(null);
  const cambiar = (abierto: boolean) => !abierto && setAbierta(null);
  const acciones: AccionMas[] = [];
  if (extender) acciones.push({ texto: "Extender entrega", alElegir: () => setAbierta("extender") });
  if (anterior) acciones.push({ texto: anterior.texto, alElegir: () => setAbierta("volver") });
  if (acciones.length === 0) return null;
  return (
    <>
      <MenuMas acciones={acciones} />
      {extender && (
        <ModalFormulario titulo="Extender entrega" abierto={abierta === "extender"} alCambiar={cambiar}>
          <ExtenderEntrega id={id} {...extender} />
        </ModalFormulario>
      )}
      {anterior && (
        <ModalFormulario titulo={anterior.texto} abierto={abierta === "volver"} alCambiar={cambiar}>
          <Volver id={id} anterior={anterior} avisada={avisada} />
        </ModalFormulario>
      )}
    </>
  );
}

function Volver({ id, anterior, avisada }: { id: number; anterior: NonNullable<Props["anterior"]>; avisada: boolean }) {
  const cerrar = useCerrarModal();
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(
    conAviso(cambiarEstadoOrden, (r) => r.ok && cerrar()),
    {},
  );
  return (
    <form action={accion} className="flex flex-col gap-5" aria-label={anterior.texto}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="estado" value={anterior.estado} />
      {estado.mensaje && !estado.ok && <MensajeError id="volver-error">{estado.mensaje}</MensajeError>}
      <p>
        La orden vuelve un paso atrás y queda anotado en la historia.
        {avisada && " El aviso al cliente se borra: cuando esté lista, hay que volver a avisarle."}
      </p>
      <PieModal>
        <Button type="submit" disabled={enviando} aria-describedby={estado.mensaje && !estado.ok ? "volver-error" : undefined}>
          {enviando ? "Guardando…" : `Sí, ${anterior.texto.toLowerCase()}`}
        </Button>
        <CancelarModal focoInicial />
      </PieModal>
    </form>
  );
}
