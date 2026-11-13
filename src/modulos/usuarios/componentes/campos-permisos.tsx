"use client";

import { useState } from "react";
import { cn } from "cn";
import { Button } from "@/componentes/ui/button";
import { Checkbox } from "@/componentes/ui/checkbox";
import { PERFILES, perfilDe, type Permiso } from "@/lib/permisos";
import { DESCRIPCION_PERMISO } from "../textos";

// Los permisos de un encargado (HU-03; pedido 32: los perfiles marcan las casillas de un toque). Los usan crear un usuario
// y el modal "Permisos" de su ficha (C6). Sin el rol desde el pedido 50: todo usuario que se crea es encargado. Controlados
// y en campos ocultos propios: React reinicia el formulario al terminar la acción, y las casillas de base-ui volvían al
// valor inicial tras un error.

type Props = {
  asignables: { permiso: Permiso; nombre: string }[];
  permisosIniciales: readonly Permiso[];
};

export function CamposPermisos({ asignables, permisosIniciales }: Props) {
  const [permisos, setPermisos] = useState<readonly Permiso[]>(permisosIniciales);
  const perfil = perfilDe(permisos);
  const marcar = (permiso: Permiso, marcado: boolean) =>
    setPermisos((actuales) => (marcado ? [...actuales.filter((p) => p !== permiso), permiso] : actuales.filter((p) => p !== permiso)));

  return (
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
  );
}
