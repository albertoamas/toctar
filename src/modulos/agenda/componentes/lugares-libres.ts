"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { consultarLugares } from "../acciones";
import type { Disponibilidad } from "../consultas/lugares";
import { textoDiasLlenos } from "../reglas";

/**
 * Si hay lugar en unas fechas (pedido 55), para agendar (HU-30) o reprogramar (HU-31, sin contar la propia reserva). Se
 * vuelve a preguntar al cambiar las fechas y solo vale la última respuesta: una vieja que llega tarde no pisa a la nueva.
 * Con `inicial` (lo que ya trajo la página para esas fechas) no se pregunta de nuevo al abrir. Mientras la respuesta que
 * hay es de otras fechas, cuenta como "buscando": así no se reserva un día que en las fechas nuevas está lleno.
 */
export function useLugaresLibres(fechaInicio: string, fechaFin: string, { excepto, inicial }: { excepto?: number; inicial?: Disponibilidad | null } = {}) {
  const [respuesta, setRespuesta] = useState<{ clave: string; disponibilidad: Disponibilidad | null } | null>(
    inicial ? { clave: `${fechaInicio}|${fechaFin}`, disponibilidad: inicial } : null,
  );
  const [pendiente, iniciar] = useTransition();
  const pedido = useRef(0);
  const yaPedido = useRef(inicial ? `${fechaInicio}|${fechaFin}` : null);
  // Una fecha borrada (el campo queda vacío mientras se escribe): no hay nada que preguntar
  const completas = !!fechaInicio && !!fechaFin;
  const clave = `${fechaInicio}|${fechaFin}`;

  useEffect(() => {
    if (clave === yaPedido.current) return;
    yaPedido.current = clave;
    // También con una fecha borrada: así una respuesta anterior que llegue tarde ya no vale
    const este = ++pedido.current;
    if (!fechaInicio || !fechaFin) return;
    iniciar(async () => {
      const disponibilidad = await consultarLugares({ fechaInicio, fechaFin, excepto });
      if (este !== pedido.current) return;
      setRespuesta({ clave, disponibilidad });
    });
  }, [clave, fechaInicio, fechaFin, excepto]);

  const vigente = completas && respuesta?.clave === clave ? respuesta.disponibilidad : null;
  const buscando = completas && (pendiente || respuesta?.clave !== clave);
  // El error de los días llenos, junto a las fechas; las fechas que no valen las dice el formulario al seguir
  const lleno = vigente && vigente.llenos.length > 0 ? textoDiasLlenos(vigente.llenos, vigente.lugares) : null;
  return { buscando, lleno };
}
