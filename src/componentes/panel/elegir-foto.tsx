import { useRef, useState } from "react";
import { CameraIcon, ImageIcon, XIcon } from "lucide-react";
import { MensajeError } from "@/componentes/panel/campo";
import { useSoltarArchivos } from "@/componentes/panel/zona-foto";
import { Button } from "@/componentes/ui/button";
import { MENSAJE_NO_ES_FOTO, soloFotos } from "@/lib/formato-fotos";

// Componente de cliente: se usa dentro de otros componentes de cliente (recibe funciones como props).
// Una foto que se elige en un formulario del panel, con dos botones juntos (pulido 13.13; revisión del 13/11): "Tomar
// foto" abre directo la cámara trasera (`capture`) y "Elegir de la galería", las fotos del teléfono. Una sola zona no
// sirve: en Android el selector de fotos no ofrece la cámara. La usan el comprobante de un pago y el detalle del
// checklist. En la computadora, la foto también se suelta encima (como las fotos de la orden). Quien la usa guarda el
// archivo (no es un campo del formulario: React lo reinicia tras un error) y la vista.

export function ElegirFoto({
  id,
  de,
  vista,
  alElegir,
  quitable,
  entera = false,
  error,
}: {
  id: string;
  /** De qué es, para los nombres de los botones y de la vista: "del comprobante". */
  de: string;
  /** La foto elegida (o la ya guardada), para verla antes de guardar. */
  vista: string | null;
  /** Con un archivo al elegir; con null al quitarla. Cancelar la cámara o la galería no cambia nada. */
  alElegir: (archivo: File | null) => void;
  /** Ofrecer "Quitar foto" (la recién elegida; una ya guardada se reemplaza con otra). */
  quitable: boolean;
  /** Entera, sin recortar: un comprobante suele ser una captura vertical y tiene que leerse. */
  entera?: boolean;
  error?: string;
}) {
  const camara = useRef<HTMLInputElement>(null);
  const galeria = useRef<HTMLInputElement>(null);
  const [noEsFoto, setNoEsFoto] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  // Elegida o soltada, igual: lo que no es una foto se rechaza y no reemplaza la que ya estaba (la cámara y la galería
  // filtran por `accept`, pero un archivo puede llegar igual; pulido 13.61, como la zona de la galería)
  const recibir = (archivos: File[], soltadas: boolean) => {
    const [foto] = soloFotos(archivos);
    setNoEsFoto(!foto);
    setAviso(foto && soltadas && archivos.length > 1 ? `Soltaste ${archivos.length} archivos: se usó la primera foto.` : null);
    if (foto) alElegir(foto);
  };
  const elegir = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const archivos = Array.from(ev.target.files ?? []);
    // Vacío: así elegir otra vez la misma foto (después de quitarla) vuelve a avisar
    ev.target.value = "";
    if (archivos.length > 0) recibir(archivos, false);
  };
  const { arrastrando, propsArrastre } = useSoltarArchivos(false, (archivos) => recibir(archivos, true));
  const mensaje = error ?? (noEsFoto ? MENSAJE_NO_ES_FOTO : undefined);
  const describe = mensaje ? `${id}-error` : undefined;
  return (
    <div data-zona-foto className="relative flex flex-col gap-3" {...propsArrastre}>
      {arrastrando && (
        <span className="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-lg border-2 border-dashed border-info bg-info-fondo/95 p-4 text-center text-sm font-semibold">
          Suelta la foto aquí
        </span>
      )}
      <input ref={camara} id={id} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} aria-label={`Cámara para la foto ${de}`} onChange={elegir} />
      <input ref={galeria} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-label={`Galería para la foto ${de}`} onChange={elegir} />
      {vista && (
        // eslint-disable-next-line @next/next/no-img-element -- una vista previa local (blob:) o la miniatura ya guardada
        <img
          src={vista}
          alt={`Foto ${de}`}
          className={entera ? "max-h-72 w-auto max-w-full self-start rounded-lg border border-border object-contain" : "aspect-[4/3] w-full max-w-xs rounded-lg border border-border object-cover"}
        />
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => camara.current?.click()} data-invalido={error ? true : undefined} aria-describedby={describe}>
          <CameraIcon />
          {vista ? "Tomar otra" : "Tomar foto"}
          {/* De qué foto: con dos en el mismo formulario (el antes y el después de la galería), el lector los distingue */}
          <span className="sr-only"> {de}</span>
        </Button>
        <Button type="button" variant="outline" onClick={() => galeria.current?.click()} aria-describedby={describe}>
          <ImageIcon />
          {vista ? "Elegir otra" : "Elegir de la galería"}
          <span className="sr-only"> {de}</span>
        </Button>
        {quitable && vista && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setNoEsFoto(false);
              setAviso(null);
              alElegir(null);
            }}
          >
            <XIcon />
            Quitar foto
            <span className="sr-only"> {de}</span>
          </Button>
        )}
      </div>
      {mensaje && <MensajeError id={`${id}-error`}>{mensaje}</MensajeError>}
      {aviso && !mensaje && (
        <p role="status" className="text-sm text-tinta-suave">
          {aviso}
        </p>
      )}
    </div>
  );
}
