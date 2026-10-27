"use client";

import { useActionState, useRef, useState } from "react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { Campo, MensajeError } from "@/componentes/panel/campo";
import { PieFormulario } from "@/componentes/panel/pie-formulario";
import { Selector } from "@/componentes/panel/selector";
import { Button } from "@/componentes/ui/button";
import { RadioGroup, RadioGroupItem } from "@/componentes/ui/radio-group";
import { Textarea } from "@/componentes/ui/textarea";
import type { Canal } from "@/db/esquema/consultas";
import { CamposCliente, CamposVehiculo } from "@/modulos/clientes/componentes/campos";
import type { EstadoCliente } from "@/modulos/clientes/acciones";
import type { Tamano } from "@/modulos/configuracion/consultas";
import { crearConsulta } from "../acciones";
import { CLIENTE_NUEVO, NOMBRE_CANAL, VEHICULO_OTRO } from "../reglas";

// HU-24: el resto de la nueva consulta, una vez elegido el cliente (o con "Cliente nuevo"). El cliente se elige en la
// página, con el buscador de Clientes; acá van su vehículo, el servicio, el canal y la nota.

export type ClienteElegido = {
  id: number;
  nombre: string;
  /** `detalle`: marca y modelo, color… lo que se sepa. El tamaño, aparte (se mostraba junto al modelo y confundía). */
  vehiculos: { id: number; placa: string; tamano: string; detalle: string[] }[];
};

type Props = {
  /** null: cliente nuevo, que se registra con la consulta. */
  cliente: ClienteElegido | null;
  tamanos: Tamano[];
  servicios: { id: number; nombre: string }[];
};

const CANALES: Canal[] = ["whatsapp", "taller"];
const PREFIJO = "vehiculo-";

/** El aviso de repetido lleva a usar ese cliente en la consulta, no a su ficha. */
const usarExistente = (e: { id: number; nombre: string }) => ({ href: `/panel/consultas/nueva?cliente=${e.id}` as const, texto: `Usar a ${e.nombre}` });

export function FormularioConsulta({ cliente, tamanos, servicios }: Props) {
  const [estado, accion, enviando] = useActionState<EstadoCliente, FormData>(crearConsulta, {});
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);
  const v = estado.valores ?? {};
  const e = estado.errores ?? {};

  // Controlados, y su valor viaja en un campo oculto propio: React reinicia el formulario al terminar la acción y el
  // campo interno de los radios de base-ui quedaba vacío tras un error, aunque la opción se siguiera viendo marcada
  const conVehiculos = !!cliente && cliente.vehiculos.length > 0;
  const [vehiculo, setVehiculo] = useState(v.vehiculo ?? (cliente?.vehiculos.length === 1 ? String(cliente.vehiculos[0].id) : ""));
  const [canal, setCanal] = useState(v.canal ?? "");
  const vehiculoNuevo = !conVehiculos || vehiculo === VEHICULO_OTRO;

  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-8" noValidate>
      <input type="hidden" name="cliente" value={cliente ? cliente.id : CLIENTE_NUEVO} />
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
            <RadioGroup value={vehiculo} onValueChange={(valor) => setVehiculo(String(valor))} className="gap-2" aria-describedby={e.vehiculo ? "vehiculo-error" : undefined}>
              {cliente.vehiculos.map((ve, i) => (
                <OpcionRadio key={ve.id} id={`vehiculo-${ve.id}`} valor={String(ve.id)} invalido={!!e.vehiculo && i === 0}>
                  <span className="font-heading text-xl font-extrabold italic tabular-nums">{ve.placa}</span>
                  {ve.detalle.length > 0 && (
                    <span className="flex flex-wrap gap-x-3 text-sm">
                      {ve.detalle.map((d) => (
                        <span key={d}>{d}</span>
                      ))}
                    </span>
                  )}
                  <span className="text-sm text-tinta-suave">Tamaño: {ve.tamano}</span>
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

      <fieldset className="flex flex-col gap-6">
        <legend className="mb-6 font-heading text-2xl font-bold italic">Consulta</legend>
        <Campo id="servicioId" etiqueta="Servicio de interés" error={e.servicioId}>
          <Selector
            key={v.servicioId ?? ""}
            id="servicioId"
            name="servicioId"
            defaultValue={v.servicioId ?? ""}
            aria-invalid={!!e.servicioId}
            aria-describedby={e.servicioId ? "servicioId-error" : undefined}
            className="max-w-sm"
          >
            <option value="">Todavía no sabe</option>
            {servicios.map((s) => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </Selector>
        </Campo>

        <div className="flex flex-col gap-3">
          <p id="canal-titulo" className="text-sm font-medium">Canal</p>
          <input type="hidden" name="canal" value={canal} />
          <RadioGroup value={canal} onValueChange={(valor) => setCanal(String(valor))} aria-labelledby="canal-titulo" aria-describedby={e.canal ? "canal-error" : undefined} className="flex flex-wrap gap-2">
            {CANALES.map((c, i) => (
              <OpcionRadio key={c} id={`canal-${c}`} valor={c} invalido={!!e.canal && i === 0}>
                <span className="font-semibold">{NOMBRE_CANAL[c]}</span>
              </OpcionRadio>
            ))}
          </RadioGroup>
          {e.canal && <MensajeError id="canal-error">{e.canal}</MensajeError>}
        </div>

        <Campo id="nota" etiqueta="Nota" error={e.nota} ayuda="Qué pidió, qué le preocupa, cuándo lo necesita…">
          <Textarea id="nota" name="nota" rows={3} defaultValue={v.nota} aria-invalid={!!e.nota} aria-describedby={e.nota ? "nota-error" : "nota-ayuda"} />
        </Campo>
      </fieldset>

      <PieFormulario>
        <Button type="submit" disabled={enviando}>
          {enviando ? "Registrando…" : "Registrar consulta"}
        </Button>
      </PieFormulario>
    </form>
  );
}

/** Opción con su caja tocable entera (44 px con pantalla táctil). */
function OpcionRadio({ id, valor, invalido, children }: { id: string; valor: string; invalido?: boolean; children: React.ReactNode }) {
  return (
    <label
      htmlFor={id}
      className="flex min-h-11 cursor-pointer items-center gap-3 rounded-sm border border-border px-3 py-2 has-data-checked:border-tinta"
    >
      <RadioGroupItem id={id} value={valor} data-invalido={invalido || undefined} />
      <span className="flex min-w-0 flex-col">{children}</span>
    </label>
  );
}
