"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useHidratado } from "@/componentes/hidratado";
import { conAviso } from "@/componentes/panel/avisos";
import { Campo } from "@/componentes/panel/campo";
import { MenuMas, type AccionMas } from "@/componentes/panel/menu-mas";
import { CancelarModal, ModalFormulario, PieGuardar, PieModal, useFormularioEnModal } from "@/componentes/panel/modal-formulario";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import type { EstadoFormulario } from "@/lib/formularios";
import type { Permiso } from "@/lib/permisos";
import type { Rol } from "@/lib/roles";
import { desactivarUsuario, guardarDatosUsuario, guardarRolUsuario, reactivarUsuario, restablecerContrasena } from "../acciones";
import { CamposRolPermisos } from "./campos-rol-permisos";

// HU-02 y HU-03: la ficha de un usuario (C6, fase 4). Cada parte se edita en su modal y se guarda sola (guardarDatosUsuario,
// guardarRolUsuario): un cambio de nombre no devuelve el rol o los permisos que otro dueño acaba de cambiar. Lo poco usado
// (restablecer la contraseña, desactivar) va en "Más", cada cosa con su modal.

type Usuario = { id: number; nombre: string; usuario: string; rol: Rol; permisos: Permiso[] };

export function FormularioDatosUsuario({ usuario }: { usuario: Usuario }) {
  const { accion, enviando, formulario, e, v } = useFormularioEnModal(guardarDatosUsuario);
  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="id" value={usuario.id} />
      <Campo id="nombre" etiqueta="Nombre" error={e.nombre}>
        <Input id="nombre" name="nombre" autoComplete="off" defaultValue={v?.nombre ?? usuario.nombre} aria-invalid={!!e.nombre} aria-describedby={e.nombre ? "nombre-error" : undefined} />
      </Campo>
      <p className="text-sm text-tinta-suave">El usuario ({usuario.usuario}) no se cambia: es con lo que la persona ingresa.</p>
      <PieGuardar texto="Guardar datos" enviando={enviando} />
    </form>
  );
}

export function FormularioRolPermisos({ usuario, asignables }: { usuario: Usuario; asignables: { permiso: Permiso; nombre: string }[] }) {
  const { accion, enviando, formulario, e, v } = useFormularioEnModal(guardarRolUsuario);
  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="id" value={usuario.id} />
      <CamposRolPermisos asignables={asignables} rolInicial={(v?.rol as Rol) || usuario.rol} permisosIniciales={usuario.permisos} error={e.rol} />
      <PieGuardar texto="Guardar rol y permisos" enviando={enviando} />
    </form>
  );
}

/** "Más" del encabezado: restablecer la contraseña y desactivar. Desactivado, "Reactivar usuario" es la acción principal. */
export function MasUsuario({ id, nombre, desactivado, esUnoMismo }: { id: number; nombre: string; desactivado: boolean; esUnoMismo: boolean }) {
  const [abierto, setAbierto] = useState<"contrasena" | "desactivar" | null>(null);
  const cambiar = (abrir: boolean) => !abrir && setAbierto(null);
  const acciones: AccionMas[] = [{ texto: "Restablecer contraseña", alElegir: () => setAbierto("contrasena") }];
  // Better Auth no permite desactivarse a uno mismo: a uno mismo no se le ofrece
  if (!desactivado && !esUnoMismo) acciones.push({ texto: "Desactivar usuario", alElegir: () => setAbierto("desactivar") });
  return (
    <div className="flex flex-wrap gap-2">
      {desactivado && <Reactivar id={id} />}
      <MenuMas acciones={acciones} />
      <ModalFormulario titulo={`Nueva contraseña para ${nombre}`} abierto={abierto === "contrasena"} alCambiar={cambiar}>
        <RestablecerContrasena id={id} />
      </ModalFormulario>
      <ModalFormulario titulo={`¿Desactivar a ${nombre}?`} abierto={abierto === "desactivar"} alCambiar={cambiar}>
        <Desactivar id={id} nombre={nombre} />
      </ModalFormulario>
    </div>
  );
}

function RestablecerContrasena({ id }: { id: number }) {
  const { accion, enviando, formulario, e } = useFormularioEnModal(restablecerContrasena);
  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="id" value={id} />
      <p className="text-sm text-tinta-suave">La anterior deja de funcionar y se cierran sus sesiones abiertas. Pásale la nueva.</p>
      <Campo id="nueva-contrasena" etiqueta="Contraseña nueva" error={e.contrasena}>
        <Input id="nueva-contrasena" name="contrasena" type="text" autoComplete="new-password" aria-invalid={!!e.contrasena} aria-describedby={e.contrasena ? "nueva-contrasena-error" : undefined} />
      </Campo>
      <PieGuardar texto="Guardar contraseña" enviando={enviando} />
    </form>
  );
}

function Desactivar({ id, nombre }: { id: number; nombre: string }) {
  const { accion, formulario } = useFormularioEnModal(desactivarUsuario);
  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-5">
      <input type="hidden" name="id" value={id} />
      <p>{nombre} no podrá ingresar y se cerrarán sus sesiones abiertas. Su historial se conserva y se puede reactivar.</p>
      <PieModal>
        <BotonEnviar texto="Sí, desactivar" enviando="Desactivando…" variante="destructive" />
        {/* El foco en "Cancelar": un Enter no lo desactiva */}
        <CancelarModal focoInicial />
      </PieModal>
    </form>
  );
}

const reactivarConAviso = conAviso(reactivarUsuario);

/** Como "Reactivar cliente" (acceso-cliente.tsx): un formulario con su botón, sin modal. */
function Reactivar({ id }: { id: number }) {
  const hidratado = useHidratado();
  const [, accion, enviando] = useActionState<EstadoFormulario, FormData>(reactivarConAviso, {});
  return (
    <form action={accion}>
      <input type="hidden" name="id" value={id} />
      <Button type="submit" disabled={enviando || !hidratado}>
        {enviando ? "Reactivando…" : "Reactivar usuario"}
      </Button>
    </form>
  );
}

function BotonEnviar({ texto, enviando, variante = "default" }: { texto: string; enviando: string; variante?: "default" | "destructive" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variante} disabled={pending}>
      {pending ? enviando : texto}
    </Button>
  );
}
