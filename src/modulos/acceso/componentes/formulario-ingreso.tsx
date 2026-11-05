"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { MensajeError } from "@/componentes/panel/campo";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { iniciarSesion } from "../acciones";
import type { EstadoIngreso } from "../esquemas";

// Se usa sobre todo desde el celular en el taller: campos de 48 px y botón de 52 (pulido 3.2; antes 44), y la contraseña
// se puede ver para no equivocarse al escribirla (pulido 3.1).
const CAMPO = "h-12 text-base";
const ID_ERROR = "ingreso-error";

export function FormularioIngreso() {
  const [estado, accion, enviando] = useActionState<EstadoIngreso, FormData>(iniciarSesion, {});
  const [verContrasena, setVerContrasena] = useState(false);
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
        <div className="relative">
          <Input
            ref={contrasena}
            id="contrasena"
            name="contrasena"
            type={verContrasena ? "text" : "password"}
            autoComplete="current-password"
            className={`${CAMPO} pr-12`}
            aria-describedby={describir}
            required
          />
          <button
            type="button"
            onClick={() => setVerContrasena((v) => !v)}
            aria-label={verContrasena ? "Ocultar la contraseña" : "Mostrar la contraseña"}
            className="absolute top-0.5 right-0.5 grid size-11 place-items-center rounded-lg text-tinta-suave hover:text-tinta focus-visible:outline-2 focus-visible:outline-[var(--foco)]"
          >
            {verContrasena ? <EyeOffIcon className="size-5" aria-hidden /> : <EyeIcon className="size-5" aria-hidden />}
          </button>
        </div>
      </div>
      {estado.error && (
        // El mismo mensaje que los demás formularios, anunciado como alerta
        <div role="alert">
          <MensajeError id={ID_ERROR}>{estado.error}</MensajeError>
        </div>
      )}
      <button type="submit" disabled={enviando} className="tt-boton tt-boton--principal min-h-13 w-full text-base disabled:opacity-60">
        {enviando ? "Ingresando…" : "Ingresar"}
      </button>
    </form>
  );
}
