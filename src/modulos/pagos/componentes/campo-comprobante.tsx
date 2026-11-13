import { startTransition, useEffect, useState } from "react";
import { ElegirFoto } from "@/componentes/panel/elegir-foto";
import { achicarFoto } from "@/componentes/panel/subida-foto";
import { BYTES_MAXIMOS_FOTO } from "@/lib/formato-fotos";
import { ERROR_COMPROBANTE } from "../reglas";

// Componente de cliente: se usa dentro de otros componentes de cliente (recibe funciones como props).
// HU-32: la foto opcional del comprobante de un pago, al registrarlo o con el adelanto al agendar. Se elige con vista
// previa y se manda al enviar el formulario (`adjuntarComprobante`), achicada en el navegador.

export function CampoComprobante({ onChange, error }: { onChange: (archivo: File | null) => void; error?: string }) {
  const [vista, setVista] = useState<string | null>(null);
  // La vista previa ocupa memoria mientras exista: se libera al cambiarla y al cerrar el formulario
  useEffect(() => () => void (vista && URL.revokeObjectURL(vista)), [vista]);

  function elegir(archivo: File | null) {
    setVista(archivo ? URL.createObjectURL(archivo) : null);
    onChange(archivo);
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium">
        Comprobante <span className="font-normal text-tinta-suave">(opcional)</span>
      </p>
      {/* Revisión del 13/11: "Tomar foto" y "Elegir de la galería", como en el checklist y las fotos de la orden (era un
          recuadro punteado). Elegida, se ve entera: suele ser una captura vertical, y tiene que leerse antes de guardar */}
      <ElegirFoto id="comprobante" de="del comprobante" vista={vista} alElegir={elegir} quitable entera error={error} />
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
