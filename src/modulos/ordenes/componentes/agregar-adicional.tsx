"use client";

import { useActionState, useRef, useState } from "react";
import { PlusIcon } from "lucide-react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { conAviso } from "@/componentes/panel/avisos";
import { Campo, MensajeError } from "@/componentes/panel/campo";
import { CampoMonto } from "@/componentes/panel/campo-monto";
import { Button } from "@/componentes/ui/button";
import type { EstadoFormulario } from "@/lib/formularios";
import { mostrarMonto } from "@/modulos/catalogo/reglas";
import { ElegirServicio } from "@/modulos/cotizaciones/componentes/elegir-servicio";
import type { OpcionServicio } from "@/modulos/cotizaciones/consultas";
import { serviciosConOpciones } from "@/modulos/cotizaciones/reglas";
import { agregarAdicional } from "../acciones";

// HU-36: sumar un servicio a la orden (RF-43). Solo el dueño, que es quien pone precios (RN-01): del catálogo, con el
// precio vigente para el tamaño del vehículo; si es "según evaluación", lo escribe él. Se elige el servicio y, si tiene
// varias opciones, cuál (ElegirServicio, como en la cotización).

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
  const [servicioId, setServicioId] = useState(0);
  const [varianteId, setVarianteId] = useState(0);
  const [precio, setPrecio] = useState("");
  const grupos = serviciosConOpciones(opciones);
  // El error del servicio va al menú que falta: el servicio o su opción
  const marca = { "aria-invalid": !!e.varianteId, "aria-describedby": e.varianteId ? "servicioId-error" : undefined };
  const sinMarca = { "aria-invalid": false };

  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-4 tt-tarjeta-panel p-4" noValidate aria-labelledby="adicional-titulo">
      <h3 id="adicional-titulo" className="tt-titulo-sub">Agregar servicio</h3>
      <input type="hidden" name="id" value={id} />
      {estado.mensaje && !estado.ok && <MensajeError id="adicional-error">{estado.mensaje}</MensajeError>}
      <input type="hidden" name="servicioId" value={servicioId || ""} />
      <input type="hidden" name="varianteId" value={varianteId || ""} />
      <Campo id="servicioId" etiqueta="Servicio" error={e.varianteId}>
        <ElegirServicio
          grupos={grupos}
          servicioId={servicioId}
          varianteId={varianteId}
          onChange={({ servicioId: nuevo, opcion: o }) => {
            setServicioId(nuevo);
            setVarianteId(o?.varianteId ?? 0);
            // El precio vigente del tamaño, para cambiarlo si hace falta; "según evaluación" lo deja vacío
            setPrecio(o?.sugerencia.tipo === "monto" ? mostrarMonto(o.sugerencia.monto) : "");
          }}
          idServicio="servicioId"
          etiquetaOpcion="Opción del servicio"
          marcaServicio={!servicioId ? marca : sinMarca}
          marcaOpcion={servicioId ? marca : sinMarca}
        />
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
