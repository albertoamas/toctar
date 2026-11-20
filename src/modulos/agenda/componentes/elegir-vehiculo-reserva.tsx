"use client";

import { useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { PlusIcon } from "lucide-react";
import { cn } from "cn";
import { useHidratado } from "@/componentes/hidratado";
import { CLASE_TARJETA_PARA_ELEGIR, TarjetasParaElegir } from "@/componentes/panel/tarjetas-para-elegir";
import { ModalFormulario } from "@/componentes/panel/modal-formulario";
import { FormularioVehiculo } from "@/modulos/clientes/componentes/vehiculos-cliente";
import type { CatalogoVehiculos } from "@/modulos/clientes/catalogo-vehiculos";
import type { Tamano } from "@/modulos/configuracion/consultas";

// El paso "Vehículo" de Nueva reserva (recorrido visual del 20/11, a pedido del dueño): siempre a la vista, también con
// un solo vehículo (antes se elegía solo y no se veía con qué auto se reservaba). Las mismas tarjetas apiladas de Nueva
// cotización: la placa y, debajo, sus datos y su tamaño. Tocar una pasa directo a los servicios. Al final, "Otro
// vehículo": abre el mismo "Agregar vehículo" de la ficha del cliente y, al guardarlo, aparece en la lista.

type VehiculoParaElegir = { id: number; placa: string; detalle: string; href: Route };

export function ElegirVehiculoReserva({
  clienteId,
  vehiculos,
  agregar,
}: {
  clienteId: number;
  vehiculos: VehiculoParaElegir[];
  /** Para "Otro vehículo": solo quien ve Clientes (registrar un vehículo es de ese módulo). */
  agregar: { tamanos: Tamano[]; catalogo: CatalogoVehiculos } | null;
}) {
  const router = useRouter();
  const hidratado = useHidratado();
  const [agregando, setAgregando] = useState(false);
  // Cada apertura empieza con el formulario limpio
  const [aperturas, setAperturas] = useState(0);
  return (
    <>
      <TarjetasParaElegir etiqueta="Elegir vehículo" tarjetas={vehiculos.map((v) => ({ clave: v.id, href: v.href, titulo: v.placa, esPlaca: true, detalle: v.detalle }))}>
        {agregar && (
          <li>
            <button
              type="button"
              disabled={!hidratado}
              onClick={() => {
                setAperturas((n) => n + 1);
                setAgregando(true);
              }}
              className={cn(CLASE_TARJETA_PARA_ELEGIR, "border-dashed border-input")}
            >
              <PlusIcon className="size-5 shrink-0 text-tinta-suave" aria-hidden />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-semibold">Otro vehículo</span>
                <span className="text-sm text-tinta-suave">Registrar uno nuevo</span>
              </span>
            </button>
          </li>
        )}
      </TarjetasParaElegir>
      {agregar && (
        <ModalFormulario
          titulo="Agregar vehículo"
          abierto={agregando}
          alCambiar={(abierto) => {
            setAgregando(abierto);
            // Al cerrarse (guardado o cancelado), la lista se vuelve a pedir: el vehículo nuevo aparece para elegirlo
            if (!abierto) router.refresh();
          }}
        >
          <FormularioVehiculo key={aperturas} clienteId={clienteId} tamanos={agregar.tamanos} catalogo={agregar.catalogo} />
        </ModalFormulario>
      )}
    </>
  );
}
