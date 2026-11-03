import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { useHidratado } from "@/componentes/hidratado";
import { CameraIcon, ImageIcon, TrashIcon } from "lucide-react";
import { avisarResultado } from "@/componentes/panel/avisos";
import { MensajeError } from "@/componentes/panel/campo";
import { Button } from "@/componentes/ui/button";
import { TIPOS_FOTO } from "@/lib/formato-fotos";

// Componente de cliente: se usa dentro de otros componentes de cliente (recibe funciones como props).
// Subida de una foto desde el panel (servicios, galería). Antes de enviarla se achica en el navegador
// (lado mayor 2400 px, JPEG): una foto de celular pasa de 4–12 MB a menos de 1 MB y sube rápido en 4G.
// El servidor la vuelve a convertir y la valida (src/lib/fotos.ts).

type Resultado = { ok?: boolean; mensaje?: string; errores?: Partial<Record<string, string>> };

type Props = {
  id: string;
  /** Acción que recibe la foto en el campo "foto" más los campos ocultos. */
  accion: (previo: Resultado, datos: FormData) => Promise<Resultado>;
  camposOcultos: Record<string, string | number>;
  actual: { miniatura: string; ancho: number | null; alto: number | null; alt: string } | null;
  textoVacio: string;
  quitar?: () => Promise<Resultado>;
  /** La vista previa entera (un afiche vertical), en lugar de recortada al recuadro. */
  entera?: boolean;
  /** Si hay varias en la misma pantalla, de cuál es: completa el nombre de sus botones ("Subir foto: Opciones"). */
  nombre?: string;
};

const LADO_MAXIMO = 2400;

/** Achica la foto en el navegador. Si no puede (formato raro), manda la original y decide el servidor. */
export async function achicarFoto(archivo: File): Promise<File> {
  try {
    const imagen = await createImageBitmap(archivo, { imageOrientation: "from-image" });
    const escala = Math.min(1, LADO_MAXIMO / Math.max(imagen.width, imagen.height));
    if (escala === 1 && archivo.size < 1_500_000 && (TIPOS_FOTO as readonly string[]).includes(archivo.type)) return archivo;
    const lienzo = document.createElement("canvas");
    lienzo.width = Math.round(imagen.width * escala);
    lienzo.height = Math.round(imagen.height * escala);
    lienzo.getContext("2d")?.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
    const blob = await new Promise<Blob | null>((listo) => lienzo.toBlob(listo, "image/jpeg", 0.88));
    if (!blob) return archivo;
    return new File([blob], archivo.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return archivo;
  }
}

export function SubidaFoto({ id, accion, camposOcultos, actual, textoVacio, quitar, entera, nombre }: Props) {
  const entrada = useRef<HTMLInputElement>(null);
  const [etapa, setEtapa] = useState<"preparando" | "subiendo" | null>(null);
  const [error, setError] = useState<string>();
  const [pendiente, iniciar] = useTransition();
  // Necesita JavaScript (se sube al elegir el archivo): se habilita al hidratar.
  const listo = useHidratado();
  const ocupado = !listo || etapa !== null || pendiente;

  async function subir(archivo: File) {
    setError(undefined);
    setEtapa("preparando");
    const foto = await achicarFoto(archivo);
    setEtapa("subiendo");
    const datos = new FormData();
    for (const [clave, valor] of Object.entries(camposOcultos)) datos.set(clave, String(valor));
    datos.set("foto", foto);
    iniciar(async () => {
      try {
        const r = await accion({}, datos);
        if (r.ok) avisarResultado({ ok: true, mensaje: r.mensaje ?? "Foto guardada." });
        else setError(r.errores?.foto ?? r.mensaje ?? "No se pudo subir la foto. Vuelve a intentar.");
      } catch {
        setError("No se pudo subir la foto. Revisa tu conexión y vuelve a intentar.");
      } finally {
        setEtapa(null);
        if (entrada.current) entrada.current.value = "";
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* La foto llena la caja (fill: absolute adentro): con h-full, Safari no toma la altura de una caja con aspect-ratio
          como fija y la foto estiraba la caja (como el logo de Negocio, 03/11) */}
      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-sm border border-border bg-superficie">
        {actual ? (
          <Image
            src={actual.miniatura}
            alt={actual.alt}
            fill
            sizes="(min-width: 1024px) 24rem, 100vw"
            unoptimized
            className={entera ? "object-contain" : "object-cover"}
          />
        ) : (
          <span className="flex flex-col items-center gap-2 p-4 text-center text-sm text-tinta-suave">
            <ImageIcon className="size-8" aria-hidden />
            {textoVacio}
          </span>
        )}
      </div>

      <input
        ref={entrada}
        id={id}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-label={nombre ? `Archivo de la foto: ${nombre}` : "Archivo de la foto"}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(e) => {
          const archivo = e.currentTarget.files?.[0];
          if (archivo) void subir(archivo);
        }}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={ocupado}
          onClick={() => entrada.current?.click()}
          aria-label={nombre && !etapa ? `${actual ? "Cambiar foto" : "Subir foto"}: ${nombre}` : undefined}
        >
          <CameraIcon />
          {etapa === "preparando" ? "Preparando foto…" : etapa === "subiendo" ? "Subiendo…" : actual ? "Cambiar foto" : "Subir foto"}
        </Button>
        {actual && quitar && (
          <Button
            type="button"
            variant="ghost"
            disabled={ocupado}
            aria-label={nombre ? `Quitar foto: ${nombre}` : undefined}
            onClick={() =>
              iniciar(async () => {
                avisarResultado(await quitar());
              })
            }
          >
            <TrashIcon />
            Quitar foto
          </Button>
        )}
      </div>
      {error && <MensajeError id={`${id}-error`}>{error}</MensajeError>}
    </div>
  );
}
