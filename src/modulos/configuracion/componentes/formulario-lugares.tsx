"use client";

import { Campo } from "@/componentes/panel/campo";
import { useFormularioEnModal } from "@/componentes/panel/modal-contexto";
import { PieGuardar } from "@/componentes/panel/modal-pie";
import { Input } from "@/componentes/ui/input";
import { ANCHO_DATO } from "@/componentes/panel/anchos";
import { guardarLugares } from "../acciones";

// Pedido 55: cuántos autos entran a la vez en el taller (RN-06). En el modal de "Editar" de Configuración → Taller.

export function FormularioLugares({ lugares }: { lugares: number }) {
  const { accion, enviando, formulario, e, v } = useFormularioEnModal(guardarLugares);
  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-5" noValidate>
      <Campo id="lugares" etiqueta="Lugares en el taller" error={e.lugares} ayuda="Cuántos autos entran a la vez. La agenda no deja reservar un día lleno.">
        <Input id="lugares" name="lugares" inputMode="numeric" autoComplete="off" defaultValue={v?.lugares ?? String(lugares)} aria-invalid={!!e.lugares} className={ANCHO_DATO.cantidad} />
      </Campo>
      <PieGuardar texto="Guardar lugares" enviando={enviando} />
    </form>
  );
}
