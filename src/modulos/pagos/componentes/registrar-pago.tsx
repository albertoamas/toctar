"use client";

import { useActionState, useRef, useState } from "react";
import { PlusIcon } from "lucide-react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { useHidratado } from "@/componentes/hidratado";
import { conAviso } from "@/componentes/panel/avisos";
import { Campo, MensajeError } from "@/componentes/panel/campo";
import { CampoMonto } from "@/componentes/panel/campo-monto";
import { MasDatos } from "@/componentes/panel/mas-datos";
import { CancelarModal, ModalFormulario, PieModal, useCambioFueraDelFormulario, useCerrarModal } from "@/componentes/panel/modal-formulario";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import type { MetodoPago } from "@/db/esquema/trabajos";
import type { EstadoFormulario } from "@/lib/formularios";
import { mostrarMonto } from "@/modulos/catalogo/reglas";
import { registrarPago } from "../acciones";
import { useEnvioConComprobante } from "./campo-comprobante";
import { MetodoYComprobante } from "./elegir-metodo";

// HU-32: registrar un pago (RF-45). Se cobra en el taller, con el celular en la mano: el monto viene con el saldo
// (lo que más se cobra) y el tipo, según lo que ya pagó. La foto del comprobante es opcional y se achica antes de
// subirla. El servidor vuelve a mirar el saldo: dos pagos a la vez no lo pasan.
// Pulido 10.3: el formulario se abre en un modal (en la página empujaba lo demás, y en una lista se abría dentro de la
// fila). En la cabecera de Pagos el botón va sin fondo, como "Editar"; en una lista, el principal de la fila.
// Pulido final de los pagos (09/11): ocupaba una pantalla entera del celular para "cobré 120 Bs en efectivo". Ahora, el
// monto y cómo pagó (ElegirMetodo); el comprobante, solo con QR o transferencia y en una miniatura; la fecha (casi siempre
// hoy) plegada en "Cambiar fecha", que se abre sola si trae un error.
// Pedido 46: el tipo (adelanto o saldo) no se elige: lo pone el servidor según cuándo se paga (`tipoDePago`). Se cobra lo
// que traiga el cliente, del adelanto sugerido al total: el tope es el saldo.

type Props = {
  trabajoId: number;
  saldo: string;
  hoy: string;
};

export function RegistrarPago({
  variante = "outline",
  ...props
}: Props & { /** Con borde (en cada fila de Saldos y al entregar); sin fondo en la cabecera de una sección. */ variante?: "ghost" | "outline" }) {
  const [abierto, setAbierto] = useState(false);
  const hidratado = useHidratado();
  return (
    <>
      <Button type="button" variant={variante} disabled={!hidratado} onClick={() => setAbierto(true)}>
        <PlusIcon />
        Registrar pago
      </Button>
      <ModalFormulario titulo="Registrar pago" abierto={abierto} alCambiar={setAbierto}>
        <Formulario {...props} />
      </ModalFormulario>
    </>
  );
}

function Formulario({ trabajoId, saldo, hoy }: Props) {
  const cerrar = useCerrarModal();
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(
    conAviso(registrarPago, (r) => r.ok && cerrar()),
    {},
  );
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);
  const e = estado.errores ?? {};
  // Controlados: React reinicia el formulario al terminar la acción y así nada se pierde tras un error
  const [monto, setMonto] = useState(mostrarMonto(saldo));
  const [metodo, setMetodo] = useState<MetodoPago | "">("");
  const [fecha, setFecha] = useState(hoy);
  const { comprobante, setComprobante, preparando, errorFoto, enviar } = useEnvioConComprobante(accion);
  useCambioFueraDelFormulario(!!comprobante);

  const ocupado = enviando || preparando;
  return (
    <form ref={formulario} action={accion} onSubmit={(ev) => enviar(ev)} className="flex flex-col gap-5" noValidate aria-label="Registrar pago">
      <input type="hidden" name="trabajoId" value={trabajoId} />
      {estado.mensaje && !estado.ok && <MensajeError id="registrar-pago-error">{estado.mensaje}</MensajeError>}
      <Campo id="monto" etiqueta="Monto" error={e.monto} ayuda={`Saldo: ${mostrarMonto(saldo)} Bs.`}>
        <CampoMonto id="monto" name="monto" value={monto} onChange={(ev) => setMonto(ev.target.value)} aria-invalid={!!e.monto} aria-describedby={e.monto ? "monto-error" : "monto-ayuda"} />
      </Campo>
      <MetodoYComprobante metodo={metodo} alCambiarMetodo={setMetodo} alCambiarComprobante={setComprobante} errorMetodo={e.metodo} errorComprobante={errorFoto ?? e.comprobante} />
      {/* Plegada, pero a la vista la que se va a guardar */}
      <MasDatos texto="Cambiar fecha" titulo="Fecha" detalle={`Ahora: ${fecha === hoy ? "hoy" : "otra fecha"}`} abierto={!!e.fecha} conError={!!e.fecha}>
        <Campo id="fecha" etiqueta="Fecha" error={e.fecha}>
          <Input id="fecha" name="fecha" type="date" max={hoy} value={fecha} onChange={(ev) => setFecha(ev.target.value)} className="max-w-xs" aria-invalid={!!e.fecha} aria-describedby={e.fecha ? "fecha-error" : undefined} />
        </Campo>
      </MasDatos>

      <PieModal>
        <Button type="submit" disabled={ocupado}>
          {preparando ? "Preparando foto…" : enviando ? "Registrando…" : "Registrar pago"}
        </Button>
        <CancelarModal enviando={ocupado} />
      </PieModal>
    </form>
  );
}
