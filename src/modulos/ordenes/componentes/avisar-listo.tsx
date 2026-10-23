"use client";

import { useTransition } from "react";
import { cn } from "cn";
import { avisarResultado } from "@/componentes/panel/avisos";
import { IconoWhatsApp } from "@/componentes/sitio/iconos-marca";
import { buttonVariants } from "@/componentes/ui/button";
import { registrarAvisoListo } from "../acciones";

// HU-35: avisar al cliente que su vehículo está listo (RF-48, CU-18). Es un enlace: abre WhatsApp con el mensaje ya
// escrito (lo armó el servidor) y, a la vez, registra quién avisó y cuándo. Si el enlace esperara a la acción, el
// navegador lo trataría como una ventana emergente y la bloquearía.

type Props = {
  id: number;
  /** El enlace a wa.me con el mensaje. */
  enlace: string;
  /** "Avisado el 23 oct de 2026, 3:40 p. m. por Ana", si ya se avisó. */
  avisado: string | null;
};

export function AvisarListo({ id, enlace, avisado }: Props) {
  const [registrando, iniciar] = useTransition();

  return (
    <div className="flex flex-col gap-2">
      <a
        href={enlace}
        target="_blank"
        rel="noreferrer"
        aria-disabled={registrando || undefined}
        onClick={() =>
          iniciar(async () => {
            const r = await registrarAvisoListo({ id });
            if (!r.ok) avisarResultado(r);
          })
        }
        className={cn(buttonVariants({ variant: avisado ? "outline" : "default" }), "self-start")}
      >
        <IconoWhatsApp />
        {avisado ? "Volver a avisar" : "Avisar por WhatsApp"}
      </a>
      {avisado && <p className="text-sm text-tinta-suave">{avisado}</p>}
    </div>
  );
}
