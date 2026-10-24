"use client";

import { useActionState, useRef, useState } from "react";
import { PlusIcon } from "lucide-react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { conAviso } from "@/componentes/panel/avisos";
import { Campo, MensajeError } from "@/componentes/panel/campo";
import { CampoMonto } from "@/componentes/panel/campo-monto";
import { Selector } from "@/componentes/panel/selector";
import { Button } from "@/componentes/ui/button";
import type { EstadoFormulario } from "@/lib/formularios";
import { mostrarMonto } from "@/modulos/catalogo/reglas";
import type { OpcionServicio } from "@/modulos/cotizaciones/consultas";
import { agregarAdicional } from "../acciones";

// HU-36: sumar un servicio a la orden (RF-43). Solo el dueño, que es quien pone precios (RN-01): del catálogo, con el
// precio vigente para el tamaño del vehículo; si es "según evaluación", lo escribe él.

export function AgregarAdicional({ id, opciones }: { id: number; opciones: OpcionServicio[] }) {
  const [abierto, setAbierto] = useState(false);
  if (!abierto) {
    return (
      <div>
        <Button type="button" variant="outline" onClick={() => setAbierto(true)}>
          <PlusIcon />
          Agregar servicio
        </Button>
      </div>
    );
  }
  return <Formulario id={id} opciones={opciones} cerrar={() => setAbierto(false)} />;
}

function Formulario({ id, opciones, cerrar }: { id: number; opciones: OpcionServicio[]; cerrar: () => void }) {
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(
    conAviso(agregarAdicional, (r) => r.ok && cerrar()),
    {},
  );
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);
  const e = estado.errores ?? {};
  const [varianteId, setVarianteId] = useState("");
  const [precio, setPrecio] = useState("");

  function elegir(valor: string) {
    setVarianteId(valor);
    // El precio vigente del tamaño, para cambiarlo si hace falta; "según evaluación" lo deja vacío
    const o = opciones.find((x) => String(x.varianteId) === valor);
    setPrecio(o?.sugerencia.tipo === "monto" ? mostrarMonto(o.sugerencia.monto) : "");
  }

  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-4 rounded-sm border border-border p-4" noValidate aria-labelledby="adicional-titulo">
      <h3 id="adicional-titulo" className="font-heading text-xl font-bold italic">Agregar servicio</h3>
      <input type="hidden" name="id" value={id} />
      {estado.mensaje && !estado.ok && <MensajeError id="adicional-error">{estado.mensaje}</MensajeError>}
      <Campo id="varianteId" etiqueta="Servicio" error={e.varianteId}>
        <Selector id="varianteId" name="varianteId" value={varianteId} onChange={(ev) => elegir(ev.target.value)} aria-invalid={!!e.varianteId} aria-describedby={e.varianteId ? "varianteId-error" : undefined}>
          <option value="">Elige el servicio</option>
          {opciones.map((o) => (
            <option key={o.varianteId} value={o.varianteId}>{o.descripcion}</option>
          ))}
        </Selector>
      </Campo>
      <Campo id="precio" etiqueta="Precio" error={e.precio}>
        <CampoMonto id="precio" name="precio" value={precio} onChange={(ev) => setPrecio(ev.target.value)} aria-invalid={!!e.precio} aria-describedby={e.precio ? "precio-error" : undefined} />
      </Campo>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={enviando}>
          {enviando ? "Agregando…" : "Agregar"}
        </Button>
        <Button type="button" variant="outline" onClick={cerrar}>
          Volver
        </Button>
      </div>
    </form>
  );
}
