"use client";

import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";

// Reportes, "Elegir fechas" (17/11): desde y hasta, con "Ver". Un formulario GET: la dirección lleva las fechas, así se
// comparte y Atrás funciona. El servidor revisa el rango (rangoValido) y, si no sirve, muestra los últimos 30 días.

export function ElegirFechas({ vista, desde, hasta, hoy }: { vista: string | null; desde: string; hasta: string; hoy: string }) {
  return (
    <form action="/panel/reportes" className="flex flex-wrap items-end gap-3">
      {vista && <input type="hidden" name="vista" value={vista} />}
      <input type="hidden" name="periodo" value="rango" />
      <label className="flex flex-col gap-1 text-sm font-medium">
        Desde
        <Input type="date" name="desde" defaultValue={desde} max={hoy} min="2000-01-01" className="w-44" />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Hasta
        <Input type="date" name="hasta" defaultValue={hasta} max={hoy} min="2000-01-01" className="w-44" />
      </label>
      <Button type="submit" variant="outline">
        Ver
      </Button>
      <p className="w-full text-xs text-tinta-suave">Hasta un año. Se compara con los mismos días justo antes.</p>
    </form>
  );
}
