"use client";

import { useState } from "react";
import { cn } from "cn";
import { MensajeError } from "@/componentes/panel/campo";
import { Button } from "@/componentes/ui/button";
import { Checkbox } from "@/componentes/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/componentes/ui/radio-group";
import { PERFILES, perfilDe, type Permiso } from "@/lib/permisos";
import { ROLES, type Rol } from "@/lib/roles";
import { DESCRIPCION_PERMISO, DESCRIPCION_ROL, NOMBRE_ROL } from "../textos";

// El rol y, para el encargado, sus permisos (HU-02, HU-03; pedido 32: los perfiles marcan las casillas de un toque). Los
// usan crear un usuario y el modal "Rol y permisos" de su ficha (C6). Controlados y en campos ocultos propios: React
// reinicia el formulario al terminar la acción, y los radios y casillas de base-ui volvían al valor inicial tras un error.

type Props = {
  asignables: { permiso: Permiso; nombre: string }[];
  rolInicial: Rol;
  permisosIniciales: readonly Permiso[];
  /** El error del rol ("Es el único dueño activo…"). */
  error?: string;
};

export function CamposRolPermisos({ asignables, rolInicial, permisosIniciales, error }: Props) {
  const [rol, setRol] = useState<Rol>(rolInicial);
  const [permisos, setPermisos] = useState<readonly Permiso[]>(permisosIniciales);
  const perfil = perfilDe(permisos);
  const marcar = (permiso: Permiso, marcado: boolean) =>
    setPermisos((actuales) => (marcado ? [...actuales.filter((p) => p !== permiso), permiso] : actuales.filter((p) => p !== permiso)));

  return (
    <>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-sm font-semibold">Rol</legend>
        <input type="hidden" name="rol" value={rol} />
        <RadioGroup
          value={rol}
          onValueChange={(v) => {
            setRol(v as Rol);
            // Un dueño que pasa a encargado no trae permisos: empieza con Taller, como uno nuevo
            if (v === "encargado" && permisos.length === 0) setPermisos(PERFILES[0].permisos);
          }}
          aria-describedby={error ? "rol-error" : undefined}
          className="gap-3"
        >
          {ROLES.map((r, i) => (
            <label key={r} htmlFor={`rol-${r}`} className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-fondo p-3 has-data-checked:border-tinta">
              <RadioGroupItem id={`rol-${r}`} value={r} className="mt-0.5" data-invalido={(!!error && i === 0) || undefined} />
              <span className="flex flex-col">
                <span className="font-semibold">{NOMBRE_ROL[r]}</span>
                <span className="text-sm text-tinta-suave">{DESCRIPCION_ROL[r]}</span>
              </span>
            </label>
          ))}
        </RadioGroup>
        {error && <MensajeError id="rol-error">{error}</MensajeError>}
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
          {asignables.map(({ permiso, nombre }) => (
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
    </>
  );
}
