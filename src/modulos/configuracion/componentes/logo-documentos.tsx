"use client";

import { useActionState, useRef } from "react";
import { useHidratado } from "@/componentes/hidratado";
import { UploadIcon } from "lucide-react";
import { conAviso } from "@/componentes/panel/avisos";
import { MensajeError } from "@/componentes/panel/campo";
import { ZonaFoto } from "@/componentes/panel/zona-foto";
import { Button } from "@/componentes/ui/button";
import type { EstadoFormulario } from "@/lib/formularios";
import { subirLogo } from "../acciones";
import { TIPOS_FOTO } from "@/lib/formato-fotos";

type Props = { logo: { url: string; ancho: number | null; alto: number | null } | null };


const subirConAviso = conAviso(subirLogo);

// Logo para el PDF de cotización y otros documentos (no cambia el logo del sitio, que es el de la marca).
// Se sube apenas se elige el archivo.
export function LogoDocumentos({ logo }: Props) {
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(subirConAviso, {});
  const formulario = useRef<HTMLFormElement>(null);
  const entrada = useRef<HTMLInputElement>(null);
  const error = estado.errores?.logo;
  // La subida necesita JavaScript (se envía al elegir el archivo): el botón se habilita al hidratar.
  const listo = useHidratado();

  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="tt-titulo-seccion">Logo para documentos</h2>
        <p className="text-sm text-tinta-suave">Sale en las cotizaciones en PDF. Mejor con fondo transparente. Se guarda al momento, sin el botón Guardar cambios.</p>
      </div>

      <ZonaFoto
        id="logo"
        name="logo"
        entrada={entrada}
        nombreEntrada="Archivo del logo"
        accept={TIPOS_FOTO.join(",")}
        etiquetaVacia="Subir logo"
        vista={logo ? { src: logo.url, alt: "Logo actual para documentos" } : null}
        claseForma="aspect-[3/2]"
        entera
        claseFoto="p-6"
        textoVacio="Todavía no hay logo"
        pie="PNG, JPG o WebP, hasta 5 MB"
        ocupada={enviando ? "Subiendo…" : null}
        deshabilitada={!listo}
        invalida={!!error}
        describedBy={error ? "logo-error" : undefined}
        alElegir={() => formulario.current?.requestSubmit()}
      />
      {logo && (
        <div>
          <Button type="button" variant="outline" disabled={!listo || enviando} data-invalido={error ? true : undefined} onClick={() => entrada.current?.click()}>
            <UploadIcon />
            Cambiar logo
          </Button>
        </div>
      )}
      {error && <MensajeError id="logo-error">{error}</MensajeError>}
    </form>
  );
}
