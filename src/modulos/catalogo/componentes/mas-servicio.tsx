"use client";

import { useActionState, useState } from "react";
import type { Route } from "next";
import { useHidratado } from "@/componentes/hidratado";
import { conAviso } from "@/componentes/panel/avisos";
import { MenuMas } from "@/componentes/panel/menu-mas";
import { useFormularioEnModal } from "@/componentes/panel/modal-contexto";
import { ModalFormulario } from "@/componentes/panel/modal-formulario";
import { CancelarModal, PieModal } from "@/componentes/panel/modal-pie";
import { Button } from "@/componentes/ui/button";
import type { EstadoFormulario } from "@/lib/formularios";
import { desactivarServicio, reactivarServicio } from "../acciones";

// "Más" de la ficha de un servicio del catálogo (hallazgo 1 de la prueba en celulares, 15/11): su página en el sitio y
// "Desactivar servicio", con confirmación. Antes era la casilla "Activo en el catálogo" dentro de los datos, y se
// confundía con "Mostrar en el sitio" (Sitio web): la confirmación dice qué hace. Inactivo, "Reactivar servicio" es la
// acción principal, como en la ficha de un usuario.

export function MasServicio({ id, nombre, activo, hrefSitio }: { id: number; nombre: string; activo: boolean; hrefSitio: Route }) {
  const [desactivando, setDesactivando] = useState(false);
  return (
    <div className="flex flex-wrap gap-2">
      {!activo && <Reactivar id={id} />}
      <MenuMas
        acciones={[
          { texto: "Su página en el sitio", href: hrefSitio, mismaPestana: true },
          ...(activo ? [{ texto: "Desactivar servicio", alElegir: () => setDesactivando(true) }] : []),
        ]}
      />
      <ModalFormulario titulo={`¿Desactivar ${nombre}?`} abierto={desactivando} alCambiar={setDesactivando}>
        <Desactivar id={id} />
      </ModalFormulario>
    </div>
  );
}

function Desactivar({ id }: { id: number }) {
  const { accion, formulario, enviando } = useFormularioEnModal(desactivarServicio);
  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-5">
      <input type="hidden" name="id" value={id} />
      <p>Ya no se ofrece: no se cotiza, no se reserva y no sale en el sitio. No se borra nada: sus precios y lo ya hecho se conservan, y se puede reactivar.</p>
      <PieModal>
        <Button type="submit" variant="destructive" disabled={enviando}>
          {enviando ? "Desactivando…" : "Sí, desactivar"}
        </Button>
        {/* El foco en "Cancelar": un Enter no lo desactiva. Mientras se desactiva, el modal no se cierra */}
        <CancelarModal focoInicial enviando={enviando} />
      </PieModal>
    </form>
  );
}

const reactivarConAviso = conAviso(reactivarServicio);

/** Un formulario con su botón, sin modal: reactivar no pierde nada. */
function Reactivar({ id }: { id: number }) {
  const hidratado = useHidratado();
  const [, accion, enviando] = useActionState<EstadoFormulario, FormData>(reactivarConAviso, {});
  return (
    <form action={accion}>
      <input type="hidden" name="id" value={id} />
      <Button type="submit" disabled={enviando || !hidratado}>
        {enviando ? "Reactivando…" : "Reactivar servicio"}
      </Button>
    </form>
  );
}
