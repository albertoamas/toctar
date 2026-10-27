"use client";

import { useActionState, useState } from "react";
import { conAviso } from "@/componentes/panel/avisos";
import { MenuMas } from "@/componentes/panel/menu-mas";
import { CancelarModal, ModalFormulario, PieModal, useCerrarModal } from "@/componentes/panel/modal-formulario";
import { Button } from "@/componentes/ui/button";
import type { EstadoFormulario } from "@/lib/formularios";
import { cambiarEstadoCliente } from "../acciones";

// HU-23: desactivar o reactivar un cliente. No se borra: su historial se conserva (RN-14). Pulido 8.3: desactivar se
// usa casi nunca y va en el menú "Más" del encabezado, con su confirmación en un modal (el foco en "Cancelar"); un
// cliente desactivado tiene "Reactivar cliente" como acción del encabezado.

export function MasCliente({ id, nombre }: { id: number; nombre: string }) {
  const [confirmando, setConfirmando] = useState(false);
  return (
    <>
      <MenuMas acciones={[{ texto: "Desactivar cliente", alElegir: () => setConfirmando(true) }]} />
      <ModalFormulario titulo="Desactivar cliente" abierto={confirmando} alCambiar={setConfirmando}>
        <ConfirmarDesactivar id={id} nombre={nombre} />
      </ModalFormulario>
    </>
  );
}

function ConfirmarDesactivar({ id, nombre }: { id: number; nombre: string }) {
  const cerrar = useCerrarModal();
  const [, accion, enviando] = useActionState<EstadoFormulario, FormData>(
    conAviso(cambiarEstadoCliente, (r) => r.ok && cerrar()),
    {},
  );
  return (
    <form action={accion} className="flex flex-col gap-6">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="activo" value="false" />
      <p>{nombre} deja de salir en la lista y en las búsquedas. Sus vehículos e historial se conservan.</p>
      <PieModal>
        <Button type="submit" variant="destructive" disabled={enviando}>
          {enviando ? "Desactivando…" : "Sí, desactivar"}
        </Button>
        <CancelarModal focoInicial />
      </PieModal>
    </form>
  );
}

const reactivarConAviso = conAviso(cambiarEstadoCliente);

export function ReactivarCliente({ id }: { id: number }) {
  const [, accion, enviando] = useActionState<EstadoFormulario, FormData>(reactivarConAviso, {});
  return (
    <form action={accion}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="activo" value="true" />
      <Button type="submit" disabled={enviando}>
        {enviando ? "Reactivando…" : "Reactivar cliente"}
      </Button>
    </form>
  );
}
