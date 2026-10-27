"use client";

import { useTransition } from "react";
import { RefreshCwIcon } from "lucide-react";
import { avisarResultado } from "@/componentes/panel/avisos";
import { Button } from "@/componentes/ui/button";
import { generarPdfPendiente } from "../acciones";

// HU-26: si el PDF no se pudo generar al guardar la cotización, se genera desde la consulta.
export function GenerarPdf({ cotizacionId }: { cotizacionId: number }) {
  const [generando, iniciar] = useTransition();
  return (
    <Button type="button" variant="outline" disabled={generando} onClick={() => iniciar(async () => avisarResultado(await generarPdfPendiente({ cotizacionId })))}>
      <RefreshCwIcon />
      {generando ? "Generando…" : "Generar PDF"}
    </Button>
  );
}
