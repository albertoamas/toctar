import { useState, useTransition } from "react";
import { ArrowUpDownIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { useHidratado } from "@/componentes/hidratado";
import { avisarResultado } from "@/componentes/panel/avisos";
import { CancelarModal, ModalFormulario, PieModal } from "@/componentes/panel/modal-formulario";
import { Button } from "@/componentes/ui/button";
import type { EstadoFormulario } from "@/lib/formularios";
import type { Direccion } from "@/lib/orden";

// Componente de cliente: se usa dentro de otros componentes de cliente (recibe funciones como props).
// "Cambiar orden" de una lista del panel (pulido 13.21; también Preguntas frecuentes, 13.24): ordenar es poco frecuente,
// así que las flechas no van en cada fila sino en este modal, apiladas y en gris como en el editor de listas. Cada
// movimiento se guarda al momento ("Listo" cierra).

type Props = {
  elementos: { id: number; nombre: string }[];
  /** La acción del servidor que mueve uno. */
  mover: (datos: { id: number; direccion: Direccion }) => Promise<EstadoFormulario>;
  /** De qué es: "Orden de los servicios". */
  etiqueta: string;
};

export function OrdenarLista({ elementos, mover, etiqueta }: Props) {
  const hidratado = useHidratado();
  const [abierto, setAbierto] = useState(false);
  const [pendiente, iniciar] = useTransition();
  const moverUno = (id: number, direccion: Direccion) => {
    if (pendiente) return;
    iniciar(async () => {
      const r = await mover({ id, direccion });
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
        <ol aria-label={etiqueta} className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {elementos.map((e, i) => (
            <li key={e.id} className="flex items-center gap-2 py-1 pr-1 pl-3">
              <span aria-hidden className="w-5 shrink-0 text-right text-sm text-tinta-suave tabular-nums">
                {i + 1}.
              </span>
              <span className="min-w-0 flex-1">{e.nombre}</span>
              <span className="flex shrink-0 text-tinta-suave">
                <Flecha nombre={e.nombre} direccion="subir" tope={i === 0} alTocar={() => moverUno(e.id, "subir")} />
                <Flecha nombre={e.nombre} direccion="bajar" tope={i === elementos.length - 1} alTocar={() => moverUno(e.id, "bajar")} />
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
