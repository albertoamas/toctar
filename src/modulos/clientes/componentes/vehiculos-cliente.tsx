"use client";

import { useActionState, useRef, useState } from "react";
import type { Route } from "next";
import { PlusIcon } from "lucide-react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { useHidratado } from "@/componentes/hidratado";
import { conAviso } from "@/componentes/panel/avisos";
import { useCerrarModal } from "@/componentes/panel/modal-contexto";
import { ModalFormulario } from "@/componentes/panel/modal-formulario";
import { CancelarModal, PieModal } from "@/componentes/panel/modal-pie";
import { Seccion } from "@/componentes/panel/cabecera-seccion";
import { ListaFilas } from "@/componentes/panel/fila-lista";
import { Button } from "@/componentes/ui/button";
import type { Tamano } from "@/modulos/configuracion/consultas";
import { conDesde } from "@/lib/volver";
import { guardarVehiculo, type EstadoCliente } from "../acciones";
import type { VehiculoCliente } from "../consultas";
import { detalleVehiculo, prefijoVehiculo, rutaVehiculo } from "../reglas";
import { CamposVehiculo } from "./campos";
import type { CatalogoVehiculos } from "@/modulos/clientes/catalogo-vehiculos";

// HU-23: los vehículos de un cliente, en su ficha. Desde el pedido 51, cada uno es una fila de un toque que abre SU ficha
// (`/panel/clientes/{id}/vehiculos/{vehiculo}`), con sus datos, su historial y "Editar", "Cambiar de dueño" y
// "Desactivar": antes, "Editar" abría un modal en la fila y el historial del auto quedaba mezclado con el de sus otros
// autos. "Agregar" sigue aquí, en un modal (pulido 8.3). Nada se borra (RN-14): los desactivados, aparte, también abren
// su ficha (ahí se reactivan). Al agregar una placa que es de otro cliente, el enlace para pasarla a este (pedido 37).

type Props = {
  clienteId: number;
  vehiculos: VehiculoCliente[];
  tamanos: Tamano[];
  /** Las marcas y los modelos ya registrados, para escribir menos (pedido 52). */
  catalogo: CatalogoVehiculos;
  /** La ficha del cliente: "Volver" desde la del vehículo lleva ahí (pedido 43). */
  desde: string;
};

export function VehiculosCliente({ clienteId, vehiculos, tamanos, catalogo, desde }: Props) {
  const hidratado = useHidratado();
  const [agregando, setAgregando] = useState(false);
  // Cada apertura empieza con el formulario limpio, sin los errores de la vez anterior
  const [aperturas, setAperturas] = useState(0);
  const activos = vehiculos.filter((v) => v.activo);
  const inactivos = vehiculos.filter((v) => !v.activo);
  const fila = (v: VehiculoCliente) => {
    const detalle = detalleVehiculo(v);
    return {
      href: conDesde(rutaVehiculo(clienteId, v.id), desde),
      titulo: v.placa,
      tituloGrande: true,
      detalles: [...(detalle.length > 0 ? [detalle.join(" ")] : []), `Tamaño: ${v.tamano}`],
    };
  };

  return (
    <Seccion
      id="vehiculos" titulo="Vehículos"
      sinRelleno
      accion={
        <>
          <Button
            type="button"
            variant="ghost"
            disabled={!hidratado}
            onClick={() => {
              setAperturas((n) => n + 1);
              setAgregando(true);
            }}
          >
            <PlusIcon />
            Agregar vehículo
          </Button>
        </>
      }
    >
      {activos.length === 0 ? <p className="tt-tarjeta-panel p-4 text-tinta-suave">Todavía no tiene vehículos.</p> : <ListaFilas etiqueta="Vehículos" filas={activos.map(fila)} />}

      {inactivos.length > 0 && (
        <div className="flex flex-col border-t border-border pt-3">
          <p className="px-4 pb-1 text-sm font-semibold text-tinta-suave">Desactivados</p>
          <ListaFilas etiqueta="Vehículos desactivados" filas={inactivos.map((v) => ({ ...fila(v), atenuada: true, estado: "Desactivado" }))} />
        </div>
      )}

      <ModalFormulario titulo="Agregar vehículo" abierto={agregando} alCambiar={setAgregando}>
        <FormularioVehiculo key={aperturas} clienteId={clienteId} tamanos={tamanos} catalogo={catalogo} />
      </ModalFormulario>
    </Seccion>
  );
}

/**
 * Agregar un vehículo (en la ficha del cliente) o editarlo (en la suya, pedido 51), en un modal: placa y tamaño a la vista
 * y lo demás plegado, como en el alta. Lo poco usado (cambiar de dueño, desactivar) va en "Más" de su ficha.
 */
export function FormularioVehiculo({ clienteId, vehiculo, tamanos, catalogo }: { clienteId: number; vehiculo?: VehiculoCliente; tamanos: Tamano[]; catalogo: CatalogoVehiculos }) {
  const alTerminar = useCerrarModal();
  const [estado, accion, enviando] = useActionState<EstadoCliente, FormData>(
    conAviso(guardarVehiculo, (r) => r.ok && alTerminar()),
    {},
  );
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
      <CamposVehiculo
        estado={estado}
        iniciales={iniciales}
        prefijo={prefijo}
        tamanos={opciones}
        catalogo={catalogo}
        plegar
        // Al agregar una placa que es de otro cliente: el auto cambió de dueño y se pasa a este (pedido 37)
        // (si la placa ya es de este mismo cliente, no hay a quién pasarla)
        cambioDeDueno={vehiculo ? undefined : (e) => (e.id === clienteId ? null : (`/panel/clientes/${e.id}/vehiculos/${e.vehiculoId}/dueno?nuevo=${clienteId}&desde=comprador` as Route))}
      />
      <PieModal>
        <Button type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : vehiculo ? "Guardar vehículo" : "Agregar vehículo"}
        </Button>
        <CancelarModal />
      </PieModal>
    </form>
  );
}
