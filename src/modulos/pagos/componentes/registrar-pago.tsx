"use client";

import { startTransition, useActionState, useRef, useState } from "react";
import { PlusIcon } from "lucide-react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { conAviso } from "@/componentes/panel/avisos";
import { Campo, MensajeError } from "@/componentes/panel/campo";
import { CampoMonto } from "@/componentes/panel/campo-monto";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { RadioGroup, RadioGroupItem } from "@/componentes/ui/radio-group";
import type { MetodoPago, TipoPago } from "@/db/esquema/trabajos";
import type { EstadoFormulario } from "@/lib/formularios";
import { mostrarMonto } from "@/modulos/catalogo/reglas";
import { registrarPago } from "../acciones";
import { adjuntarComprobante, CampoComprobante } from "./campo-comprobante";
import { METODOS, NOMBRE_METODO, NOMBRE_TIPO_PAGO, TIPOS } from "../reglas";

// HU-32: registrar un pago (RF-45). Se cobra en el taller, con el celular en la mano: el monto viene con el saldo
// (lo que más se cobra) y el tipo, según lo que ya pagó. La foto del comprobante es opcional y se achica antes de
// subirla. El servidor vuelve a mirar el saldo: dos pagos a la vez no lo pasan.

type Props = {
  trabajoId: number;
  saldo: string;
  hoy: string;
  /** Sin pagos todavía, lo más probable es el adelanto; con pagos, el saldo. */
  conPagos: boolean;
};

export function RegistrarPago(props: Props) {
  const [abierto, setAbierto] = useState(false);
  if (abierto) return <Formulario {...props} cerrar={() => setAbierto(false)} />;
  return (
    <div>
      <Button type="button" onClick={() => setAbierto(true)}>
        <PlusIcon />
        Registrar pago
      </Button>
    </div>
  );
}

function Opciones<T extends string>({ nombre, titulo, valores, etiquetas, valor, cambiar, error }: { nombre: string; titulo: string; valores: readonly T[]; etiquetas: Record<T, string>; valor: string; cambiar: (v: string) => void; error?: string }) {
  return (
    <div className="flex flex-col gap-3">
      <p id={`${nombre}-titulo`} className="text-sm font-medium">{titulo}</p>
      {/* El valor en un campo oculto propio: los radios de base-ui se vaciaban al reiniciarse el formulario */}
      <input type="hidden" name={nombre} value={valor} />
      <RadioGroup value={valor} onValueChange={(v) => cambiar(String(v))} aria-labelledby={`${nombre}-titulo`} aria-describedby={error ? `${nombre}-error` : undefined} className="flex flex-wrap gap-2">
        {valores.map((v, i) => (
          <label key={v} htmlFor={`${nombre}-${v}`} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-sm border border-border px-3 py-2 has-data-checked:border-tinta">
            <RadioGroupItem id={`${nombre}-${v}`} value={v} data-invalido={(!!error && i === 0) || undefined} />
            <span className="font-semibold">{etiquetas[v]}</span>
          </label>
        ))}
      </RadioGroup>
      {error && <MensajeError id={`${nombre}-error`}>{error}</MensajeError>}
    </div>
  );
}

function Formulario({ trabajoId, saldo, hoy, conPagos, cerrar }: Props & { cerrar: () => void }) {
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(
    conAviso(registrarPago, (r) => r.ok && cerrar()),
    {},
  );
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);
  const e = estado.errores ?? {};
  // Controlados: React reinicia el formulario al terminar la acción y así nada se pierde tras un error
  const [monto, setMonto] = useState(mostrarMonto(saldo));
  const [tipo, setTipo] = useState<TipoPago | "">(conPagos ? "saldo" : "adelanto");
  const [metodo, setMetodo] = useState<MetodoPago | "">("");
  const [fecha, setFecha] = useState(hoy);
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [preparando, setPreparando] = useState(false);

  async function enviar(ev: React.SyntheticEvent<HTMLFormElement, SubmitEvent>) {
    ev.preventDefault();
    const datos = new FormData(ev.currentTarget);
    setPreparando(true);
    await adjuntarComprobante(datos, comprobante);
    setPreparando(false);
    startTransition(() => accion(datos));
  }

  const ocupado = enviando || preparando;
  return (
    <form ref={formulario} onSubmit={enviar} className="flex flex-col gap-5 rounded-sm border border-border p-4" noValidate aria-labelledby="registrar-pago-titulo">
      <h3 id="registrar-pago-titulo" className="font-heading text-xl font-bold italic">Registrar pago</h3>
      <input type="hidden" name="trabajoId" value={trabajoId} />
      {estado.mensaje && !estado.ok && <MensajeError id="registrar-pago-error">{estado.mensaje}</MensajeError>}
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo id="monto" etiqueta="Monto" error={e.monto} ayuda={`Saldo: ${mostrarMonto(saldo)} Bs.`}>
          <CampoMonto id="monto" name="monto" value={monto} onChange={(ev) => setMonto(ev.target.value)} aria-invalid={!!e.monto} aria-describedby={e.monto ? "monto-error" : "monto-ayuda"} />
        </Campo>
        <Campo id="fecha" etiqueta="Fecha" error={e.fecha}>
          <Input id="fecha" name="fecha" type="date" max={hoy} value={fecha} onChange={(ev) => setFecha(ev.target.value)} className="max-w-xs" aria-invalid={!!e.fecha} aria-describedby={e.fecha ? "fecha-error" : undefined} />
        </Campo>
      </div>
      <Opciones nombre="tipo" titulo="Tipo" valores={TIPOS} etiquetas={NOMBRE_TIPO_PAGO} valor={tipo} cambiar={(v) => setTipo(v as TipoPago)} error={e.tipo} />
      <Opciones nombre="metodo" titulo="Método" valores={METODOS} etiquetas={NOMBRE_METODO} valor={metodo} cambiar={(v) => setMetodo(v as MetodoPago)} error={e.metodo} />

      <CampoComprobante onChange={setComprobante} error={e.comprobante} />

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={ocupado}>
          {preparando ? "Preparando foto…" : enviando ? "Registrando…" : "Registrar pago"}
        </Button>
        <Button type="button" variant="outline" onClick={cerrar}>
          Volver
        </Button>
      </div>
    </form>
  );
}
