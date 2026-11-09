import { startTransition, useEffect, useRef, useState } from "react";
import { CameraIcon, XIcon } from "lucide-react";
import { MensajeError } from "@/componentes/panel/campo";
import { achicarFoto } from "@/componentes/panel/subida-foto";
import { ZonaFoto } from "@/componentes/panel/zona-foto";
import { Button } from "@/componentes/ui/button";
import { BYTES_MAXIMOS_FOTO } from "@/lib/formato-fotos";
import { ERROR_COMPROBANTE } from "../reglas";

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
      {/* Una miniatura (pulido final de los pagos, 09/11; era un recuadro de 160 px siempre abierto), con la foto entera:
          suele ser una captura vertical, y tiene que leerse */}
      <div className="w-32">
        <ZonaFoto
          id="comprobante"
          entrada={entrada}
          nombreEntrada="Archivo del comprobante"
          etiquetaVacia="Foto del comprobante"
          vista={elegido ? { src: elegido.vista, alt: "Foto del comprobante elegida" } : null}
          entera
          compacta
          invalida={!!error}
          describedBy={error ? "comprobante-error" : undefined}
          alElegir={elegir}
        />
      </div>
      {elegido && (
        <div className="flex flex-wrap gap-2">
          {/* data-invalido: el foco va aquí si el comprobante tiene el error (useFocoEnError) */}
          <Button type="button" variant="outline" onClick={() => entrada.current?.click()} data-invalido={error ? true : undefined} aria-describedby={error ? "comprobante-error" : undefined}>
            <CameraIcon />
            Cambiar foto
          </Button>
          <Button type="button" variant="ghost" onClick={() => elegir(undefined)}>
            <XIcon />
            Quitar foto
          </Button>
        </div>
      )}
      {error && <MensajeError id="comprobante-error">{error}</MensajeError>}
    </div>
  );
}

/**
 * El envío de un formulario con comprobante: la foto va achicada (una de celular pesa 4–12 MB; achicada sube rápido
 * en 4G y el servidor la vuelve a validar). Sin JavaScript todavía, el formulario usa su `action` y va sin foto.
 */
export function useEnvioConComprobante(accion: (datos: FormData) => void) {
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [preparando, setPreparando] = useState(false);
  const [errorFoto, setErrorFoto] = useState<string>();

  /** `conFoto` en false: la foto elegida no va (por ejemplo, "Sin adelanto"). */
  async function enviar(ev: React.SyntheticEvent<HTMLFormElement, SubmitEvent>, conFoto = true) {
    ev.preventDefault();
    const datos = new FormData(ev.currentTarget);
    setErrorFoto(undefined);
    if (conFoto && comprobante) {
      setPreparando(true);
      const foto = await achicarFoto(comprobante);
      setPreparando(false);
      // Si no se pudo achicar (un formato que el navegador no lee) y pesa demasiado, ni se manda: el servidor la rechazaría
      if (foto.size > BYTES_MAXIMOS_FOTO) return setErrorFoto(ERROR_COMPROBANTE);
      datos.set("comprobante", foto);
    }
    startTransition(() => accion(datos));
  }

  return { comprobante, setComprobante, preparando, errorFoto, enviar };
}
