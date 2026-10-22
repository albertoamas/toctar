import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { CameraIcon, XIcon } from "lucide-react";
import { MensajeError } from "@/componentes/panel/campo";
import { achicarFoto } from "@/componentes/panel/subida-foto";
import { Button } from "@/componentes/ui/button";

// Componente de cliente: se usa dentro de otros componentes de cliente (recibe funciones como props).
// HU-32: la foto opcional del comprobante de un pago, al registrarlo o con el adelanto al agendar. Se elige con vista
// previa y se manda al enviar el formulario (`adjuntarComprobante`), achicada en el navegador.

type Elegido = { archivo: File; vista: string };

export function CampoComprobante({ onChange, error }: { onChange: (archivo: File | null) => void; error?: string }) {
  const [elegido, setElegido] = useState<Elegido | null>(null);
  const entrada = useRef<HTMLInputElement>(null);
  // La vista previa ocupa memoria mientras exista: se libera al cambiarla y al cerrar el formulario
  useEffect(() => () => {
    if (elegido) URL.revokeObjectURL(elegido.vista);
  }, [elegido]);

  function elegir(archivo: File | undefined) {
    setElegido(archivo ? { archivo, vista: URL.createObjectURL(archivo) } : null);
    onChange(archivo ?? null);
    if (entrada.current) entrada.current.value = "";
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium">
        Comprobante <span className="font-normal text-tinta-suave">(opcional)</span>
      </p>
      {elegido && <Image src={elegido.vista} alt="Foto del comprobante elegida" width={160} height={160} unoptimized className="size-40 rounded-sm bg-superficie object-cover" />}
      <input ref={entrada} id="comprobante" type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-label="Archivo del comprobante" onChange={(ev) => elegir(ev.currentTarget.files?.[0])} />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => entrada.current?.click()} aria-describedby={error ? "comprobante-error" : undefined}>
          <CameraIcon />
          {elegido ? "Cambiar foto" : "Foto del comprobante"}
        </Button>
        {elegido && (
          <Button type="button" variant="ghost" onClick={() => elegir(undefined)}>
            <XIcon />
            Quitar foto
          </Button>
        )}
      </div>
      {error && <MensajeError id="comprobante-error">{error}</MensajeError>}
    </div>
  );
}

/** Suma la foto elegida a los datos del formulario. Una foto de celular pesa 4–12 MB: achicada sube rápido en 4G (el servidor la vuelve a validar). */
export async function adjuntarComprobante(datos: FormData, archivo: File | null) {
  if (archivo) datos.set("comprobante", await achicarFoto(archivo));
}
