"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { conAviso } from "@/componentes/panel/avisos";
import { Campo } from "@/componentes/panel/campo";
import { Button } from "@/componentes/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/componentes/ui/dialog";
import { Input } from "@/componentes/ui/input";
import type { EstadoFormulario } from "@/lib/formularios";
import { desactivarUsuario, reactivarUsuario, restablecerContrasena } from "../acciones";

type Props = {
  id: number;
  nombre: string;
  desactivado: boolean;
  /** El dueño mirando su propio usuario: Better Auth no permite desactivarse a uno mismo. */
  esUnoMismo: boolean;
};


export function AccesoUsuario({ id, nombre, desactivado, esUnoMismo }: Props) {
  return (
    // En el celular y la tableta, una línea la separa del formulario: "Guardar cambios" no guarda esto (pulido 5.5)
    <div className="flex flex-col gap-8 border-t border-border pt-8 lg:border-0 lg:pt-0">
      <RestablecerContrasena id={id} nombre={nombre} />
      {desactivado ? <Reactivar id={id} nombre={nombre} /> : <Desactivar id={id} nombre={nombre} esUnoMismo={esUnoMismo} />}
    </div>
  );
}

function RestablecerContrasena({ id, nombre }: { id: number; nombre: string }) {
  const [abierto, setAbierto] = useState(false);
  // El diálogo se cierra desde la acción misma cuando el cambio salió bien.
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(
    conAviso(restablecerContrasena, (r) => r.ok && setAbierto(false)),
    {},
  );
  const error = estado.errores?.contrasena;
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);

  return (
    <section className="flex flex-col items-start gap-2">
      <h2 className="font-heading text-xl font-bold italic">Contraseña</h2>
      <p className="text-sm text-tinta-suave">Si {nombre} la olvidó, ponle una nueva y pásasela.</p>
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogTrigger render={<Button variant="outline" />}>Restablecer contraseña</DialogTrigger>
        <DialogContent>
          <form ref={formulario} action={accion} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Nueva contraseña para {nombre}</DialogTitle>
              <DialogDescription>La anterior deja de funcionar y se cierran sus sesiones abiertas.</DialogDescription>
            </DialogHeader>
            <input type="hidden" name="id" value={id} />
            <Campo id="nueva-contrasena" etiqueta="Contraseña nueva" error={error}>
              <Input id="nueva-contrasena" name="contrasena" type="text" autoComplete="new-password" aria-invalid={!!error} aria-describedby={error ? "nueva-contrasena-error" : undefined} />
            </Campo>
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
              <Button type="submit" disabled={enviando}>{enviando ? "Guardando…" : "Guardar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function Desactivar({ id, nombre, esUnoMismo }: { id: number; nombre: string; esUnoMismo: boolean }) {
  const [confirmando, setConfirmando] = useState(false);
  const [, accion, enviando] = useActionState<EstadoFormulario, FormData>(conAviso(desactivarUsuario), {});
  // El botón que se tocó desaparece: el foco va a la confirmación al abrirla y vuelve a "Desactivar usuario" al cancelar (pulido 5.5)
  const aviso = useRef<HTMLParagraphElement>(null);
  const desactivar = useRef<HTMLButtonElement>(null);
  const tocado = useRef(false);
  useEffect(() => {
    if (tocado.current) (confirmando ? aviso.current : desactivar.current)?.focus();
  }, [confirmando]);
  const cambiar = (valor: boolean) => {
    tocado.current = true;
    setConfirmando(valor);
  };

  return (
    <section className="flex flex-col items-start gap-2">
      <h2 className="font-heading text-xl font-bold italic">Acceso</h2>
      {esUnoMismo ? (
        <p className="text-sm text-tinta-suave">No puedes desactivar tu propio usuario. Si hace falta, pídeselo a otro dueño.</p>
      ) : confirmando ? (
        <form action={accion} className="flex flex-col items-start gap-3 rounded-sm border border-border bg-superficie p-4">
          <input type="hidden" name="id" value={id} />
          <p ref={aviso} tabIndex={-1} className="outline-none">{nombre} no podrá ingresar y se cerrarán sus sesiones abiertas. Su historial se conserva.</p>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="destructive" disabled={enviando}>{enviando ? "Desactivando…" : "Sí, desactivar"}</Button>
            <Button type="button" variant="outline" onClick={() => cambiar(false)}>Cancelar</Button>
          </div>
        </form>
      ) : (
        <>
          <p className="text-sm text-tinta-suave">Desactívalo si deja de trabajar en el taller. No se borra nada.</p>
          <Button ref={desactivar} variant="outline" onClick={() => cambiar(true)}>Desactivar usuario</Button>
        </>
      )}
    </section>
  );
}

function Reactivar({ id, nombre }: { id: number; nombre: string }) {
  const [, accion, enviando] = useActionState<EstadoFormulario, FormData>(conAviso(reactivarUsuario), {});
  return (
    <section className="flex flex-col items-start gap-2">
      <h2 className="font-heading text-xl font-bold italic">Acceso</h2>
      <p className="text-sm text-tinta-suave">{nombre} está desactivado y no puede ingresar.</p>
      <form action={accion}>
        <input type="hidden" name="id" value={id} />
        <Button type="submit" disabled={enviando}>{enviando ? "Reactivando…" : "Reactivar usuario"}</Button>
      </form>
    </section>
  );
}
