"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TrashIcon, VideoIcon } from "lucide-react";
import { useHidratado } from "@/componentes/hidratado";
import { avisarResultado } from "@/componentes/panel/avisos";
import { MensajeError } from "@/componentes/panel/campo";
import { Button } from "@/componentes/ui/button";
import { BYTES_MAXIMOS_VIDEO, MENSAJE_VIDEO_PESADO, TIPOS_VIDEO } from "@/lib/formato-videos";
import { quitarVideoDePortada } from "../acciones";
import type { VideoPortada } from "../consultas";

// El video de "Mira cómo trabajamos" (pedido 48, `etapas/P48-video-tiktok.md` §5): una fila compacta al pie de la
// portada, como la foto del taller. Sube por la ruta /panel/sitio/video con XMLHttpRequest, que informa el avance
// (fetch no lo hace con una subida): 20 MB con datos del celular tardan, y sin la barra parece trabado.

const ID = "video-portada";
const GUIA = 'Opcional. Se ve dentro del celular de "Mira cómo trabajamos". MP4 de hasta 30 segundos y 20 MB.';
const SIN_CONEXION = "No se pudo subir el video. Revisa la conexión y vuelve a intentar.";

type Resultado = { ok: boolean; mensaje: string };

/** Manda el archivo crudo a la ruta y avisa el avance (de 0 a 100). */
function enviar(archivo: File, alAvanzar: (porcentaje: number) => void): Promise<Resultado> {
  return new Promise((listo) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/panel/sitio/video");
    xhr.setRequestHeader("Content-Type", archivo.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => e.lengthComputable && alAvanzar(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      // Sin sesión o sin permiso, la ruta redirige a una página: no llega JSON
      if (xhr.responseURL.includes("/ingresar")) return listo({ ok: false, mensaje: "Tu sesión terminó. Vuelve a ingresar." });
      if (xhr.responseURL.includes("/sin-acceso")) return listo({ ok: false, mensaje: "No tienes permiso para cambiar el sitio web." });
      try {
        const r = JSON.parse(xhr.responseText) as Resultado;
        listo(typeof r.mensaje === "string" ? r : { ok: false, mensaje: SIN_CONEXION });
      } catch {
        listo({ ok: false, mensaje: SIN_CONEXION });
      }
    };
    xhr.onerror = () => listo({ ok: false, mensaje: SIN_CONEXION });
    xhr.send(archivo);
  });
}

export function VideoDePortada({ video, hayTikTok }: { video: VideoPortada | null; hayTikTok: boolean }) {
  const entrada = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [avance, setAvance] = useState<number | null>(null);
  const [error, setError] = useState<string>();
  const [quitando, iniciar] = useTransition();
  const listo = useHidratado();
  const ocupado = !listo || avance !== null || quitando;

  async function subir(archivo: File) {
    setError(undefined);
    // El tope lo cuenta el servidor; aquí solo se evita mandar 50 MB para enterarse después
    if (archivo.size > BYTES_MAXIMOS_VIDEO) {
      setError(MENSAJE_VIDEO_PESADO);
      return;
    }
    setAvance(0);
    const r = await enviar(archivo, setAvance);
    setAvance(null);
    if (entrada.current) entrada.current.value = "";
    if (!r.ok) {
      setError(r.mensaje);
      return;
    }
    avisarResultado(r);
    router.refresh();
  }

  return (
    <section aria-label="Video de TikTok" className="border-t border-border pt-4">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
        {video && (
          <video
            src={video.url}
            muted
            controls
            playsInline
            preload="metadata"
            aria-label="Video de TikTok de la portada"
            className="aspect-[9/16] w-24 shrink-0 rounded-lg bg-black object-cover sm:w-28"
          />
        )}
        <div className="flex min-w-40 flex-1 flex-col gap-2">
          <p className="text-sm font-semibold">Video de TikTok</p>
          <p className="text-sm text-tinta-suave">{GUIA}</p>
          {!hayTikTok && <p className="text-sm text-tinta-suave">Se muestra cuando cargues el enlace de TikTok en Configuración &gt; Negocio.</p>}
          <input
            ref={entrada}
            id={ID}
            type="file"
            accept={TIPOS_VIDEO.join(",")}
            className="sr-only"
            tabIndex={-1}
            aria-label="Archivo del video de TikTok"
            aria-describedby={error ? `${ID}-error` : undefined}
            onChange={(e) => {
              const archivo = e.target.files?.[0];
              if (archivo) void subir(archivo);
            }}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={ocupado} onClick={() => entrada.current?.click()}>
              <VideoIcon />
              {video ? "Cambiar video" : "Subir video"}
            </Button>
            {video && (
              <Button
                type="button"
                variant="ghost"
                disabled={ocupado}
                onClick={() =>
                  iniciar(async () => {
                    avisarResultado(await quitarVideoDePortada());
                  })
                }
              >
                <TrashIcon />
                Quitar video
              </Button>
            )}
          </div>
          {avance !== null && (
            <div className="flex flex-col gap-1" role="status">
              <p className="text-sm tabular-nums">Subiendo el video: {avance} %</p>
              <div className="h-1.5 w-full max-w-64 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-tinta transition-[width]" style={{ width: `${avance}%` }} />
              </div>
            </div>
          )}
          {error && <MensajeError id={`${ID}-error`}>{error}</MensajeError>}
        </div>
      </div>
    </section>
  );
}
