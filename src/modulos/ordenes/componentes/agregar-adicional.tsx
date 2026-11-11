"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { useHidratado } from "@/componentes/hidratado";
import { Campo } from "@/componentes/panel/campo";
import { CampoMonto } from "@/componentes/panel/campo-monto";
import { CancelarModal, ModalFormulario, PieModal, useFormularioEnModal } from "@/componentes/panel/modal-formulario";
import { Button } from "@/componentes/ui/button";
import { mostrarMonto } from "@/modulos/catalogo/reglas";
import { ElegirServicio } from "@/modulos/cotizaciones/componentes/elegir-servicio";
import type { OpcionServicio } from "@/modulos/cotizaciones/consultas";
import { serviciosConOpciones } from "@/modulos/cotizaciones/reglas";
import { agregarAdicional } from "../acciones";

// HU-36: sumar un servicio a la orden (RF-43). Solo el dueño, que es quien pone precios (RN-01): del catálogo, con el
// precio vigente para el tamaño del vehículo; si es "según evaluación", lo escribe él. Se elige el servicio y, si tiene
// varias opciones, cuál (ElegirServicio, como en la cotización).
// Pulido 13.49: el botón va sin fondo en la cabecera de Servicios, como "Registrar pago" en la de Pagos (antes cortaba la
// cuenta entre los servicios y el total), y el formulario se abre en un modal.

export function AgregarAdicional({ id, opciones }: { id: number; opciones: OpcionServicio[] }) {
  const [abierto, setAbierto] = useState(false);
  const hidratado = useHidratado();
  return (
    <>
      <Button type="button" variant="ghost" disabled={!hidratado} onClick={() => setAbierto(true)}>
        <PlusIcon />
        Agregar servicio
      </Button>
      <ModalFormulario titulo="Agregar servicio" abierto={abierto} alCambiar={setAbierto}>
        <Formulario id={id} opciones={opciones} />
      </ModalFormulario>
    </>
  );
}

function Formulario({ id, opciones }: { id: number; opciones: OpcionServicio[] }) {
  const { accion, enviando, formulario, e } = useFormularioEnModal(agregarAdicional);
  const [servicioId, setServicioId] = useState(0);
  const [varianteId, setVarianteId] = useState(0);
  const [precio, setPrecio] = useState("");
  const grupos = serviciosConOpciones(opciones);
  // El error del servicio va al menú que falta: el servicio o su opción
  const marca = { "aria-invalid": !!e.varianteId, "aria-describedby": e.varianteId ? "servicioId-error" : undefined };
  const sinMarca = { "aria-invalid": false };

  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-5" noValidate aria-label="Agregar servicio">
      <input type="hidden" name="id" value={id} />
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
      <PieModal>
        <Button type="submit" disabled={enviando}>
          {enviando ? "Agregando…" : "Agregar"}
        </Button>
        <CancelarModal />
      </PieModal>
    </form>
  );
}
