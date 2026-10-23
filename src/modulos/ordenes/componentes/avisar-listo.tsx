"use client";

import { useState, useTransition } from "react";
import { useHidratado } from "@/componentes/hidratado";
import { avisarResultado } from "@/componentes/panel/avisos";
import { IconoWhatsApp } from "@/componentes/sitio/iconos-marca";
import { Button } from "@/componentes/ui/button";
import { registrarAvisoListo } from "../acciones";

// HU-35: avisar al cliente que su vehículo está listo (RF-48, CU-18). Un solo toque abre WhatsApp con el mensaje ya
// escrito (lo armó el servidor) y registra quién avisó y cuándo. Es un botón y no un enlace: así no hay forma de abrir
// el chat sin que quede registrado (otra pestaña, antes de hidratar), y no se dispara dos veces.

type Props = {
  id: number;
  /** El enlace a wa.me con el mensaje. */
  enlace: string;
  /** "Avisado el 30/10 a las 15:40 por Ana", si ya se avisó. */
  avisado: string | null;
};

const NO_SE_REGISTRO = "WhatsApp se abrió, pero el aviso no quedó registrado. Revisa tu conexión y vuelve a avisar.";

export function AvisarListo({ id, enlace, avisado }: Props) {
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
        avisarResultado(await registrarAvisoListo({ id }));
      } catch {
        avisarResultado({ mensaje: NO_SE_REGISTRO });
      } finally {
        setEnCurso(false);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant={avisado ? "outline" : "default"} className="self-start" disabled={!listo || enCurso || registrando} onClick={avisar}>
        <IconoWhatsApp />
        {avisado ? "Volver a avisar" : "Avisar por WhatsApp"}
      </Button>
      {avisado && <p className="text-sm text-tinta-suave">{avisado}</p>}
    </div>
  );
}
