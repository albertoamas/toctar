"use client";

import { useActionState, useState } from "react";
import { CircleAlertIcon } from "lucide-react";
import { conAviso } from "@/componentes/panel/avisos";
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
import { Label } from "@/componentes/ui/label";
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
    <div className="flex flex-col gap-8">
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

  return (
    <section className="flex flex-col items-start gap-2">
      <h2 className="font-semibold">Contraseña</h2>
      <p className="text-sm text-tinta-suave">Si {nombre} la olvidó, ponle una nueva y pásasela.</p>
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogTrigger render={<Button variant="outline" />}>Restablecer contraseña</DialogTrigger>
        <DialogContent>
          <form action={accion} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Nueva contraseña para {nombre}</DialogTitle>
              <DialogDescription>La anterior deja de funcionar y se cierran sus sesiones abiertas.</DialogDescription>
            </DialogHeader>
            <input type="hidden" name="id" value={id} />
            <div className="flex flex-col gap-2">
              <Label htmlFor="nueva-contrasena">Contraseña nueva</Label>
              <Input id="nueva-contrasena" name="contrasena" type="text" autoComplete="new-password" aria-invalid={!!error} aria-describedby={error ? "nueva-contrasena-error" : undefined} />
              {error && (
                <p id="nueva-contrasena-error" className="flex items-center gap-1 text-sm font-semibold text-rojo-texto">
                  <CircleAlertIcon className="size-4 shrink-0" aria-hidden />
                  {error}
                </p>
              )}
            </div>
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

  return (
    <section className="flex flex-col items-start gap-2">
      <h2 className="font-semibold">Acceso</h2>
      {esUnoMismo ? (
        <p className="text-sm text-tinta-suave">No puedes desactivar tu propio usuario. Si hace falta, pídeselo a otro dueño.</p>
      ) : confirmando ? (
        <form action={accion} className="flex flex-col items-start gap-3 rounded-sm border border-border bg-superficie p-4">
          <input type="hidden" name="id" value={id} />
          <p>{nombre} no podrá ingresar y se cerrarán sus sesiones abiertas. Su historial se conserva.</p>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="destructive" disabled={enviando}>{enviando ? "Desactivando…" : "Sí, desactivar"}</Button>
            <Button type="button" variant="outline" onClick={() => setConfirmando(false)}>Cancelar</Button>
          </div>
        </form>
      ) : (
        <>
          <p className="text-sm text-tinta-suave">Desactívalo si deja de trabajar en el taller. No se borra nada.</p>
          <Button variant="outline" onClick={() => setConfirmando(true)}>Desactivar usuario</Button>
        </>
      )}
    </section>
  );
}

function Reactivar({ id, nombre }: { id: number; nombre: string }) {
  const [, accion, enviando] = useActionState<EstadoFormulario, FormData>(conAviso(reactivarUsuario), {});
  return (
    <section className="flex flex-col items-start gap-2">
      <h2 className="font-semibold">Acceso</h2>
      <p className="text-sm text-tinta-suave">{nombre} está desactivado y no puede ingresar.</p>
      <form action={accion}>
        <input type="hidden" name="id" value={id} />
        <Button type="submit" disabled={enviando}>{enviando ? "Reactivando…" : "Reactivar usuario"}</Button>
      </form>
    </section>
  );
}
