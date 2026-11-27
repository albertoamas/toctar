"use client";

import { useState, useTransition } from "react";
import type { Route } from "next";
import { useHidratado } from "@/componentes/hidratado";
import { avisarResultado } from "@/componentes/panel/avisos";
import { MenuMas } from "@/componentes/panel/menu-mas";
import { useCerrarModal } from "@/componentes/panel/modal-contexto";
import { ModalFormulario } from "@/componentes/panel/modal-formulario";
import { CancelarModal, PieModal } from "@/componentes/panel/modal-pie";
import { Button } from "@/componentes/ui/button";
import { cambiarEstadoVehiculo } from "../acciones";

// "Más" de la ficha de un vehículo (pedido 51): cambiarlo de dueño (P37) y desactivarlo, que antes iban en "Más" dentro
// del modal de edición. Desactivar pide confirmación, con lo que pasa (skill pantallas-panel: lo que no se deshace a la
// vista). Inactivo, "Reactivar vehículo" es la acción principal, como en la ficha de un cliente o un servicio.

type Props = {
  clienteId: number;
  vehiculoId: number;
  placa: string;
  activo: boolean;
  cambiarDueno: Route;
  /** El formulario para editarlo (26/11: antes, "Editar" de una tarjeta "Datos" que repetía el subtítulo). */
  editar: React.ReactNode;
};

export function MasVehiculo({ clienteId, vehiculoId, placa, activo, cambiarDueno, editar }: Props) {
  const hidratado = useHidratado();
  const [reactivando, iniciar] = useTransition();
  const [desactivando, setDesactivando] = useState(false);
  const [editando, setEditando] = useState(false);
  if (!activo) {
    return (
      <Button
        type="button"
        disabled={!hidratado || reactivando}
        onClick={() => iniciar(async () => avisarResultado(await cambiarEstadoVehiculo({ clienteId, id: vehiculoId, activo: true })))}
      >
        {reactivando ? "Reactivando…" : "Reactivar vehículo"}
      </Button>
    );
  }
  return (
    <>
      <MenuMas
        acciones={[
          { texto: "Editar vehículo", alElegir: () => setEditando(true) },
          { texto: "Cambiar de dueño", href: cambiarDueno, mismaPestana: true },
          { texto: "Desactivar vehículo", alElegir: () => setDesactivando(true) },
        ]}
      />
      <ModalFormulario titulo={`Editar ${placa}`} abierto={editando} alCambiar={setEditando}>
        {editar}
      </ModalFormulario>
      <ModalFormulario titulo={`¿Desactivar ${placa}?`} abierto={desactivando} alCambiar={setDesactivando}>
        <Desactivar clienteId={clienteId} vehiculoId={vehiculoId} />
      </ModalFormulario>
    </>
  );
}

function Desactivar({ clienteId, vehiculoId }: { clienteId: number; vehiculoId: number }) {
  const cerrar = useCerrarModal();
  const [enviando, iniciar] = useTransition();
  return (
    <div className="flex flex-col gap-5">
      <p>Ya no se ofrece para reservar ni cotizar, y no se avisa su mantenimiento. No se borra nada: su historial se conserva y se puede reactivar.</p>
      <PieModal>
        <Button
          type="button"
          variant="destructive"
          disabled={enviando}
          onClick={() =>
            iniciar(async () => {
              const r = await cambiarEstadoVehiculo({ clienteId, id: vehiculoId, activo: false });
              avisarResultado(r);
              if (r.ok) cerrar();
            })
          }
        >
          {enviando ? "Desactivando…" : "Sí, desactivar"}
        </Button>
        {/* El foco en "Cancelar": un Enter no lo desactiva. Mientras se desactiva, el modal no se cierra */}
        <CancelarModal focoInicial enviando={enviando} />
      </PieModal>
    </div>
  );
}
