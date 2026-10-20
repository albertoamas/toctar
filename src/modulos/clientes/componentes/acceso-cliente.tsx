"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { conAviso } from "@/componentes/panel/avisos";
import { Button } from "@/componentes/ui/button";
import type { EstadoFormulario } from "@/lib/formularios";
import { cambiarEstadoCliente } from "../acciones";

// HU-23: desactivar o reactivar un cliente. No se borra: su historial se conserva (RN-14).
// Como en Editar usuario (pulido 5.5): el foco va a la confirmación al abrirla y vuelve al botón al cancelar.

const cambiarConAviso = conAviso(cambiarEstadoCliente);

export function AccesoCliente({ id, nombre, activo }: { id: number; nombre: string; activo: boolean }) {
  const [confirmando, setConfirmando] = useState(false);
  const [, accion, enviando] = useActionState<EstadoFormulario, FormData>(cambiarConAviso, {});
  const aviso = useRef<HTMLParagraphElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const tocado = useRef(false);
  useEffect(() => {
    if (tocado.current) (confirmando ? aviso.current : boton.current)?.focus();
  }, [confirmando]);
  const cambiar = (valor: boolean) => {
    tocado.current = true;
    setConfirmando(valor);
  };

  return (
    // En el celular y la tableta, una línea la separa: "Guardar cambios" no guarda esto
    <section aria-labelledby="acceso-titulo" className="flex flex-col items-start gap-2 border-t border-border pt-8 lg:border-0 lg:pt-0">
      <h2 id="acceso-titulo" className="font-heading text-xl font-bold italic">
        {activo ? "Desactivar" : "Reactivar"}
      </h2>
      {!activo ? (
        <>
          <p className="text-sm text-tinta-suave">{nombre} está desactivado: no sale en la lista ni en las búsquedas.</p>
          <form action={accion}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="activo" value="true" />
            <Button type="submit" disabled={enviando}>{enviando ? "Reactivando…" : "Reactivar cliente"}</Button>
          </form>
        </>
      ) : confirmando ? (
        <form action={accion} className="flex flex-col items-start gap-3 rounded-sm border border-border bg-superficie p-4">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="activo" value="false" />
          <p ref={aviso} tabIndex={-1} className="outline-none">
            {nombre} deja de salir en la lista y en las búsquedas. Sus vehículos e historial se conservan.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="destructive" disabled={enviando}>{enviando ? "Desactivando…" : "Sí, desactivar"}</Button>
            <Button type="button" variant="outline" onClick={() => cambiar(false)}>Cancelar</Button>
          </div>
        </form>
      ) : (
        <>
          <p className="text-sm text-tinta-suave">Si ya no es cliente del taller. No se borra nada.</p>
          <Button ref={boton} variant="outline" onClick={() => cambiar(true)}>Desactivar cliente</Button>
        </>
      )}
    </section>
  );
}
