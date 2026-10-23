"use client";

import { useActionState, useRef, useState } from "react";
import { KeyRoundIcon } from "lucide-react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { MensajeError } from "@/componentes/panel/campo";
import { Button } from "@/componentes/ui/button";
import { Checkbox } from "@/componentes/ui/checkbox";
import type { EstadoFormulario } from "@/lib/formularios";
import { entregarVehiculo } from "../acciones";

// HU-36: confirmar la entrega (CU-19). Sin saldo, un botón. Con saldo, solo quien puede autorizarlo (el dueño o un
// encargado con el permiso, RN-13) ve la casilla que lo confirma; quien no, ve por qué no puede. El servidor lo vuelve
// a mirar todo con la orden bloqueada.

type Props = {
  id: number;
  /** Queda saldo pendiente. */
  conDeuda: boolean;
  /** "300 Bs", si quien entrega ve pagos; si no, el saldo no se muestra. */
  saldo: string | null;
  puedeAutorizar: boolean;
};

export function FormularioEntrega({ id, conDeuda, saldo, puedeAutorizar }: Props) {
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(entregarVehiculo, {});
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);
  // El valor en un campo oculto propio: la casilla de base-ui se vaciaba al reiniciarse el formulario
  const [conSaldo, setConSaldo] = useState(false);

  if (conDeuda && !puedeAutorizar) {
    return (
      <p role="status" className="rounded-sm border border-aviso p-3">
        Queda saldo pendiente. La entrega con saldo la autoriza el dueño o quien tenga el permiso.
      </p>
    );
  }

  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-4" noValidate aria-label="Entregar vehículo">
      <input type="hidden" name="id" value={id} />
      {estado.mensaje && <MensajeError id="entrega-error">{estado.mensaje}</MensajeError>}
      {conDeuda && (
        <>
          {conSaldo && <input type="hidden" name="conSaldo" value="on" />}
          <label htmlFor="conSaldo" className="flex min-h-11 cursor-pointer items-center gap-3 rounded-sm border border-aviso p-3">
            <Checkbox id="conSaldo" checked={conSaldo} onCheckedChange={(si) => setConSaldo(si === true)} data-invalido={estado.mensaje ? true : undefined} />
            <span className="font-medium">Entregar con saldo pendiente{saldo && ` (${saldo})`}</span>
          </label>
        </>
      )}
      <div>
        <Button type="submit" disabled={enviando} className="h-14 w-full text-base sm:w-auto sm:px-8">
          <KeyRoundIcon />
          {enviando ? "Entregando…" : "Entregar vehículo"}
        </Button>
      </div>
    </form>
  );
}
