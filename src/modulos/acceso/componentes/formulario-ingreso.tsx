"use client";

import { useActionState } from "react";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { iniciarSesion } from "../acciones";
import type { EstadoIngreso } from "../esquemas";

export function FormularioIngreso() {
  const [estado, accion, enviando] = useActionState<EstadoIngreso, FormData>(iniciarSesion, {});

  return (
    <form action={accion} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="usuario">Usuario</Label>
        <Input
          id="usuario"
          name="usuario"
          autoComplete="username"
          autoCapitalize="none"
          defaultValue={estado.usuario}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="contrasena">Contraseña</Label>
        <Input id="contrasena" name="contrasena" type="password" autoComplete="current-password" required />
      </div>
      {estado.error && (
        <p role="alert" className="text-sm text-destructive">
          {estado.error}
        </p>
      )}
      <Button type="submit" disabled={enviando}>
        {enviando ? "Ingresando…" : "Ingresar"}
      </Button>
    </form>
  );
}
