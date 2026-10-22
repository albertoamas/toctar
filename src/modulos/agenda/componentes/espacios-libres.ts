"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { consultarEspacios } from "../acciones";
import type { EspacioDisponible } from "../consultas";

/**
 * Los espacios libres en unas fechas, para agendar (HU-30) o reprogramar (HU-31, sin contar la propia reserva).
 * Se vuelven a pedir al cambiar las fechas y solo vale la última respuesta: una vieja que llega tarde no pisa a la
 * nueva. Con `iniciales` (los que ya trajo la página para esas fechas) no se piden de nuevo al abrir.
 */
export function useEspaciosLibres(fechaInicio: string, fechaFin: string, { excepto, iniciales }: { excepto?: number; iniciales?: EspacioDisponible[] } = {}) {
  const [espacios, setEspacios] = useState<EspacioDisponible[] | null>(iniciales ?? null);
  const [fechasValidas, setFechasValidas] = useState(true);
  const [buscando, iniciar] = useTransition();
  const pedido = useRef(0);
  const yaPedido = useRef(iniciales ? `${fechaInicio}|${fechaFin}` : null);
  // Una fecha borrada (el campo queda vacío mientras se escribe): no hay nada que pedir
  const completas = !!fechaInicio && !!fechaFin;

  useEffect(() => {
    const clave = `${fechaInicio}|${fechaFin}`;
    if (clave === yaPedido.current) return;
    yaPedido.current = clave;
    // También con una fecha borrada: así una respuesta anterior que llegue tarde ya no vale
    const este = ++pedido.current;
    if (!fechaInicio || !fechaFin) return;
    iniciar(async () => {
      const nuevos = await consultarEspacios({ fechaInicio, fechaFin, excepto });
      if (este !== pedido.current) return;
      // Sin lista: las fechas no valen (el servidor no busca con ellas)
      setFechasValidas(nuevos !== null);
      setEspacios(nuevos ?? []);
    });
  }, [fechaInicio, fechaFin, excepto]);

  const libres = completas ? (espacios ?? []).filter((x) => x.libre) : [];
  const ayuda =
    completas && (buscando || espacios === null)
      ? "Buscando espacios libres…"
      : !completas || !fechasValidas
        ? "Revisa las fechas: el ingreso desde hoy y hasta un año adelante; la entrega no antes del ingreso ni más de 60 días después."
        : libres.length === 0
          ? "No hay espacio libre en esas fechas: elige otras."
          : "Solo los libres en esas fechas.";
  return { libres, buscando, ayuda };
}
