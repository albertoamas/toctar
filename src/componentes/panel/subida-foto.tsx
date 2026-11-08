import { useRef, useState, useTransition } from "react";
import { useHidratado } from "@/componentes/hidratado";
import { CameraIcon, TrashIcon } from "lucide-react";
import { avisarResultado } from "@/componentes/panel/avisos";
import { MensajeError } from "@/componentes/panel/campo";
import { AvisoFoto } from "@/componentes/panel/guia-foto";
import { VisorFotos } from "@/componentes/panel/visor-fotos";
import { ZonaFoto } from "@/componentes/panel/zona-foto";
import { Button } from "@/componentes/ui/button";
import { AVISO_FOTO_VERTICAL, esVertical, TIPOS_FOTO } from "@/lib/formato-fotos";

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
  /** `url`, la grande: la abre el visor de la variante compacta (la miniatura, si no viene). */
  actual: { miniatura: string; url?: string; ancho: number | null; alto: number | null; alt: string } | null;
  textoVacio: string;
  quitar?: () => Promise<Resultado>;
  /** La vista previa entera (un afiche vertical), en lugar de recortada al recuadro. */
  entera?: boolean;
  /** Si hay varias en la misma pantalla, de cuál es: completa el nombre de sus botones ("Subir foto: Opciones"). */
  nombre?: string;
  /**
   * Una fila al pie de una sección (pulido 13.19): la miniatura, y al lado su título y los botones o, sin foto, la guía
   * en una línea. Tocar la miniatura la abre en grande. Para fichas donde la foto acompaña a un texto.
   */
  compacta?: { titulo: string; guia: string; /** La guía también con foto: importa al cambiarla (un fondo que se recorta). */ guiaSiempre?: boolean };
};

const LADO_MAXIMO = 2400;

/** El ancho y el alto de una foto elegida, derecha según la cámara; null si el navegador no puede leerla. */
export async function medidasDeFoto(archivo: File): Promise<{ ancho: number; alto: number } | null> {
  try {
    const imagen = await createImageBitmap(archivo, { imageOrientation: "from-image" });
    const medidas = { ancho: imagen.width, alto: imagen.height };
    imagen.close();
    return medidas;
  } catch {
    return null;
  }
}

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

export function SubidaFoto({ id, accion, camposOcultos, actual, textoVacio, quitar, entera, nombre, compacta }: Props) {
  const [enGrande, setEnGrande] = useState<number | null>(null);
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

  const zona = (
    <ZonaFoto
      id={id}
      entrada={entrada}
      nombreEntrada={nombre ? `Archivo de la foto: ${nombre}` : "Archivo de la foto"}
      etiquetaVacia={nombre ? `Subir foto: ${nombre}` : "Subir foto"}
      vista={actual ? { src: actual.miniatura, alt: actual.alt } : null}
      entera={entera}
      textoVacio={textoVacio}
      ocupada={etapa === "preparando" ? "Preparando foto…" : etapa === "subiendo" ? "Subiendo…" : pendiente ? "Quitando…" : null}
      deshabilitada={!listo}
      describedBy={error ? `${id}-error` : undefined}
      alElegir={(archivo) => void subir(archivo)}
      compacta={!!compacta}
      alTocarFoto={compacta && actual ? () => setEnGrande(0) : undefined}
    />
  );
  // Una vertical se recorta; un afiche (`entera`) se ve entero y no avisa
  const vertical = actual && !entera && esVertical(actual) && <AvisoFoto>{AVISO_FOTO_VERTICAL}</AvisoFoto>;
  const botones = actual && (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" disabled={ocupado} onClick={() => entrada.current?.click()} aria-label={nombre ? `Cambiar foto: ${nombre}` : undefined}>
        <CameraIcon />
        Cambiar foto
      </Button>
      {quitar && (
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
  );
  const mensaje = error && <MensajeError id={`${id}-error`}>{error}</MensajeError>;

  if (compacta) {
    return (
      <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
        <div className="w-32 shrink-0 sm:w-40">{zona}</div>
        <div className="flex min-w-40 flex-1 flex-col gap-2">
          <p className="text-sm font-semibold">{compacta.titulo}</p>
          {actual ? (
            <>
              {compacta.guiaSiempre && <p className="text-sm text-tinta-suave">{compacta.guia}</p>}
              {botones}
            </>
          ) : (
            <p className="text-sm text-tinta-suave">
              {[compacta.guia, textoVacio].filter(Boolean).join(" ")}
            </p>
          )}
          {vertical}
          {mensaje}
        </div>
        {actual && (
          <VisorFotos
            fotos={[{ url: actual.url ?? actual.miniatura, ancho: actual.ancho, alto: actual.alto, alt: actual.alt }]}
            abierta={enGrande}
            alCambiar={setEnGrande}
            titulo={compacta.titulo}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {zona}
      {vertical}
      {botones}
      {mensaje}
    </div>
  );
}
