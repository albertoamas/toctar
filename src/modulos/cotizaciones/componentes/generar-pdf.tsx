"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { LoaderCircleIcon, RefreshCwIcon } from "lucide-react";
import { avisarResultado } from "@/componentes/panel/avisos";
import { Button } from "@/componentes/ui/button";
import { generarPdfPendiente } from "../acciones";

// HU-26: si el PDF no se pudo generar al guardar la cotización, se genera desde su ficha. Recorrido visual del 23/11: el
// de la versión que vale se genera solo al abrir la ficha («Preparando el PDF…»), sin tocar nada; al terminar, la ficha
// se actualiza con «Enviar por WhatsApp» y «Ver PDF». Si falla, recién ahí «Reintentar», con lo que pasó. Las versiones
// anteriores (ya no se envían) lo generan con el botón.

export function GenerarPdf({ cotizacionId, automatico = false }: { cotizacionId: number; /** Generarlo al abrir. */ automatico?: boolean }) {
  const [generando, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Una sola vez al abrir (en desarrollo React monta dos veces)
  const pedido = useRef(false);

  function generar(conAviso: boolean) {
    setError(null);
    iniciar(async () => {
      const r = await generarPdfPendiente({ cotizacionId });
      if (r.ok) {
        if (conAviso) avisarResultado(r);
      } else setError(r.mensaje ?? "No se pudo generar el PDF.");
    });
  }

  useEffect(() => {
    if (!automatico || pedido.current) return;
    pedido.current = true;
    generar(false);
    // Solo al abrir: `generar` cambia en cada dibujo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [automatico]);

  if (automatico && !error) {
    return (
      <span role="status" className="flex min-h-9 items-center gap-2 text-sm text-tinta-suave">
        <LoaderCircleIcon className="size-4 animate-spin" aria-hidden />
        Preparando el PDF…
      </span>
    );
  }
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <Button type="button" variant="outline" disabled={generando} onClick={() => generar(true)}>
        <RefreshCwIcon />
        {generando ? "Generando…" : error ? "Reintentar" : "Generar PDF"}
      </Button>
      {error && (
        <span role="alert" className="text-sm text-peligro">
          {error}
        </span>
      )}
    </span>
  );
}
