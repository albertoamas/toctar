"use client";

import { useState, useTransition } from "react";
import { ArrowUpDownIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { useHidratado } from "@/componentes/hidratado";
import { avisarResultado } from "@/componentes/panel/avisos";
import { CancelarModal, ModalFormulario, PieModal } from "@/componentes/panel/modal-formulario";
import { Button } from "@/componentes/ui/button";
import type { Direccion } from "@/lib/orden";
import { moverServicio } from "../acciones";

// HU-07: el orden en que salen los servicios en el sitio. Pulido 13.21: ordenar es poco frecuente, así que las flechas
// dejaron las filas de la lista (16 botones a la vista) y van en este modal, como en el editor de listas: apiladas y en
// gris. Cada movimiento se guarda al momento ("Listo" cierra).

export function OrdenarServicios({ servicios }: { servicios: { id: number; nombre: string }[] }) {
  const hidratado = useHidratado();
  const [abierto, setAbierto] = useState(false);
  const [pendiente, iniciar] = useTransition();
  const mover = (id: number, direccion: Direccion) => {
    if (pendiente) return;
    iniciar(async () => {
      const r = await moverServicio({ id, direccion });
      // Si sale bien no hace falta aviso: la lista se reordena a la vista
      if (!r.ok) avisarResultado(r);
    });
  };

  return (
    <>
      <Button type="button" variant="outline" disabled={!hidratado} onClick={() => setAbierto(true)}>
        <ArrowUpDownIcon />
        Cambiar orden
      </Button>
      <ModalFormulario titulo="Orden en el sitio" abierto={abierto} alCambiar={setAbierto}>
        <p className="text-sm text-tinta-suave">En este orden salen en el sitio.</p>
        <ol aria-label="Orden de los servicios" className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {servicios.map((s, i) => (
            <li key={s.id} className="flex items-center gap-2 py-1 pr-1 pl-3">
              <span aria-hidden className="w-5 shrink-0 text-right text-sm text-tinta-suave tabular-nums">
                {i + 1}.
              </span>
              <span className="min-w-0 flex-1">{s.nombre}</span>
              <span className="flex shrink-0 text-tinta-suave">
                <Flecha nombre={s.nombre} direccion="subir" tope={i === 0} alTocar={() => mover(s.id, "subir")} />
                <Flecha nombre={s.nombre} direccion="bajar" tope={i === servicios.length - 1} alTocar={() => mover(s.id, "bajar")} />
              </span>
            </li>
          ))}
        </ol>
        <PieModal>
          <CancelarModal texto="Listo" />
        </PieModal>
      </ModalFormulario>
    </>
  );
}

/**
 * aria-disabled y no disabled: un botón deshabilitado pierde el foco, y con el teclado habría que volver a buscar la
 * fila después de cada movimiento (como en el visor de fotos). En el tope, se atenúa y no hace nada.
 */
function Flecha({ nombre, direccion, tope, alTocar }: { nombre: string; direccion: Direccion; tope: boolean; alTocar: () => void }) {
  const Icono = direccion === "subir" ? ChevronUpIcon : ChevronDownIcon;
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-disabled={tope || undefined}
      aria-label={`${direccion === "subir" ? "Subir" : "Bajar"} ${nombre}`}
      onClick={() => !tope && alTocar()}
      className="aria-disabled:cursor-default aria-disabled:opacity-40"
    >
      <Icono />
    </Button>
  );
}
