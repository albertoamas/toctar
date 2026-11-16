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
import { OpcionesEnTarjetas } from "@/componentes/panel/opciones-en-tarjetas";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import type { MetodoPago } from "@/db/esquema/trabajos";
import type { EstadoFormulario } from "@/lib/formularios";
import { CampoComprobante, useEnvioConComprobante } from "@/modulos/pagos/componentes/campo-comprobante";
import { ElegirMetodo } from "@/modulos/pagos/componentes/elegir-metodo";
import { registrarGasto } from "../acciones";
import type { CategoriaGasto } from "../consultas";
import { LARGO_DETALLE, primerDiaDeGastos } from "../reglas";

// Pedido 16 (P16-reportes-y-gastos.md §5): registrar un gasto desde el celular, en menos de un minuto. Como "Registrar
// pago": un modal con tarjetas para elegir (qué se pagó y cómo), el monto y la foto del comprobante (opcional, también en
// efectivo: una factura de luz se paga así). La fecha casi siempre es hoy: plegada en "Cambiar fecha".

type Props = { categorias: CategoriaGasto[]; hoy: string };

export function RegistrarGasto({ variante = "default", ...props }: Props & { /** El principal de la pantalla, o con borde. */ variante?: "default" | "outline" }) {
  const [abierto, setAbierto] = useState(false);
  const hidratado = useHidratado();
  return (
    <>
      <Button type="button" variant={variante} disabled={!hidratado} onClick={() => setAbierto(true)}>
        <PlusIcon />
        Registrar gasto
      </Button>
      {/* Sin teclado al abrir: lo primero es elegir qué se pagó */}
      <ModalFormulario titulo="Registrar gasto" abierto={abierto} alCambiar={setAbierto} sinTeclado>
        <Formulario {...props} />
      </ModalFormulario>
    </>
  );
}

function Formulario({ categorias, hoy }: Props) {
  const cerrar = useCerrarModal();
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(
    conAviso(registrarGasto, (r) => r.ok && cerrar()),
    {},
  );
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);
  const e = estado.errores ?? {};
  // Controlados: React reinicia el formulario al terminar la acción y así nada se pierde tras un error
  const [categoria, setCategoria] = useState("");
  const [monto, setMonto] = useState("");
  const [metodo, setMetodo] = useState<MetodoPago | "">("");
  const [detalle, setDetalle] = useState("");
  const [fecha, setFecha] = useState(hoy);
  const { comprobante, setComprobante, preparando, errorFoto, enviar } = useEnvioConComprobante(accion);
  useCambioFueraDelFormulario(!!comprobante);

  const ocupado = enviando || preparando;
  return (
    <form ref={formulario} action={accion} onSubmit={(ev) => enviar(ev)} className="flex flex-col gap-5" noValidate aria-label="Registrar gasto">
      {estado.mensaje && !estado.ok && <MensajeError id="registrar-gasto-error">{estado.mensaje}</MensajeError>}
      <OpcionesEnTarjetas
        id="categoriaId"
        titulo="Qué se pagó"
        nombre="categoriaId"
        valor={categoria}
        cambiar={setCategoria}
        opciones={categorias.map((c) => ({ valor: String(c.id), texto: c.nombre }))}
        error={e.categoriaId}
        className="grid-cols-2"
      />
      <Campo id="monto" etiqueta="Monto (Bs)" error={e.monto}>
        <CampoMonto id="monto" name="monto" value={monto} onChange={(ev) => setMonto(ev.target.value)} aria-invalid={!!e.monto} aria-describedby={e.monto ? "monto-error" : undefined} />
      </Campo>
      <ElegirMetodo titulo="Cómo se pagó" valor={metodo} cambiar={setMetodo} error={e.metodo} />
      <Campo id="detalle" etiqueta="Detalle" opcional error={e.detalle}>
        <Input
          id="detalle"
          name="detalle"
          value={detalle}
          maxLength={LARGO_DETALLE}
          onChange={(ev) => setDetalle(ev.target.value)}
          placeholder="Factura de luz de octubre"
          aria-invalid={!!e.detalle}
          aria-describedby={e.detalle ? "detalle-error" : undefined}
        />
      </Campo>
      <CampoComprobante onChange={setComprobante} error={errorFoto ?? e.comprobante} />
      {/* Plegada, pero a la vista la que se va a guardar */}
      <MasDatos texto="Cambiar fecha" titulo="Fecha" detalle={`Ahora: ${fecha === hoy ? "hoy" : "otra fecha"}`} abierto={!!e.fecha} conError={!!e.fecha}>
        <Campo id="fecha" etiqueta="Fecha" error={e.fecha}>
          <Input id="fecha" name="fecha" type="date" min={primerDiaDeGastos(hoy)} max={hoy} value={fecha} onChange={(ev) => setFecha(ev.target.value)} className="max-w-xs" aria-invalid={!!e.fecha} aria-describedby={e.fecha ? "fecha-error" : undefined} />
        </Campo>
      </MasDatos>

      <PieModal>
        <Button type="submit" disabled={ocupado}>
          {preparando ? "Preparando foto…" : enviando ? "Guardando…" : "Guardar gasto"}
        </Button>
        <CancelarModal enviando={ocupado} />
      </PieModal>
    </form>
  );
}
