"use client";

import { useActionState, useRef, useState } from "react";
import { cn } from "cn";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { conAviso } from "@/componentes/panel/avisos";
import { Campo, MensajeError } from "@/componentes/panel/campo";
import { Button } from "@/componentes/ui/button";
import { Checkbox } from "@/componentes/ui/checkbox";
import { Input } from "@/componentes/ui/input";
import { RadioGroup, RadioGroupItem } from "@/componentes/ui/radio-group";
import type { EstadoFormulario } from "@/lib/formularios";
import { PERFILES, perfilDe, type Permiso } from "@/lib/permisos";
import { ROLES, type Rol } from "@/lib/roles";
import { actualizarUsuario, crearUsuario } from "../acciones";
import { DESCRIPCION_PERMISO, DESCRIPCION_ROL, NOMBRE_ROL } from "../textos";

const crearConAviso = conAviso(crearUsuario);
const actualizarConAviso = conAviso(actualizarUsuario);

type Props =
  | { modo: "crear"; asignables: { permiso: Permiso; nombre: string }[] }
  | {
      modo: "editar";
      asignables: { permiso: Permiso; nombre: string }[];
      usuario: { id: number; nombre: string; usuario: string; rol: Rol; permisos: Permiso[] };
    };

export function FormularioUsuario(props: Props) {
  const editar = props.modo === "editar" ? props.usuario : null;
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(
    editar ? actualizarConAviso : crearConAviso,
    {},
  );
  const valores = estado.valores;
  const [rol, setRol] = useState<Rol>((valores?.rol as Rol) || editar?.rol || "encargado");
  const [verContrasena, setVerContrasena] = useState(false);
  // Controlados, como el rol: viajan en campos ocultos propios. Un encargado nuevo empieza con el perfil Taller, el más
  // común (pedido 32: los que reciben y trabajan los vehículos)
  const [permisos, setPermisos] = useState<readonly Permiso[]>(editar?.permisos ?? PERFILES[0].permisos);
  const perfil = perfilDe(permisos);
  const marcar = (permiso: Permiso, marcado: boolean) =>
    setPermisos((actuales) => (marcado ? [...actuales.filter((p) => p !== permiso), permiso] : actuales.filter((p) => p !== permiso)));
  const e = estado.errores ?? {};
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);

  return (
    <form ref={formulario} action={accion} className="tt-formulario-panel flex max-w-xl flex-col gap-6" noValidate>
      {editar && <input type="hidden" name="id" value={editar.id} />}

      <Campo id="nombre" etiqueta="Nombre" error={e.nombre}>
        <Input id="nombre" name="nombre" autoComplete="off" defaultValue={valores?.nombre ?? editar?.nombre} aria-invalid={!!e.nombre} aria-describedby={e.nombre ? "nombre-error" : undefined} />
      </Campo>

      {editar ? (
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold">Usuario</span>
          <span className="text-tinta-suave">{editar.usuario}</span>
          <span className="text-sm text-tinta-suave">El usuario no se cambia: es con lo que la persona ingresa.</span>
        </div>
      ) : (
        <>
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
        </>
      )}

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-sm font-semibold">Rol</legend>
        {/* El valor viaja en un campo oculto propio: React reinicia el formulario al terminar la acción y el campo interno
            de los radios de base-ui volvía al rol inicial tras un error, aunque en pantalla siguiera marcado el elegido */}
        <input type="hidden" name="rol" value={rol} />
        <RadioGroup
          value={rol}
          onValueChange={(v) => {
            setRol(v as Rol);
            // Un dueño que pasa a encargado no trae permisos: empieza con Taller, como uno nuevo
            if (v === "encargado" && permisos.length === 0) setPermisos(PERFILES[0].permisos);
          }}
          className="gap-3"
        >
          {ROLES.map((r) => (
            <label key={r} htmlFor={`rol-${r}`} className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-fondo p-3 has-data-checked:border-tinta">
              <RadioGroupItem id={`rol-${r}`} value={r} className="mt-0.5" />
              <span className="flex flex-col">
                <span className="font-semibold">{NOMBRE_ROL[r]}</span>
                <span className="text-sm text-tinta-suave">{DESCRIPCION_ROL[r]}</span>
              </span>
            </label>
          ))}
        </RadioGroup>
        {e.rol && <MensajeError id="rol-error">{e.rol}</MensajeError>}
      </fieldset>

      {rol === "encargado" && (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-sm font-semibold">Permisos</legend>
          {permisos.map((p) => (
            <input key={p} type="hidden" name="permisos" value={p} />
          ))}
          {/* Los perfiles (pedido 32): marcan las casillas de un toque; el que coincide con lo marcado se ve presionado */}
          <div role="group" aria-labelledby="perfiles-titulo" aria-describedby="perfiles-ayuda" className="flex flex-col gap-2">
            <span id="perfiles-titulo" className="text-sm font-medium">
              Perfil
            </span>
            <div className="flex flex-wrap gap-2">
              {PERFILES.map((p) => (
                <Button
                  key={p.clave}
                  type="button"
                  variant="outline"
                  aria-pressed={perfil?.clave === p.clave}
                  onClick={() => setPermisos(p.permisos)}
                  className={cn(perfil?.clave === p.clave && "border-tinta bg-tinta text-fondo hover:bg-tinta hover:text-fondo")}
                >
                  {p.nombre}
                  <span className="sr-only">: {p.descripcion}</span>
                </Button>
              ))}
            </div>
            <span id="perfiles-ayuda" className="text-sm text-tinta-suave">
              Marca sus casillas de un toque; después puedes ajustarlas.
            </span>
          </div>
          {props.asignables.map(({ permiso, nombre }) => (
            <label key={permiso} htmlFor={`permiso-${permiso}`} className="flex cursor-pointer items-start gap-3">
              <Checkbox id={`permiso-${permiso}`} checked={permisos.includes(permiso)} onCheckedChange={(marcado) => marcar(permiso, marcado)} className="mt-0.5" />
              <span className="flex flex-col">
                <span className="font-medium">{nombre}</span>
                <span className="text-sm text-tinta-suave">{DESCRIPCION_PERMISO[permiso]}</span>
              </span>
            </label>
          ))}
        </fieldset>
      )}

      <div>
        <Button type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : editar ? "Guardar cambios" : "Crear usuario"}
        </Button>
      </div>
    </form>
  );
}
