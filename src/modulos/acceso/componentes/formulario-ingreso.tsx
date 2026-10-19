"use client";

import { useActionState, useEffect, useRef } from "react";
import { MensajeError } from "@/componentes/panel/campo";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { iniciarSesion } from "../acciones";
import type { EstadoIngreso } from "../esquemas";

// Se usa sobre todo desde el celular en el taller: campos y botón de 44 px (pulido 3.1).
const CAMPO = "h-11";
const ID_ERROR = "ingreso-error";

export function FormularioIngreso() {
  const [estado, accion, enviando] = useActionState<EstadoIngreso, FormData>(iniciarSesion, {});
  const contrasena = useRef<HTMLInputElement>(null);

  // Después de un error, el foco va a la contraseña (vuelve vacía) para escribirla de nuevo sin tocar la pantalla.
  useEffect(() => {
    if (estado.error) contrasena.current?.focus();
  }, [estado]);

  const describir = estado.error ? ID_ERROR : undefined;

  return (
    <form action={accion} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="usuario">Usuario</Label>
        <Input
          id="usuario"
          name="usuario"
          autoComplete="username"
          autoCapitalize="none"
          className={CAMPO}
          defaultValue={estado.usuario}
          aria-describedby={describir}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="contrasena">Contraseña</Label>
        <Input
          ref={contrasena}
          id="contrasena"
          name="contrasena"
          type="password"
          autoComplete="current-password"
          className={CAMPO}
          aria-describedby={describir}
          required
        />
      </div>
      {estado.error && (
        // El mismo mensaje que los demás formularios, anunciado como alerta
        <div role="alert">
          <MensajeError id={ID_ERROR}>{estado.error}</MensajeError>
        </div>
      )}
      <button type="submit" disabled={enviando} className="tt-boton tt-boton--principal w-full disabled:opacity-60">
        {enviando ? "Ingresando…" : "Ingresar"}
      </button>
    </form>
  );
}
