"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { PencilIcon, PlusIcon } from "lucide-react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { avisarResultado, conAviso } from "@/componentes/panel/avisos";
import { Button } from "@/componentes/ui/button";
import type { Tamano } from "@/modulos/configuracion/consultas";
import { cambiarEstadoVehiculo, guardarVehiculo, type EstadoCliente } from "../acciones";
import type { VehiculoCliente } from "../consultas";
import { prefijoVehiculo } from "../reglas";
import { CamposVehiculo } from "./campos";

// HU-23: vehículos de un cliente. Se agregan y editan en la misma lista; "Desactivar" va dentro de la edición, como en
// las listas de Configuración (pulido 6.2): se usa poco y así no se toca sin querer. Nada se borra (RN-14).

type Props = { clienteId: number; vehiculos: VehiculoCliente[]; tamanos: Tamano[] };

/** "Toyota Yaris · 2019 · Blanco": lo que se sabe del vehículo, además de la placa y el tamaño. */
const detalle = (v: VehiculoCliente) => [[v.marca, v.modelo].filter(Boolean).join(" "), v.anio, v.color].filter(Boolean);

export function VehiculosCliente({ clienteId, vehiculos, tamanos }: Props) {
  const [editando, setEditando] = useState<number | "nuevo" | null>(null);
  const [pendiente, iniciar] = useTransition();
  const activos = vehiculos.filter((v) => v.activo);
  const inactivos = vehiculos.filter((v) => !v.activo);
  const reactivar = (id: number) => iniciar(async () => avisarResultado(await cambiarEstadoVehiculo({ clienteId, id, activo: true })));

  return (
    <section aria-labelledby="vehiculos-titulo" className="flex flex-col gap-4">
      <h2 id="vehiculos-titulo" className="font-heading text-2xl font-bold italic">Vehículos</h2>
      {activos.length === 0 && editando !== "nuevo" && <p className="text-tinta-suave">Todavía no tiene vehículos.</p>}
      {activos.length > 0 && (
        <ul aria-label="Vehículos" className="flex flex-col divide-y divide-border rounded-sm border border-border">
          {activos.map((v) =>
            editando === v.id ? (
              <li key={v.id} className="p-3">
                <FormularioVehiculo clienteId={clienteId} vehiculo={v} tamanos={tamanos} alTerminar={() => setEditando(null)} />
              </li>
            ) : (
              <li key={v.id} className="flex items-center gap-3 p-3">
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="font-semibold">{v.placa}</span>
                  <span className="flex flex-wrap gap-x-3 text-sm text-tinta-suave">
                    <span>{v.tamano}</span>
                    {detalle(v).map((d) => (
                      <span key={String(d)}>{d}</span>
                    ))}
                  </span>
                </span>
                <Button type="button" variant="ghost" size="icon" aria-label={`Editar ${v.placa}`} onClick={() => setEditando(v.id)}>
                  <PencilIcon />
                </Button>
              </li>
            ),
          )}
        </ul>
      )}

      {editando === "nuevo" ? (
        <div className="rounded-sm border border-border p-3">
          <FormularioVehiculo clienteId={clienteId} tamanos={tamanos} alTerminar={() => setEditando(null)} />
        </div>
      ) : (
        <div>
          <Button type="button" variant="outline" onClick={() => setEditando("nuevo")}>
            <PlusIcon />
            Agregar vehículo
          </Button>
        </div>
      )}

      {inactivos.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-tinta-suave">Desactivados</p>
          <ul aria-label="Vehículos desactivados" className="flex flex-col divide-y divide-border rounded-sm border border-dashed border-border">
            {inactivos.map((v) => (
              <li key={v.id} className="flex items-center gap-3 p-3 text-tinta-suave">
                <span className="flex-1">{v.placa}</span>
                <Button type="button" variant="ghost" disabled={pendiente} onClick={() => reactivar(v.id)} aria-label={`Reactivar ${v.placa}`}>
                  Reactivar
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function FormularioVehiculo({ clienteId, vehiculo, tamanos, alTerminar }: { clienteId: number; vehiculo?: VehiculoCliente; tamanos: Tamano[]; alTerminar: () => void }) {
  const [estado, accion, enviando] = useActionState<EstadoCliente, FormData>(
    conAviso(guardarVehiculo, (r) => r.ok && alTerminar()),
    {},
  );
  const [desactivando, iniciar] = useTransition();
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);
  const prefijo = prefijoVehiculo(vehiculo?.id);
  const iniciales: Record<string, string> = vehiculo
    ? {
        [`${prefijo}placa`]: vehiculo.placa,
        [`${prefijo}tamanoId`]: String(vehiculo.tamanoId),
        [`${prefijo}marca`]: vehiculo.marca ?? "",
        [`${prefijo}modelo`]: vehiculo.modelo ?? "",
        [`${prefijo}anio`]: vehiculo.anio ? String(vehiculo.anio) : "",
        [`${prefijo}color`]: vehiculo.color ?? "",
      }
    : {};
  // Un tamaño ya desactivado se sigue mostrando si es el del vehículo, para no cambiarlo sin querer
  const opciones = vehiculo && !tamanos.some((t) => t.id === vehiculo.tamanoId) ? [...tamanos, { id: vehiculo.tamanoId, nombre: vehiculo.tamano, descripcion: null }] : tamanos;

  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-4" noValidate aria-label={vehiculo ? `Editar ${vehiculo.placa}` : "Agregar vehículo"}>
      <input type="hidden" name="clienteId" value={clienteId} />
      {vehiculo && <input type="hidden" name="id" value={vehiculo.id} />}
      <CamposVehiculo estado={estado} iniciales={iniciales} prefijo={prefijo} tamanos={opciones} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : vehiculo ? "Guardar" : "Agregar"}
        </Button>
        <Button type="button" variant="outline" onClick={alTerminar}>
          Cancelar
        </Button>
        {vehiculo && (
          <Button
            type="button"
            variant="outline"
            className="ml-auto"
            disabled={desactivando}
            aria-label={`Desactivar ${vehiculo.placa}`}
            onClick={() =>
              iniciar(async () => {
                const r = await cambiarEstadoVehiculo({ clienteId, id: vehiculo.id, activo: false });
                avisarResultado(r);
                if (r.ok) alTerminar();
              })
            }
          >
            Desactivar
          </Button>
        )}
      </div>
    </form>
  );
}
