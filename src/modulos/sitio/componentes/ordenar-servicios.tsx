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
  const mover = (id: number, direccion: Direccion) =>
    iniciar(async () => {
      const r = await moverServicio({ id, direccion });
      // Si sale bien no hace falta aviso: la lista se reordena a la vista
      if (!r.ok) avisarResultado(r);
    });

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
                <Button type="button" variant="ghost" size="icon" disabled={pendiente || i === 0} aria-label={`Subir ${s.nombre}`} onClick={() => mover(s.id, "subir")}>
                  <ChevronUpIcon />
                </Button>
                <Button type="button" variant="ghost" size="icon" disabled={pendiente || i === servicios.length - 1} aria-label={`Bajar ${s.nombre}`} onClick={() => mover(s.id, "bajar")}>
                  <ChevronDownIcon />
                </Button>
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
