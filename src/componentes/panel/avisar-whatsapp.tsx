"use client";

import { useState, useTransition } from "react";
import { useHidratado } from "@/componentes/hidratado";
import { avisarResultado } from "@/componentes/panel/avisos";
import { BOTON_PASO } from "@/componentes/panel/paso-siguiente";
import { IconoWhatsApp } from "@/componentes/sitio/iconos-marca";
import { Button } from "@/componentes/ui/button";
import type { EstadoFormulario } from "@/lib/formularios";

// Avisar al cliente por WhatsApp y dejarlo registrado: vehículo listo (HU-35, RF-48) o mantenimiento (HU-38, RF-50).
// Un solo toque abre WhatsApp con el mensaje ya escrito (lo armó el servidor) y registra quién avisó y cuándo. Es un
// botón y no un enlace: así no hay forma de abrir el chat sin que quede registrado (otra pestaña, antes de hidratar),
// y no se dispara dos veces.

type Props = {
  /** El enlace a wa.me con el mensaje. */
  enlace: string;
  /** "Avisado el 30/10 a las 15:40 por Ana", si ya se avisó. */
  avisado: string | null;
  /** false: el "Avisado el…" ya se muestra en otro lado de la fila (la lista de mantenimientos). */
  conDetalle?: boolean;
  /** En una lista, siempre con borde: un rojo por fila competiría con los demás (pulido 12.2). */
  enLista?: boolean;
  /** Es el paso siguiente de la orden: grande mientras falte avisar (PasoSiguiente). */
  grande?: boolean;
  /**
   * La acción del servidor que registra el aviso, ya atada a lo que se avisa (`accion.bind(null, { id })`). Termina en
   * "Action" por la convención de Next para las acciones que se pasan a un componente de cliente.
   */
  registrarAction: () => Promise<EstadoFormulario>;
};

const NO_SE_REGISTRO = "WhatsApp se abrió, pero el aviso no quedó registrado. Revisa tu conexión y vuelve a avisar.";

export function AvisarPorWhatsApp({ enlace, avisado, conDetalle = true, enLista, grande, registrarAction }: Props) {
  const listo = useHidratado();
  const [registrando, iniciar] = useTransition();
  // Desde el toque hasta la respuesta: un segundo toque no abre otro chat ni registra otro aviso
  const [enCurso, setEnCurso] = useState(false);

  function avisar() {
    setEnCurso(true);
    // Abrir en el mismo toque: si esperara a la acción, el navegador lo bloquearía como ventana emergente
    window.open(enlace, "_blank", "noopener,noreferrer");
    iniciar(async () => {
      try {
        avisarResultado(await registrarAction());
      } catch {
        avisarResultado({ mensaje: NO_SE_REGISTRO });
      } finally {
        setEnCurso(false);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant={avisado || enLista ? "outline" : "default"}
        size={grande && !avisado ? "paso" : "default"}
        className={grande && !avisado ? BOTON_PASO : "self-start"}
        disabled={!listo || enCurso || registrando} onClick={avisar}>
        <IconoWhatsApp />
        {avisado ? "Volver a avisar" : "Avisar por WhatsApp"}
      </Button>
      {avisado && conDetalle && <p className="text-sm text-tinta-suave">{avisado}</p>}
    </div>
  );
}
