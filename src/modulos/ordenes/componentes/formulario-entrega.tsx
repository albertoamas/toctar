"use client";

import { useActionState, useCallback, useRef, useState } from "react";
import { KeyRoundIcon } from "lucide-react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { Campo, MensajeError } from "@/componentes/panel/campo";
import { PanelFirma } from "@/componentes/panel/panel-firma";
import { PieFormulario } from "@/componentes/panel/pie-formulario";
import { Button } from "@/componentes/ui/button";
import { Checkbox } from "@/componentes/ui/checkbox";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
import type { EstadoFormulario } from "@/lib/formularios";
import { entregarVehiculo } from "../acciones";

// HU-36: confirmar la entrega (CU-19). Sin saldo, un botón. Con saldo, solo quien puede autorizarlo (el dueño o un
// encargado con el permiso, RN-13) ve la casilla que lo confirma; quien no, ve por qué no puede. El servidor lo vuelve
// a mirar todo con la orden bloqueada.
// Pedido 13 (P13-firma-entrega.md): el cliente firma con el dedo que recibe su vehículo conforme, con su nombre (el del
// cliente, cambiable si retira otra persona); o "Entregar sin firma" con el motivo.

type Props = {
  id: number;
  /** Queda saldo pendiente. */
  conDeuda: boolean;
  /** "300 Bs", si quien entrega ve pagos; si no, el saldo no se muestra. */
  saldo: string | null;
  puedeAutorizar: boolean;
  /** El nombre del cliente: quien suele firmar. */
  cliente: string;
};

export function FormularioEntrega({ id, conDeuda, saldo, puedeAutorizar, cliente }: Props) {
  // La firma vive en el estado (no es un campo del formulario): se suma al enviar, como archivo
  const [firma, setFirma] = useState<Blob | null>(null);
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(async (previo, datos) => {
    if (firma && !datos.get("sinFirma")) datos.set("firma", new File([firma], "firma.png", { type: "image/png" }));
    return entregarVehiculo(previo, datos);
  }, {});
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);
  // El valor en un campo oculto propio: la casilla de base-ui se vaciaba al reiniciarse el formulario
  const [conSaldo, setConSaldo] = useState(false);
  const [sinFirma, setSinFirma] = useState(false);
  // Controlados: React reinicia el formulario al terminar la acción y así nada se pierde tras un error
  const [nombre, setNombre] = useState(cliente);
  const [motivo, setMotivo] = useState("");
  const alCambiarFirma = useCallback((f: Blob | null) => setFirma(f), []);
  const e = estado.errores ?? {};
  // Al abrir estaba pagada, pero al entregar el servidor encontró saldo (un pago anulado, un adicional): pide la casilla
  const conCasilla = conDeuda || !!e.conSaldo;

  if (conDeuda && !puedeAutorizar) {
    return (
      <p role="status" className="rounded-sm border border-aviso p-3">
        Queda saldo pendiente. La entrega con saldo la autoriza el dueño o quien tenga el permiso.
      </p>
    );
  }

  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-5" noValidate aria-label="Entregar vehículo">
      <input type="hidden" name="id" value={id} />
      {estado.mensaje && <MensajeError id="entrega-error">{estado.mensaje}</MensajeError>}

      <section aria-labelledby="firma-titulo" className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="firma-titulo" className="font-heading text-2xl font-bold italic">Firma del cliente</h2>
          <p className="text-sm text-tinta-suave">El cliente firma con el dedo: recibe su vehículo conforme.</p>
        </div>
        {sinFirma && <input type="hidden" name="sinFirma" value="on" />}
        {!sinFirma && (
          <>
            <PanelFirma alCambiar={alCambiarFirma} etiqueta="Recuadro para la firma del cliente" invalido={!!e.firma} describedBy={e.firma ? "firma-error" : undefined} />
            {e.firma && <MensajeError id="firma-error">{e.firma}</MensajeError>}
            <Campo id="firmaNombre" etiqueta="Nombre de quien recibe" error={e.firmaNombre}>
              <Input
                id="firmaNombre"
                name="firmaNombre"
                value={nombre}
                onChange={(ev) => setNombre(ev.target.value)}
                autoComplete="off"
                aria-invalid={!!e.firmaNombre}
                aria-describedby={e.firmaNombre ? "firmaNombre-error" : undefined}
                className="max-w-md"
              />
            </Campo>
          </>
        )}
        <label htmlFor="sinFirma" className="flex min-h-11 cursor-pointer items-center gap-3 self-start">
          <Checkbox id="sinFirma" checked={sinFirma} onCheckedChange={(si) => setSinFirma(si === true)} />
          <span className="font-medium">Entregar sin firma</span>
        </label>
        {sinFirma && (
          <Campo id="sinFirmaMotivo" etiqueta="Motivo" error={e.sinFirmaMotivo} ayuda="Por ejemplo: retiró otra persona.">
            <Textarea
              id="sinFirmaMotivo"
              name="sinFirmaMotivo"
              rows={2}
              value={motivo}
              onChange={(ev) => setMotivo(ev.target.value)}
              aria-invalid={!!e.sinFirmaMotivo}
              aria-describedby={e.sinFirmaMotivo ? "sinFirmaMotivo-error" : "sinFirmaMotivo-ayuda"}
            />
          </Campo>
        )}
      </section>

      {conCasilla && (
        <>
          {conSaldo && <input type="hidden" name="conSaldo" value="on" />}
          <label htmlFor="conSaldo" className="flex min-h-11 cursor-pointer items-center gap-3 rounded-sm border border-aviso p-3">
            <Checkbox
              id="conSaldo"
              checked={conSaldo}
              onCheckedChange={(si) => setConSaldo(si === true)}
              data-invalido={e.conSaldo ? true : undefined}
              aria-describedby={e.conSaldo ? "conSaldo-error" : undefined}
            />
            <span className="font-medium">Entregar con saldo pendiente{conDeuda && saldo && ` (${saldo})`}</span>
          </label>
          {e.conSaldo && <MensajeError id="conSaldo-error">{e.conSaldo}</MensajeError>}
        </>
      )}
      <PieFormulario>
        <Button type="submit" disabled={enviando} className="h-14 w-full text-base sm:w-auto sm:px-8">
          <KeyRoundIcon />
          {enviando ? "Entregando…" : "Entregar vehículo"}
        </Button>
      </PieFormulario>
    </form>
  );
}
