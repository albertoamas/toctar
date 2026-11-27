"use client";

import { useActionState, useCallback, useRef, useState } from "react";
import { KeyRoundIcon } from "lucide-react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { Campo, MensajeError } from "@/componentes/panel/campo";
import { PanelFirma } from "@/componentes/panel/panel-firma";
import { AvisoAlSalir } from "@/componentes/panel/cambios-sin-guardar";
import { PieFormulario } from "@/componentes/panel/pie-formulario";
import { AvisoEstado } from "@/componentes/panel/aviso-estado";
import { CabeceraTarjeta } from "@/componentes/panel/cabecera-seccion";
import { BOTON_PASO } from "@/componentes/panel/paso-siguiente";
import { Button } from "@/componentes/ui/button";
import { Checkbox } from "@/componentes/ui/checkbox";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
import type { EstadoFormulario } from "@/lib/formularios";
import { entregarVehiculo } from "../acciones/entrega";

// HU-36: confirmar la entrega (CU-19). Sin saldo, un botón. Con saldo, solo quien puede autorizarlo (el dueño o un
// encargado con el permiso, RN-13) ve la casilla que lo confirma; quien no, ve por qué no puede. El servidor lo vuelve
// a mirar todo con la orden bloqueada.
// Pedido 13 (P13-firma-entrega.md): el cliente firma con el dedo que recibe su vehículo conforme, con su nombre (el del
// cliente, cambiable si retira otra persona); o "Entregar sin firma" con el motivo.

type Props = {
  /** De dónde se vino: la orden entregada vuelve ahí (pedido 43). */
  volver: string | null;
  id: number;
  /** Queda saldo pendiente. */
  conDeuda: boolean;
  /** "300 Bs", si quien entrega ve pagos; si no, el saldo no se muestra. */
  saldo: string | null;
  puedeAutorizar: boolean;
  /** El nombre del cliente: quien suele firmar. */
  cliente: string;
  /** Lo que la entrega va a hacer (los mantenimientos), dicho justo antes del botón (C7 §5.3). */
  alEntregar?: React.ReactNode;
  /** "Registrar pago", junto a "Falta cobrar", si quien entrega ve pagos y queda saldo. */
  cobro?: React.ReactNode;
};

export function FormularioEntrega({ id, volver, conDeuda, saldo, puedeAutorizar, cliente, alEntregar, cobro }: Props) {
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
  // El aviso de saldo de una entrega vale mientras el saldo no cambie (prueba con el dueño, 18/11): se intentó entregar sin
  // la casilla, salió el aviso, se cobró todo ahí mismo y la casilla seguía, con su aviso, porque el error quedaba en el
  // estado. Cada respuesta nueva del servidor trae su aviso; un cambio de `conDeuda` (la página se renueva al cobrar) lo
  // descarta. Se ajusta al dibujar, como pide React para el estado que depende de una prop
  const [visto, setVisto] = useState({ estado, conDeuda, avisoSaldo: false });
  let avisoSaldo = visto.avisoSaldo;
  if (visto.estado !== estado || visto.conDeuda !== conDeuda) {
    avisoSaldo = visto.estado !== estado ? !!estado.errores?.conSaldo : false;
    setVisto({ estado, conDeuda, avisoSaldo });
  }
  const errores = estado.errores ?? {};
  const e = avisoSaldo ? errores : { ...errores, conSaldo: undefined };
  // Al abrir estaba pagada, pero al entregar el servidor encontró saldo (un pago anulado, un adicional): pide la casilla
  const conCasilla = conDeuda || avisoSaldo;

  // Lo que decide el paso, arriba (C7 §5.3; 21/11, en un solo lugar): pagado, o cuánto falta con "Registrar pago" y, en el
  // mismo aviso, la casilla para entregar con el saldo (antes iba abajo de la firma y el saldo se decía tres veces)
  const faltaCobrar = saldo ? `Falta cobrar ${saldo}` : "Queda saldo pendiente.";

  if (conDeuda && !puedeAutorizar) {
    return (
      <AvisoEstado tono="aviso" accion={cobro} debajo={<p role="status">La entrega con saldo la autoriza el dueño o quien tenga el permiso.</p>}>
        {faltaCobrar}
      </AvisoEstado>
    );
  }

  return (
    // Pulido de Entregar (09/11): la firma con su título arriba de su tarjeta; entregar con saldo, aparte (es la excepción)
    <form ref={formulario} action={accion} className="flex flex-col gap-6" noValidate aria-label="Entregar vehículo">
      <input type="hidden" name="id" value={id} />
      {volver && <input type="hidden" name="volver" value={volver} />}
      {estado.mensaje && <MensajeError id="entrega-error">{estado.mensaje}</MensajeError>}
      {conCasilla ? (
        <div className="flex flex-col gap-2">
          {conSaldo && <input type="hidden" name="conSaldo" value="on" />}
          <AvisoEstado
            tono="aviso"
            accion={cobro}
            debajo={
              <label htmlFor="conSaldo" className="flex min-h-11 cursor-pointer items-center gap-3 font-medium text-tinta">
                <Checkbox
                  id="conSaldo"
                  checked={conSaldo}
                  onCheckedChange={(si) => setConSaldo(si === true)}
                  data-invalido={e.conSaldo ? true : undefined}
                  aria-describedby={e.conSaldo ? "conSaldo-error" : undefined}
                />
                Entregar con saldo pendiente
              </label>
            }
          >
            {faltaCobrar}
          </AvisoEstado>
          {e.conSaldo && <MensajeError id="conSaldo-error">{e.conSaldo}</MensajeError>}
        </div>
      ) : (
        <AvisoEstado tono="exito">Pagado por completo.</AvisoEstado>
      )}

      {/* El título adentro de la tarjeta, como el resto del paso (sistema-del-panel.md §2, 18/11) */}
      <section aria-labelledby="firma-titulo" className="tt-tarjeta-panel flex flex-col">
        {/* Sin la frase de ayuda (21/11): "Firme aquí" ya va dentro del recuadro */}
        <CabeceraTarjeta id="firma" titulo="Firma del cliente" />
        <div className="flex flex-col gap-4 p-4 sm:p-5">
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
          {/* La excepción, en chico (21/11): antes pesaba lo mismo que la firma */}
          <label htmlFor="sinFirma" className="flex min-h-11 cursor-pointer items-center gap-3 self-start text-sm text-tinta-suave">
            <Checkbox
              id="sinFirma"
              checked={sinFirma}
              onCheckedChange={(si) => {
                setSinFirma(si === true);
                // La firma que había no se envía: al volver, el recuadro empieza vacío
                if (si) setFirma(null);
              }}
            />
            <span>El cliente no puede firmar</span>
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
        </div>
      </section>

      {alEntregar}
      <AvisoAlSalir formulario={formulario} estado={estado} ademas={!!firma} />
      <PieFormulario>
        <Button type="submit" size="paso" disabled={enviando} className={BOTON_PASO}>
          <KeyRoundIcon />
          {enviando ? "Entregando…" : "Entregar vehículo"}
        </Button>
      </PieFormulario>
    </form>
  );
}
