"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { ChevronRightIcon, PlusIcon } from "lucide-react";
import { cn } from "cn";
import { useHidratado } from "@/componentes/hidratado";
import { ModalFormulario } from "@/componentes/panel/modal-formulario";
import { FormularioVehiculo } from "@/modulos/clientes/componentes/vehiculos-cliente";
import type { CatalogoVehiculos } from "@/modulos/clientes/catalogo-vehiculos";
import type { Tamano } from "@/modulos/configuracion/consultas";

// El paso "Vehículo" de Nueva reserva (recorrido visual del 20/11, a pedido del dueño): siempre a la vista, también con
// un solo vehículo (antes se elegía solo y no se veía con qué auto se reservaba). Las mismas tarjetas apiladas de Nueva
// cotización: la placa y, debajo, sus datos y su tamaño. Tocar una pasa directo a los servicios. Al final, "Otro
// vehículo": abre el mismo "Agregar vehículo" de la ficha del cliente y, al guardarlo, aparece en la lista.

type VehiculoParaElegir = { id: number; placa: string; detalle: string; href: Route };

const TARJETA = "flex min-h-16 items-center gap-3 rounded-lg border border-border bg-fondo px-4 py-3 text-left transition-colors hover:border-tinta-suave/60 hover:bg-superficie/50";

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
      <ul aria-label="Elegir vehículo" className="flex flex-col gap-2 p-4 sm:p-5">
        {vehiculos.map((v) => (
          <li key={v.id}>
            <Link href={v.href} className={TARJETA}>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="tt-placa text-base">{v.placa}</span>
                <span className="text-sm text-tinta-suave">{v.detalle}</span>
              </span>
              <ChevronRightIcon className="size-5 shrink-0 text-tinta-suave" aria-hidden />
            </Link>
          </li>
        ))}
        {agregar && (
          <li>
            <button
              type="button"
              disabled={!hidratado}
              onClick={() => {
                setAperturas((n) => n + 1);
                setAgregando(true);
              }}
              className={cn(TARJETA, "w-full border-dashed border-input")}
            >
              <PlusIcon className="size-5 shrink-0 text-tinta-suave" aria-hidden />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-semibold">Otro vehículo</span>
                <span className="text-sm text-tinta-suave">Registrar uno nuevo</span>
              </span>
            </button>
          </li>
        )}
      </ul>
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
