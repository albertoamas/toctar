"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useHidratado } from "@/componentes/hidratado";
import { Input } from "@/componentes/ui/input";
import { ANCHO_DATO } from "@/componentes/panel/anchos";
import { rangoValido } from "../reglas";

// Reportes, "Elegir fechas" (17/11): desde y hasta. Sin botón "Ver": al cambiar una fecha, si las dos sirven, el reporte
// se actualiza solo (la dirección lleva las fechas: se comparte y Atrás funciona). Si no sirven, un aviso corto bajo los
// campos y no se cambia nada. El servidor vuelve a revisar el rango (rangoValido). Los campos se habilitan al hidratar,
// así un cambio temprano no se pierde. Página que lo usa: le pasa una `key` con las fechas, así vuelve a empezar al
// cambiarlas.

/** Por qué un rango no sirve, en palabras. */
function porQueNo(desde: string, hasta: string, hoy: string): string {
  if (desde > hasta) return "«Desde» tiene que ser antes de «Hasta».";
  if (hasta > hoy) return "No se puede elegir un día que todavía no llegó.";
  return "Elige fechas de hasta un año.";
}

export function ElegirFechas({ vista, desde: desdeInicial, hasta: hastaInicial, hoy }: { vista: string | null; desde: string; hasta: string; hoy: string }) {
  const router = useRouter();
  const hidratado = useHidratado();
  const [actualizando, iniciar] = useTransition();
  const [desde, setDesde] = useState(desdeInicial);
  const [hasta, setHasta] = useState(hastaInicial);
  const [error, setError] = useState<string | null>(null);

  function cambiar(nuevoDesde: string, nuevoHasta: string) {
    setDesde(nuevoDesde);
    setHasta(nuevoHasta);
    // Una fecha a medio escribir (o borrada): se espera
    if (!nuevoDesde || !nuevoHasta) return;
    if (!rangoValido(nuevoDesde, nuevoHasta, hoy)) {
      setError(porQueNo(nuevoDesde, nuevoHasta, hoy));
      return;
    }
    setError(null);
    const p = new URLSearchParams([...(vista ? [["vista", vista] as [string, string]] : []), ["periodo", "rango"], ["desde", nuevoDesde], ["hasta", nuevoHasta]]);
    iniciar(() => router.push(`/panel/reportes?${p.toString()}`));
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-end gap-3" aria-busy={actualizando}>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Desde
          <Input type="date" value={desde} max={hoy} min="2000-01-01" disabled={!hidratado} onChange={(e) => cambiar(e.target.value, hasta)} aria-invalid={error ? true : undefined} aria-describedby="fechas-ayuda" className={`w-48 ${ANCHO_DATO.fecha}`} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Hasta
          <Input type="date" value={hasta} max={hoy} min="2000-01-01" disabled={!hidratado} onChange={(e) => cambiar(desde, e.target.value)} aria-invalid={error ? true : undefined} aria-describedby="fechas-ayuda" className={`w-48 ${ANCHO_DATO.fecha}`} />
        </label>
      </div>
      <p id="fechas-ayuda" role={error ? "alert" : undefined} className={error ? "text-xs font-semibold text-peligro" : "text-xs text-tinta-suave"}>
        {error ?? "Hasta un año. Se compara con los mismos días justo antes."}
      </p>
    </div>
  );
}
