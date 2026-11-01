"use client";

import { useActionState, useRef, useState } from "react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { MensajeError } from "@/componentes/panel/campo";
import { PieFormulario } from "@/componentes/panel/pie-formulario";
import { Button } from "@/componentes/ui/button";
import { RadioGroup, RadioGroupItem } from "@/componentes/ui/radio-group";
import { mostrarMonto } from "@/modulos/catalogo/reglas";
import type { EstadoCliente } from "@/modulos/clientes/acciones";
import { CamposCliente, CamposVehiculo } from "@/modulos/clientes/componentes/campos";
import { DatosVehiculo } from "@/modulos/clientes/componentes/datos-vehiculo";
import type { Tamano } from "@/modulos/configuracion/consultas";
import { crearCotizacion } from "../acciones";
import type { OpcionServicio } from "../consultas";
import { CLIENTE_NUEVO, VEHICULO_OTRO } from "../reglas";
import { CamposPrecio, TotalEnPie, usePrecios } from "./campos-precio";
import type { Linea } from "./lineas-servicio";

// Nueva cotización (pedido 23), una vez elegido el cliente (o con "Cliente nuevo"): en un solo formulario, el cliente
// nuevo, su vehículo, los servicios con su precio y cómo se cotizó. El precio sugerido depende del tamaño del vehículo:
// llega de cada tamaño y cambia con el vehículo elegido o el tamaño del nuevo.

export type ClienteElegido = {
  id: number;
  nombre: string;
  /** `detalle`: marca y modelo, año, color… lo que se sepa. */
  vehiculos: { id: number; placa: string; tamanoId: number; tamano: string; detalle: (string | number)[] }[];
};

type Props = {
  /** null: cliente nuevo, que se registra con la cotización. */
  cliente: ClienteElegido | null;
  tamanos: Tamano[];
  /** Las opciones del catálogo para cada tamaño (los activos y los de sus vehículos). */
  opciones: Record<number, OpcionServicio[]>;
  inicio: { validaHasta: string; adelanto: string };
  hoy: string;
};

const PREFIJO = "vehiculo-";
const CAMPO_TAMANO = `${PREFIJO}tamanoId`;

/** El aviso de repetido lleva a cotizarle a ese cliente, no a su ficha. */
const usarExistente = (e: { id: number; nombre: string }) => ({ href: `/panel/cotizaciones/nueva?cliente=${e.id}` as const, texto: `Usar a ${e.nombre}` });

/** El precio que sugiere el catálogo para esa variante, como se escribe en el campo; vacío si no hay. */
function sugerido(opciones: OpcionServicio[] | null, varianteId: number): string {
  const o = opciones?.find((x) => x.varianteId === varianteId);
  return o?.sugerencia.tipo === "monto" ? mostrarMonto(o.sugerencia.monto) : "";
}

export function FormularioNuevaCotizacion({ cliente, tamanos, opciones, inicio, hoy }: Props) {
  const [estado, accion, enviando] = useActionState<EstadoCliente, FormData>(crearCotizacion, {});
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);
  const v = estado.valores ?? {};
  const e = estado.errores ?? {};

  // Controlados, y su valor viaja en un campo oculto propio: React reinicia el formulario al terminar la acción y el
  // campo interno de los radios de base-ui quedaba vacío tras un error, aunque la opción se siguiera viendo marcada
  const conVehiculos = !!cliente && cliente.vehiculos.length > 0;
  const [vehiculo, setVehiculo] = useState(v.vehiculo ?? (cliente?.vehiculos.length === 1 ? String(cliente.vehiculos[0].id) : ""));
  const [tamanoNuevo, setTamanoNuevo] = useState(v[CAMPO_TAMANO] ?? "");
  const vehiculoNuevo = !conVehiculos || vehiculo === VEHICULO_OTRO;
  const precios = usePrecios({ lineas: [], descuento: "0.00", adelanto: inicio.adelanto, validaHasta: inicio.validaHasta, modo: "" });

  const tamanoDe = (eleccion: string, nuevo: string) =>
    !conVehiculos || eleccion === VEHICULO_OTRO ? Number(nuevo) || null : (cliente.vehiculos.find((x) => String(x.id) === eleccion)?.tamanoId ?? null);
  const tamanoId = tamanoDe(vehiculo, tamanoNuevo);
  const delTamano = (t: number | null) => (t ? (opciones[t] ?? null) : null);

  /** Con otro tamaño cambia el precio sugerido: se actualiza en las líneas que todavía tenían el sugerido. */
  function cambiarTamano(eleccion: string, nuevo: string) {
    const antes = delTamano(tamanoId);
    const despues = delTamano(tamanoDe(eleccion, nuevo));
    precios.setLineas((lineas: Linea[]) =>
      lineas.map((l) => (l.varianteId > 0 && l.precio === sugerido(antes, l.varianteId) ? { ...l, precio: sugerido(despues, l.varianteId) } : l)),
    );
  }

  return (
    <form
      ref={formulario}
      action={accion}
      className="flex max-w-3xl flex-col gap-10"
      noValidate
      // El tamaño del vehículo nuevo es un menú de CamposVehiculo, sin control propio: se escucha su cambio
      onChange={(ev) => {
        const campo = ev.target as EventTarget;
        if (!(campo instanceof HTMLSelectElement) || campo.name !== CAMPO_TAMANO) return;
        cambiarTamano(vehiculo, campo.value);
        setTamanoNuevo(campo.value);
      }}
    >
      <input type="hidden" name="cliente" value={cliente ? cliente.id : CLIENTE_NUEVO} />
      {estado.mensaje && !estado.ok && <MensajeError id="cotizacion-error">{estado.mensaje}</MensajeError>}
      {!cliente && (
        <fieldset className="flex flex-col gap-6">
          <legend className="sr-only">Cliente nuevo</legend>
          <CamposCliente estado={estado} compacto enlaceExistente={usarExistente} />
        </fieldset>
      )}

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-4 font-heading text-2xl font-bold italic">Vehículo</legend>
        {conVehiculos && (
          <>
            <input type="hidden" name="vehiculo" value={vehiculo} />
            <RadioGroup
              value={vehiculo}
              onValueChange={(valor) => {
                cambiarTamano(String(valor), tamanoNuevo);
                setVehiculo(String(valor));
              }}
              aria-label="Vehículo"
              className="gap-2"
              aria-describedby={e.vehiculo ? "vehiculo-error" : undefined}
            >
              {cliente.vehiculos.map((ve, i) => (
                <OpcionRadio key={ve.id} id={`vehiculo-${ve.id}`} valor={String(ve.id)} invalido={!!e.vehiculo && i === 0}>
                  <DatosVehiculo placa={ve.placa} detalle={ve.detalle} tamano={ve.tamano} />
                </OpcionRadio>
              ))}
              <OpcionRadio id="vehiculo-otro" valor={VEHICULO_OTRO}>
                <span className="font-semibold">Otro vehículo</span>
              </OpcionRadio>
            </RadioGroup>
            {e.vehiculo && <MensajeError id="vehiculo-error">{e.vehiculo}</MensajeError>}
          </>
        )}
        {vehiculoNuevo && (
          <>
            {!conVehiculos && <input type="hidden" name="vehiculo" value={VEHICULO_OTRO} />}
            <CamposVehiculo estado={estado} prefijo={PREFIJO} tamanos={tamanos} compacto enlaceExistente={usarExistente} />
          </>
        )}
      </fieldset>

      <CamposPrecio precios={precios} opciones={delTamano(tamanoId)} errores={e} hoy={hoy} />

      <PieFormulario>
        <div className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-2 sm:justify-start">
          <TotalEnPie total={precios.totales.total} />
          <Button type="submit" disabled={enviando}>
            {enviando ? "Creando y generando el PDF…" : "Crear cotización"}
          </Button>
        </div>
      </PieFormulario>
    </form>
  );
}

/** Opción con su caja tocable entera (44 px con pantalla táctil). */
function OpcionRadio({ id, valor, invalido, children }: { id: string; valor: string; invalido?: boolean; children: React.ReactNode }) {
  return (
    <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-sm border border-border px-3 py-2 has-data-checked:border-tinta">
      <RadioGroupItem id={id} value={valor} data-invalido={invalido || undefined} />
      <span className="flex min-w-0 flex-col">{children}</span>
    </label>
  );
}
