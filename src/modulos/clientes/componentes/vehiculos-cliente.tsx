"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { PencilIcon, PlusIcon } from "lucide-react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { useHidratado } from "@/componentes/hidratado";
import { avisarResultado, conAviso } from "@/componentes/panel/avisos";
import { CancelarModal, ModalFormulario, PieModal, useCerrarModal } from "@/componentes/panel/modal-formulario";
import { CabeceraSeccion } from "@/componentes/panel/seccion-con-editar";
import { Button } from "@/componentes/ui/button";
import type { Tamano } from "@/modulos/configuracion/consultas";
import { cambiarEstadoVehiculo, guardarVehiculo, type EstadoCliente } from "../acciones";
import type { VehiculoCliente } from "../consultas";
import { nombreVehiculo, prefijoVehiculo } from "../reglas";
import { CamposVehiculo } from "./campos";
import { DatosVehiculo } from "./datos-vehiculo";

// HU-23: vehículos de un cliente, en su ficha. Pulido 8.3 (skill pantallas-panel): la lista en lectura, con la placa
// grande; el lápiz abre "Editar {placa}" y "＋ Agregar" abre "Agregar vehículo", en un modal (ModalFormulario), con
// placa y tamaño a la vista y lo demás plegado como en el alta. "Desactivar" va dentro de la edición: se usa poco y así
// no se toca sin querer. Nada se borra (RN-14).

type Props = { clienteId: number; vehiculos: VehiculoCliente[]; tamanos: Tamano[] };

/** "Toyota Yaris 2019 Blanco": lo que se sabe del vehículo, además de la placa. El tamaño va aparte (DatosVehiculo). */
const detalle = (v: VehiculoCliente) => [nombreVehiculo(v), v.anio, v.color].filter((d): d is string | number => !!d);

export function VehiculosCliente({ clienteId, vehiculos, tamanos }: Props) {
  const hidratado = useHidratado();
  // El modal guarda el vehículo elegido aparte de si está abierto: al cerrarse, el contenido no cambia mientras se va.
  // Se busca por id en la lista, que llega actualizada después de guardar
  const [abierto, setAbierto] = useState(false);
  const [elegidoId, setElegidoId] = useState<number | null>(null);
  const [aperturas, setAperturas] = useState(0);
  const elegido = vehiculos.find((v) => v.id === elegidoId) ?? null;
  const [pendiente, iniciar] = useTransition();
  const activos = vehiculos.filter((v) => v.activo);
  const inactivos = vehiculos.filter((v) => !v.activo);
  const abrir = (v: VehiculoCliente | null) => {
    setElegidoId(v?.id ?? null);
    setAperturas((n) => n + 1);
    setAbierto(true);
  };
  const reactivar = (id: number) => iniciar(async () => avisarResultado(await cambiarEstadoVehiculo({ clienteId, id, activo: true })));

  return (
    <section aria-labelledby="vehiculos-titulo" className="flex flex-col gap-3">
      {/* La misma cabecera que SeccionConEditar: Datos, al lado, se ve igual */}
      <CabeceraSeccion id="vehiculos" titulo="Vehículos">
        <Button type="button" variant="ghost" disabled={!hidratado} aria-label="Agregar vehículo" onClick={() => abrir(null)}>
          <PlusIcon />
          Agregar
        </Button>
      </CabeceraSeccion>
      {activos.length === 0 ? (
        <p className="flex-1 rounded-sm border border-border p-4 text-tinta-suave">Todavía no tiene vehículos.</p>
      ) : (
        <ul aria-label="Vehículos" className="flex flex-1 flex-col divide-y divide-border rounded-sm border border-border">
          {activos.map((v) => (
            <li key={v.id} className="flex items-center gap-3 p-3">
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <DatosVehiculo placa={v.placa} detalle={detalle(v)} tamano={v.tamano} />
              </span>
              <Button type="button" variant="ghost" size="icon" disabled={!hidratado} aria-label={`Editar ${v.placa}`} onClick={() => abrir(v)}>
                <PencilIcon />
              </Button>
            </li>
          ))}
        </ul>
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

      <ModalFormulario titulo={elegido ? `Editar ${elegido.placa}` : "Agregar vehículo"} abierto={abierto} alCambiar={setAbierto}>
        {/* La key: cada apertura empieza con el formulario limpio, con lo guardado y sin errores de la vez anterior */}
        <FormularioVehiculo key={aperturas} clienteId={clienteId} vehiculo={elegido ?? undefined} tamanos={tamanos} />
      </ModalFormulario>
    </section>
  );
}

function FormularioVehiculo({ clienteId, vehiculo, tamanos }: { clienteId: number; vehiculo?: VehiculoCliente; tamanos: Tamano[] }) {
  const alTerminar = useCerrarModal();
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
    <form ref={formulario} action={accion} className="flex flex-col gap-6" noValidate aria-label={vehiculo ? `Editar ${vehiculo.placa}` : "Agregar vehículo"}>
      <input type="hidden" name="clienteId" value={clienteId} />
      {vehiculo && <input type="hidden" name="id" value={vehiculo.id} />}
      <CamposVehiculo estado={estado} iniciales={iniciales} prefijo={prefijo} tamanos={opciones} plegar />
      <PieModal>
        <Button type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : vehiculo ? "Guardar vehículo" : "Agregar vehículo"}
        </Button>
        <CancelarModal />
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
      </PieModal>
    </form>
  );
}
