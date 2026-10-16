"use client";

import Image from "next/image";
import { useActionState, useRef, useSyncExternalStore } from "react";
import { ImageIcon, UploadIcon } from "lucide-react";
import { conAviso } from "@/componentes/panel/avisos";
import { MensajeError } from "@/componentes/panel/campo";
import { Button } from "@/componentes/ui/button";
import type { EstadoFormulario } from "@/lib/formularios";
import { subirLogo } from "../acciones";
import { TIPOS_FOTO } from "@/lib/formato-fotos";

type Props = { logo: { url: string; ancho: number | null; alto: number | null } | null };

const sinSuscripcion = () => () => {};

const subirConAviso = conAviso(subirLogo);

// Logo para el PDF de cotización y otros documentos (no cambia el logo del sitio, que es el de la marca).
// Se sube apenas se elige el archivo.
export function LogoDocumentos({ logo }: Props) {
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(subirConAviso, {});
  const formulario = useRef<HTMLFormElement>(null);
  const error = estado.errores?.logo;
  // La subida necesita JavaScript (se envía al elegir el archivo): el botón se habilita al hidratar.
  const listo = useSyncExternalStore(sinSuscripcion, () => true, () => false);

  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-2xl font-bold italic">Logo para documentos</h2>
        <p className="text-sm text-tinta-suave">Sale en las cotizaciones en PDF. PNG, JPG o WebP de hasta 5 MB; mejor con fondo transparente.</p>
      </div>

      <div className="flex aspect-[3/2] items-center justify-center rounded-sm border border-border bg-superficie p-6">
        {logo ? (
          <Image
            src={logo.url}
            alt="Logo actual para documentos"
            width={logo.ancho ?? 400}
            height={logo.alto ?? 300}
            unoptimized
            className="max-h-full w-auto object-contain"
          />
        ) : (
          <span className="flex flex-col items-center gap-2 text-sm text-tinta-suave">
            <ImageIcon className="size-8" aria-hidden />
            Todavía no hay logo
          </span>
        )}
      </div>

      <input
        id="logo"
        name="logo"
        type="file"
        accept={TIPOS_FOTO.join(",")}
        className="sr-only"
        tabIndex={-1}
        aria-label="Archivo del logo"
        aria-describedby={error ? "logo-error" : undefined}
        onChange={(e) => e.currentTarget.files?.length && formulario.current?.requestSubmit()}
      />
      <div>
        <Button type="button" variant="outline" disabled={!listo || enviando} onClick={() => document.getElementById("logo")?.click()}>
          <UploadIcon />
          {enviando ? "Subiendo…" : logo ? "Cambiar logo" : "Subir logo"}
        </Button>
      </div>
      {error && <MensajeError id="logo-error">{error}</MensajeError>}
    </form>
  );
}
