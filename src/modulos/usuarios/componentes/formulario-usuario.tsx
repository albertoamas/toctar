"use client";

import { useActionState, useRef, useState } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { conAviso } from "@/componentes/panel/avisos";
import { Campo } from "@/componentes/panel/campo";
import { AvisoAlSalir } from "@/componentes/panel/cambios-sin-guardar";
import { PieFormulario } from "@/componentes/panel/pie-formulario";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import type { EstadoFormulario } from "@/lib/formularios";
import { PERFILES, type Permiso } from "@/lib/permisos";
import { crearUsuario } from "../acciones";
import { CamposPermisos } from "./campos-permisos";

// HU-02: crear un usuario, siempre un encargado (pedido 50: un dueño se crea desde el servidor). Como toda pantalla de crear, "Crear usuario" al pie (PieFormulario: fijo abajo en el celular) y
// pregunta antes de salir con algo escrito (inventario-pantallas.md, cambio 2: tenía su propia barra). La ficha de un
// usuario se edita por partes, en modales (ficha-usuario.tsx, C6).

const crearConAviso = conAviso(crearUsuario);

export function FormularioUsuario({ asignables }: { asignables: { permiso: Permiso; nombre: string }[] }) {
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(crearConAviso, {});
  const valores = estado.valores;
  const [verContrasena, setVerContrasena] = useState(false);
  // Controladas: React vacía los campos del formulario después de un error, y la contraseña no vuelve del servidor.
  // Con "no coinciden" se perdían las dos (hallazgo 5)
  const [contrasena, setContrasena] = useState("");
  const [repetida, setRepetida] = useState("");
  const e = estado.errores ?? {};
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);

  return (
    <form ref={formulario} action={accion} className="tt-formulario-panel flex flex-col gap-6" noValidate>
      {/* Con espacio (pantalla grande, 17/11), la cuenta y sus permisos lado a lado: los campos no quedan de todo el ancho */}
      <div className="grid gap-8 @6xl:grid-cols-2">
        <div className="flex flex-col gap-6">
          <Campo id="nombre" etiqueta="Nombre" error={e.nombre}>
            <Input id="nombre" name="nombre" autoComplete="off" defaultValue={valores?.nombre} aria-invalid={!!e.nombre} aria-describedby={e.nombre ? "nombre-error" : undefined} />
          </Campo>
          <Campo id="usuario" etiqueta="Usuario" error={e.usuario} ayuda="Con esto ingresa. En minúsculas, sin espacios ni tildes.">
            <Input id="usuario" name="usuario" autoComplete="off" autoCapitalize="none" spellCheck={false} defaultValue={valores?.usuario} aria-invalid={!!e.usuario} aria-describedby={e.usuario ? "usuario-error" : "usuario-ayuda"} />
          </Campo>
          <Campo id="contrasena" etiqueta="Contraseña inicial" error={e.contrasena} ayuda="Al menos 8 caracteres. Pásasela a la persona en mano o por WhatsApp.">
            <div className="flex gap-2">
              <Input id="contrasena" name="contrasena" type={verContrasena ? "text" : "password"} autoComplete="new-password" value={contrasena} onChange={(ev) => setContrasena(ev.target.value)} aria-invalid={!!e.contrasena} aria-describedby={e.contrasena ? "contrasena-error" : "contrasena-ayuda"} />
              <Button type="button" variant="outline" size="icon" onClick={() => setVerContrasena((v) => !v)} aria-label={verContrasena ? "Ocultar contraseña" : "Mostrar contraseña"}>
                {verContrasena ? <EyeOffIcon /> : <EyeIcon />}
              </Button>
            </div>
          </Campo>
          {/* Hallazgo 5: dos veces, un error de tipeo en el celular la dejaba sin poder entrar. El ojo muestra las dos */}
          <Campo id="repetir" etiqueta="Repite la contraseña" error={e.repetir}>
            <Input id="repetir" name="repetir" type={verContrasena ? "text" : "password"} autoComplete="new-password" value={repetida} onChange={(ev) => setRepetida(ev.target.value)} aria-invalid={!!e.repetir} aria-describedby={e.repetir ? "repetir-error" : undefined} />
          </Campo>
        </div>
        {/* Empieza con el perfil Taller, el más común (pedido 32: los que reciben y trabajan los vehículos) */}
        <div className="@6xl:border-l @6xl:border-border @6xl:pl-8">
          <CamposPermisos asignables={asignables} permisosIniciales={PERFILES[0].permisos} />
        </div>
      </div>
      <AvisoAlSalir formulario={formulario} estado={estado} anunciar />
      <PieFormulario>
        <Button type="submit" disabled={enviando}>
          {enviando ? "Creando…" : "Crear usuario"}
        </Button>
      </PieFormulario>
    </form>
  );
}
