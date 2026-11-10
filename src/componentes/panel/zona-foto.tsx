import { useState, type DragEvent, type RefObject } from "react";
import { cn } from "cn";
import { ImageUpIcon, LoaderCircleIcon } from "lucide-react";
import { MensajeError } from "@/componentes/panel/campo";
import { AvisoFoto } from "@/componentes/panel/guia-foto";
import { MENSAJE_NO_ES_FOTO, soloFotos } from "@/lib/formato-fotos";

// Componente de cliente: se usa dentro de otros componentes de cliente (recibe funciones como props).
// Dónde se eligen fotos (pulido 13.13): toda la zona se toca o se le hace clic, y en la computadora también se le pueden
// soltar fotos, incluso para reemplazar la que tiene. Vacía es baja, para no empujar el formulario; con foto toma la forma
// con la que va a salir. Arrastrar es una opción más: con el teclado se llega al botón de la zona vacía o a "Cambiar foto",
// que la pantalla pone debajo. El servidor valida igual lo que llega.

/**
 * Soltar archivos sobre un elemento, sin más diseño: lo usan `ZonaFoto` y las fotos de la orden, que siguen con sus dos
 * botones. Se avisa siempre que se soltó algo encima (`dragover` y `drop`): si no, el navegador abre la foto y se pierde
 * la pantalla, también con la zona bloqueada.
 */
export function useSoltarArchivos(bloqueada: boolean, alSoltar: (archivos: File[]) => void) {
  const [arrastrando, setArrastrando] = useState(false);
  return {
    arrastrando,
    propsArrastre: {
      onDragEnter: (e: DragEvent<HTMLElement>) => {
        if (e.dataTransfer.types.includes("Files") && !bloqueada) setArrastrando(true);
      },
      onDragOver: (e: DragEvent<HTMLElement>) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = bloqueada ? "none" : "copy";
      },
      onDragLeave: (e: DragEvent<HTMLElement>) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setArrastrando(false);
      },
      onDrop: (e: DragEvent<HTMLElement>) => {
        e.preventDefault();
        setArrastrando(false);
        const archivos = [...e.dataTransfer.files];
        if (!bloqueada && archivos.length > 0) alSoltar(archivos);
      },
    },
  };
}

/** La foto soltada también va en el campo: un formulario que se envía con él (el logo) lleva lo que se soltó. */
function ponerEnCampo(campo: HTMLInputElement, archivo: File) {
  const datos = new DataTransfer();
  datos.items.add(archivo);
  campo.files = datos.files;
}

function vaciarCampo(campo: HTMLInputElement) {
  campo.value = "";
}

type Props = {
  id: string;
  /** El campo de archivo, para que "Cambiar foto" lo abra. */
  entrada: RefObject<HTMLInputElement | null>;
  /** Cómo se anuncia el campo de archivo ("Archivo de la foto"). */
  nombreEntrada: string;
  /** Con nombre, va en el formulario (se sube con él). */
  name?: string;
  accept?: string;
  /** Cómo se anuncia la zona vacía ("Subir foto: Opciones"). */
  etiquetaVacia: string;
  /** Vacía si es null. Con `alElegirVarias` siempre lo es: las elegidas se muestran aparte. */
  vista?: { src: string; alt: string } | null;
  /** La forma con foto, como clase de Tailwind. */
  claseForma?: string;
  /** La foto entera (un afiche, un logo), en lugar de recortada a la forma. */
  entera?: boolean;
  /** Con foto: el margen alrededor (un logo). */
  claseFoto?: string;
  /** Lo que pasa si no se sube ninguna ("Sin foto: la historia va sola."). */
  textoVacio?: string;
  /** Qué acepta. Las fotos se achican antes de subir, así que en general no hace falta hablar de megas. */
  pie?: string;
  /** Lo que está haciendo ("Subiendo…"): la tapa y no deja elegir otra. */
  ocupada?: string | null;
  deshabilitada?: boolean;
  invalida?: boolean;
  describedBy?: string;
  /** En el sitio público: con sus colores y sus esquinas (el azul de información es solo del panel). */
  enSitio?: boolean;
  /** Una foto. Si se sueltan varias, va la primera y lo dice. */
  alElegir?: (archivo: File) => void;
  /** Varias fotos a la vez. */
  alElegirVarias?: (archivos: File[]) => void;
  /** Una miniatura (pulido 13.19): vacía dice solo "Agregar foto"; lo demás lo pone quien la usa, al lado. */
  compacta?: boolean;
  /** El ancho de la zona (`w-32`), sin achicar sus avisos, que siguen a todo el ancho. */
  claseZona?: string;
  /** Con foto, tocarla hace esto (verla en grande) en lugar de abrir el selector para cambiarla. */
  alTocarFoto?: () => void;
};

export function ZonaFoto(props: Props) {
  const { id, entrada, vista, ocupada, deshabilitada, enSitio, alElegir, alElegirVarias } = props;
  const [rechazo, setRechazo] = useState<string>();
  const [aviso, setAviso] = useState<string>();
  const bloqueada = !!ocupada || !!deshabilitada;
  const varias = !!alElegirVarias;

  /** Elegidas o soltadas: el mismo filtro. Lo que no es foto se rechaza y el campo queda vacío. */
  function recibir(archivos: File[], soltadas: boolean) {
    const fotos = soloFotos(archivos);
    setRechazo(fotos.length === 0 ? MENSAJE_NO_ES_FOTO : undefined);
    setAviso(undefined);
    if (fotos.length === 0) {
      if (entrada.current) vaciarCampo(entrada.current);
      return;
    }
    if (varias) {
      if (fotos.length < archivos.length) setAviso(`Solo se agregan fotos: quedaron afuera ${archivos.length - fotos.length}.`);
      alElegirVarias(fotos);
      return;
    }
    if (soltadas && archivos.length > 1) setAviso(`Soltaste ${archivos.length} archivos: se usó la primera foto.`);
    if (soltadas && entrada.current) ponerEnCampo(entrada.current, fotos[0]);
    alElegir?.(fotos[0]);
  }

  const { arrastrando, propsArrastre } = useSoltarArchivos(bloqueada, (archivos) => recibir(archivos, true));

  const abrir = () => entrada.current?.click();

  return (
    <div className="flex flex-col gap-2">
      <div
        data-zona-foto
        data-arrastrando={arrastrando || undefined}
        className={cn(
          "relative overflow-hidden",
          props.claseZona,
          enSitio ? "rounded-none" : "rounded-lg",
          vista && cn("border border-border bg-superficie", props.claseForma ?? "aspect-[4/3]"),
          vista && arrastrando && "ring-2 ring-info",
        )}
        {...propsArrastre}
      >
        {vista ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- también vistas previas locales (blob:); las guardadas ya vienen en WebP */}
            <img src={vista.src} alt={vista.alt} className={cn("absolute inset-0 size-full", props.entera ? "object-contain" : "object-cover", props.claseFoto)} />
            {props.alTocarFoto ? (
              <button
                type="button"
                aria-label={`Ver en grande: ${vista.alt}`}
                disabled={bloqueada}
                onClick={props.alTocarFoto}
                className="absolute inset-0 cursor-zoom-in disabled:cursor-default focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--foco)]"
              />
            ) : (
              // Un clic en la foto también la cambia. Con teclado y lector de pantalla está "Cambiar foto", debajo
              <button type="button" aria-hidden tabIndex={-1} disabled={bloqueada} onClick={abrir} className="absolute inset-0 cursor-pointer disabled:cursor-default" />
            )}
            {arrastrando && (
              <span className="absolute inset-0 grid place-items-center bg-info-fondo/90 p-4 text-center text-sm font-semibold">Suelta la foto para reemplazarla</span>
            )}
          </>
        ) : (
          <button
            type="button"
            aria-label={props.etiquetaVacia}
            disabled={bloqueada}
            onClick={abrir}
            data-invalido={props.invalida || undefined}
            aria-describedby={props.describedBy}
            className={cn(
              "flex w-full cursor-pointer flex-col items-center justify-center border-2 border-dashed text-center text-sm transition-colors",
              props.compacta ? "aspect-[4/3] gap-1 p-2" : "min-h-40 gap-2 p-4",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foco)] disabled:cursor-default",
              enSitio ? "rounded-none bg-superficie" : "rounded-lg bg-fondo",
              arrastrando
                ? enSitio
                  ? "border-rojo bg-superficie-alta"
                  : "border-info bg-info-fondo"
                : enSitio
                  ? "border-tinta-suave/50 enabled:hover:border-tinta enabled:hover:bg-superficie-alta"
                  : "border-tinta-suave/50 enabled:hover:border-info enabled:hover:bg-info-fondo",
              props.invalida && !arrastrando && "border-destructive",
            )}
          >
            <span className={cn("grid size-10 place-items-center rounded-full", enSitio ? "bg-superficie-alta text-tinta" : "bg-info-fondo text-info")}>
              <ImageUpIcon className="size-5" aria-hidden />
            </span>
            {arrastrando ? (
              <span className="font-semibold">{varias ? "Suelta las fotos aquí" : "Suelta la foto aquí"}</span>
            ) : props.compacta ? (
              <span className="font-semibold">Agregar foto</span>
            ) : (
              <>
                <span className="font-semibold pointer-coarse:hidden">{varias ? "Arrastra tus fotos aquí o haz clic para elegirlas" : "Arrastra una foto aquí o haz clic para elegirla"}</span>
                <span className="hidden font-semibold pointer-coarse:inline">{varias ? "Toca para elegir tus fotos" : "Toca para elegir una foto"}</span>
                <span className="text-tinta-suave">{props.pie ?? "JPG, PNG o WebP"}</span>
                {props.textoVacio && <span className="text-tinta-suave">{props.textoVacio}</span>}
              </>
            )}
          </button>
        )}
        {ocupada && (
          <span role="status" className="absolute inset-0 flex items-center justify-center gap-2 bg-negro/70 p-4 text-center text-sm font-semibold text-blanco">
            <LoaderCircleIcon className="size-4 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden />
            {ocupada}
          </span>
        )}
      </div>
      <input
        ref={entrada}
        id={id}
        name={props.name}
        type="file"
        accept={props.accept ?? "image/*"}
        multiple={varias}
        className="sr-only"
        tabIndex={-1}
        aria-label={props.nombreEntrada}
        aria-describedby={props.describedBy}
        onChange={(e) => {
          const archivos = [...(e.currentTarget.files ?? [])];
          if (archivos.length > 0) recibir(archivos, false);
        }}
      />
      {rechazo && <MensajeError id={`${id}-rechazo`}>{rechazo}</MensajeError>}
      {aviso && <AvisoFoto>{aviso}</AvisoFoto>}
    </div>
  );
}
