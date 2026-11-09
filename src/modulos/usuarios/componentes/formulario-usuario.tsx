"use client";

import { useActionState, useRef, useState } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { conAviso } from "@/componentes/panel/avisos";
import { Campo } from "@/componentes/panel/campo";
import { BarraGuardar } from "@/componentes/panel/cambios-sin-guardar";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import type { EstadoFormulario } from "@/lib/formularios";
import { PERFILES, type Permiso } from "@/lib/permisos";
import type { Rol } from "@/lib/roles";
import { crearUsuario } from "../acciones";
import { CamposRolPermisos } from "./campos-rol-permisos";

// HU-02: crear un usuario. Un formulario largo, con su botón al pie que queda fijo abajo con cambios (BarraGuardar). La
// ficha de un usuario se edita por partes, en modales (ficha-usuario.tsx, C6).

const crearConAviso = conAviso(crearUsuario);

export function FormularioUsuario({ asignables }: { asignables: { permiso: Permiso; nombre: string }[] }) {
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(crearConAviso, {});
  const valores = estado.valores;
  const [verContrasena, setVerContrasena] = useState(false);
  const e = estado.errores ?? {};
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);

  return (
    <form ref={formulario} action={accion} className="tt-formulario-panel flex flex-col gap-6" noValidate>
      <Campo id="nombre" etiqueta="Nombre" error={e.nombre}>
        <Input id="nombre" name="nombre" autoComplete="off" defaultValue={valores?.nombre} aria-invalid={!!e.nombre} aria-describedby={e.nombre ? "nombre-error" : undefined} />
      </Campo>
      <Campo id="usuario" etiqueta="Usuario" error={e.usuario} ayuda="Con esto ingresa. En minúsculas, sin espacios ni tildes.">
        <Input id="usuario" name="usuario" autoComplete="off" autoCapitalize="none" spellCheck={false} defaultValue={valores?.usuario} aria-invalid={!!e.usuario} aria-describedby={e.usuario ? "usuario-error" : "usuario-ayuda"} />
      </Campo>
      <Campo id="contrasena" etiqueta="Contraseña inicial" error={e.contrasena} ayuda="Al menos 8 caracteres. Pásasela a la persona en mano o por WhatsApp.">
        <div className="flex gap-2">
          <Input id="contrasena" name="contrasena" type={verContrasena ? "text" : "password"} autoComplete="new-password" aria-invalid={!!e.contrasena} aria-describedby={e.contrasena ? "contrasena-error" : "contrasena-ayuda"} />
          <Button type="button" variant="outline" size="icon" onClick={() => setVerContrasena((v) => !v)} aria-label={verContrasena ? "Ocultar contraseña" : "Mostrar contraseña"}>
            {verContrasena ? <EyeOffIcon /> : <EyeIcon />}
          </Button>
        </div>
      </Campo>
      {/* Un encargado nuevo empieza con el perfil Taller, el más común (pedido 32: los que reciben y trabajan los vehículos) */}
      <CamposRolPermisos asignables={asignables} rolInicial={(valores?.rol as Rol) || "encargado"} permisosIniciales={PERFILES[0].permisos} error={e.rol} />
      <BarraGuardar formulario={formulario} estado={estado} texto="Crear usuario" enviando={enviando} siempreActivo />
    </form>
  );
}
