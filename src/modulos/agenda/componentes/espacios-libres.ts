"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRenovarBaseModal } from "@/componentes/panel/modal-formulario";
import { consultarEspacios } from "../acciones";
import type { EspacioDisponible } from "../consultas";
import { DIAS_MAXIMOS_TRABAJO } from "../reglas";

type Consulta = (datos: { fechaInicio: string; fechaFin: string; excepto?: number }) => Promise<EspacioDisponible[] | null>;

/**
 * Los espacios libres en unas fechas, para agendar (HU-30), reprogramar (HU-31, sin contar la propia reserva) o
 * extender una orden (HU-34, con `consultar` y `ayudaFechas` propios). Se vuelven a pedir al cambiar las fechas y solo
 * vale la última respuesta: una vieja que llega tarde no pisa a la nueva. Con `iniciales` (los que ya trajo la página
 * para esas fechas) no se piden de nuevo al abrir. `consultar` tiene que ser estable (una acción del servidor).
 * Mientras la lista que hay es de otras fechas, cuenta como "buscando": al cambiar la fecha, React dibuja una vez con la
 * lista anterior antes de empezar a pedir la nueva, y en ese instante se podía elegir un espacio que en las fechas
 * nuevas está ocupado (la prueba flujo-taller-completo fallaba a veces por eso).
 */
export function useEspaciosLibres(
  fechaInicio: string,
  fechaFin: string,
  { excepto, iniciales, consultar = consultarEspacios, ayudaFechas }: { excepto?: number; iniciales?: EspacioDisponible[]; consultar?: Consulta; ayudaFechas?: string } = {},
) {
  const [espacios, setEspacios] = useState<EspacioDisponible[] | null>(iniciales ?? null);
  // Para qué fechas es la lista que hay
  const [claveLista, setClaveLista] = useState<string | null>(iniciales ? `${fechaInicio}|${fechaFin}` : null);
  const [fechasValidas, setFechasValidas] = useState(true);
  const [pendiente, iniciar] = useTransition();
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
      const nuevos = await consultar({ fechaInicio, fechaFin, excepto });
      if (este !== pedido.current) return;
      // Sin lista: las fechas no valen (el servidor no busca con ellas)
      setFechasValidas(nuevos !== null);
      setEspacios(nuevos ?? []);
      setClaveLista(clave);
    });
  }, [fechaInicio, fechaFin, excepto, consultar]);

  const desactualizada = completas && claveLista !== `${fechaInicio}|${fechaFin}`;
  const buscando = pendiente || desactualizada;

  // En un modal, la primera lista llega con el modal ya abierto y le da su valor al espacio: eso no lo cambió la persona.
  // Solo si es para las fechas con que se abrió: si ya las movió, sí hay un cambio
  const renovarBase = useRenovarBaseModal();
  const fechasAlAbrir = useRef<string | null>(`${fechaInicio}|${fechaFin}`);
  useEffect(() => {
    if (fechasAlAbrir.current === null || buscando || claveLista !== fechasAlAbrir.current) return;
    fechasAlAbrir.current = null;
    renovarBase();
  }, [buscando, claveLista, renovarBase]);

  const libres = completas ? (espacios ?? []).filter((x) => x.libre) : [];
  const ayuda =
    completas && (buscando || espacios === null)
      ? "Buscando espacios libres…"
      : !completas || !fechasValidas
        ? (ayudaFechas ?? `Revisa las fechas: el ingreso desde hoy y hasta un año adelante; la entrega no antes del ingreso ni más de ${DIAS_MAXIMOS_TRABAJO} días después.`)
        : libres.length === 0
          ? "No hay espacio libre en esas fechas: elige otras."
          : "Solo los libres en esas fechas.";
  /** Los activos, libres u ocupados: uno que no está aquí se desactivó. */
  const activos = completas ? (espacios ?? []) : [];
  return { libres, activos, buscando, ayuda };
}
