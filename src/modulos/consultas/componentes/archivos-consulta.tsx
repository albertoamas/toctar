"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { useHidratado } from "@/componentes/hidratado";
import { CameraIcon, PlayIcon, TrashIcon } from "lucide-react";
import { avisarResultado } from "@/componentes/panel/avisos";
import { MensajeError } from "@/componentes/panel/campo";
import { achicarFoto } from "@/componentes/panel/subida-foto";
import { Button } from "@/componentes/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/componentes/ui/dialog";
import { pedirSubidaVideo, quitarArchivoConsulta, registrarVideo, subirArchivoConsulta } from "../acciones";
import type { ArchivoConsulta } from "../consultas";
import { BYTES_MAXIMOS_VIDEO, duracionPermitida, MAXIMO_ARCHIVOS, MEGAS_MAXIMOS_VIDEO, SEGUNDOS_MAXIMOS_VIDEO, textoSubidos, TIPOS_VIDEO } from "../reglas";

// HU-24: fotos y videos de la consulta (RF-29). Se eligen varios a la vez y se suben de a uno, así uno que falla no
// frena a los demás. Las fotos se achican en el navegador, como en el resto del panel. Los videos no se procesan: el
// navegador mide su duración, pide un permiso firmado y los sube directo al bucket privado, con el avance a la vista
// (50 MB en 4G tardan). Al tocar uno se ve en grande; quitarlo está ahí y no en la grilla, para no borrarlo sin querer.

type Props = { consultaId: number; archivos: ArchivoConsulta[] };
type Resultado = { ok: true; tipo: "foto" | "video" } | { ok: false; error: string };

const NO_SUBIO = "no se pudo subir. Revisa tu conexión y vuelve a intentar.";

/** "0:42". */
const minutos = (segundos: number) => `${Math.floor(segundos / 60)}:${String(Math.round(segundos) % 60).padStart(2, "0")}`;

/** Duración del video en segundos, o null si el navegador no puede leerlo. */
function medirDuracion(archivo: File): Promise<number | null> {
  return new Promise((listo) => {
    const url = URL.createObjectURL(archivo);
    const video = document.createElement("video");
    const terminar = (duracion: number | null) => {
      URL.revokeObjectURL(url);
      listo(duracion !== null && Number.isFinite(duracion) ? duracion : null);
    };
    video.preload = "metadata";
    video.muted = true;
    video.onerror = () => terminar(null);
    video.onloadedmetadata = () => {
      if (Number.isFinite(video.duration)) return terminar(video.duration);
      // Algunos WebM (los grabados en el navegador) no dicen su duración hasta recorrerlos: se salta al final
      video.ondurationchange = () => Number.isFinite(video.duration) && terminar(video.duration);
      video.currentTime = Number.MAX_SAFE_INTEGER;
    };
    setTimeout(() => terminar(null), 15_000);
    video.src = url;
  });
}

/** Sube el archivo con el permiso firmado; avisa el avance de 0 a 1. */
function subirDirecto(url: string, archivo: File, alAvanzar: (parte: number) => void): Promise<boolean> {
  return new Promise((listo) => {
    const pedido = new XMLHttpRequest();
    pedido.open("PUT", url);
    pedido.setRequestHeader("Content-Type", archivo.type);
    pedido.upload.onprogress = (e) => e.lengthComputable && alAvanzar(e.loaded / e.total);
    pedido.onload = () => listo(pedido.status >= 200 && pedido.status < 300);
    pedido.onerror = () => listo(false);
    pedido.send(archivo);
  });
}

export function ArchivosConsulta({ consultaId, archivos }: Props) {
  const entrada = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState<{ actual: number; total: number; avance: number | null } | null>(null);
  const [error, setError] = useState<string>();
  const [abierto, setAbierto] = useState<number | null>(null);
  const [quitando, iniciar] = useTransition();
  // Necesita JavaScript (se sube al elegir los archivos): se habilita al hidratar
  const listo = useHidratado();
  const lugares = MAXIMO_ARCHIVOS - archivos.length;
  const elegido = abierto === null ? null : archivos[abierto];

  async function subirFoto(archivo: File): Promise<Resultado> {
    const datos = new FormData();
    datos.set("id", String(consultaId));
    datos.set("foto", await achicarFoto(archivo));
    const r = await subirArchivoConsulta({}, datos);
    return r.ok ? { ok: true, tipo: "foto" } : { ok: false, error: r.errores?.foto ?? r.mensaje ?? NO_SUBIO };
  }

  async function subirVideo(archivo: File, alAvanzar: (parte: number) => void): Promise<Resultado> {
    if (!(TIPOS_VIDEO as readonly string[]).includes(archivo.type)) return { ok: false, error: "el video debe ser MP4, MOV o WebM." };
    if (archivo.size > BYTES_MAXIMOS_VIDEO) return { ok: false, error: `el video puede pesar hasta ${MEGAS_MAXIMOS_VIDEO} MB.` };
    const duracion = await medirDuracion(archivo);
    if (duracion === null) return { ok: false, error: "no se pudo leer el video." };
    if (!duracionPermitida(duracion)) return { ok: false, error: `el video puede durar hasta ${SEGUNDOS_MAXIMOS_VIDEO} segundos.` };

    const permiso = await pedirSubidaVideo({ consultaId, tipo: archivo.type, bytes: archivo.size, duracion });
    if (!permiso.ok) return { ok: false, error: permiso.mensaje };
    alAvanzar(0);
    if (!(await subirDirecto(permiso.url, archivo, alAvanzar))) return { ok: false, error: NO_SUBIO };
    const r = await registrarVideo({ consultaId, clave: permiso.clave, duracion });
    return r.ok ? { ok: true, tipo: "video" } : { ok: false, error: r.mensaje ?? NO_SUBIO };
  }

  async function subir(elegidos: File[]) {
    setError(undefined);
    const aSubir = elegidos.slice(0, lugares);
    const errores: string[] = [];
    if (elegidos.length > lugares) errores.push(`Hasta ${MAXIMO_ARCHIVOS} fotos o videos por consulta: no se subieron ${elegidos.length - lugares}.`);
    const subidos = { foto: 0, video: 0 };
    for (const [i, archivo] of aSubir.entries()) {
      const avanzar = (avance: number | null) => setSubiendo({ actual: i + 1, total: aSubir.length, avance });
      avanzar(null);
      try {
        const r = archivo.type.startsWith("video/") ? await subirVideo(archivo, avanzar) : await subirFoto(archivo);
        if (r.ok) subidos[r.tipo]++;
        else errores.push(`${archivo.name}: ${r.error}`);
      } catch {
        errores.push(`${archivo.name}: ${NO_SUBIO}`);
      }
    }
    setSubiendo(null);
    if (entrada.current) entrada.current.value = "";
    const mensaje = textoSubidos(subidos.foto, subidos.video);
    if (mensaje) avisarResultado({ ok: true, mensaje });
    if (errores.length > 0) setError(errores.join(" "));
  }

  function quitar(archivoId: number) {
    iniciar(async () => {
      const r = await quitarArchivoConsulta({ consultaId, archivoId });
      avisarResultado(r);
      if (r.ok) setAbierto(null);
    });
  }

  const nombre = (a: ArchivoConsulta, i: number) => `${a.tipo === "video" ? "el video" : "la foto"} ${i + 1}`;

  return (
    <section aria-labelledby="fotos-titulo" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="fotos-titulo" className="font-heading text-2xl font-bold italic">Fotos y videos</h2>
        <p id="fotos-ayuda" className="text-sm text-tinta-suave">
          Hasta {MAXIMO_ARCHIVOS}; videos de hasta {SEGUNDOS_MAXIMOS_VIDEO} segundos.
        </p>
      </div>

      {archivos.length > 0 && (
        <ul aria-label="Fotos y videos de la consulta" className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
          {archivos.map((a, i) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => setAbierto(i)}
                className="relative block aspect-square w-full overflow-hidden rounded-sm bg-superficie focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foco)]"
                aria-label={`Ver ${nombre(a, i)}`}
              >
                {a.tipo === "foto" ? (
                  <Image src={a.miniatura} alt="" width={a.ancho ?? 640} height={a.alto ?? 640} unoptimized className="size-full object-cover" />
                ) : (
                  // Sin miniatura (el video no se procesa): el ícono y la duración
                  <span className="flex size-full flex-col items-center justify-center gap-1 bg-negro text-blanco">
                    <PlayIcon className="size-8" aria-hidden />
                    {a.duracion !== null && <span className="text-sm font-semibold">{minutos(a.duracion)}</span>}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={entrada}
        type="file"
        accept="image/*,video/*"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-label="Archivos de fotos o videos"
        onChange={(e) => {
          const elegidos = Array.from(e.currentTarget.files ?? []);
          if (elegidos.length > 0) void subir(elegidos);
        }}
      />
      <div>
        <Button
          type="button"
          variant="outline"
          disabled={!listo || subiendo !== null || lugares <= 0}
          onClick={() => entrada.current?.click()}
          aria-describedby={error ? "fotos-error" : "fotos-ayuda"}
        >
          <CameraIcon />
          {subiendo
            ? `Subiendo ${subiendo.actual} de ${subiendo.total}…${subiendo.avance !== null ? ` ${Math.round(subiendo.avance * 100)} %` : ""}`
            : lugares <= 0
              ? `Ya tiene ${MAXIMO_ARCHIVOS}`
              : "Agregar fotos o videos"}
        </Button>
      </div>
      {error && <MensajeError id="fotos-error">{error}</MensajeError>}

      <Dialog open={elegido !== null} onOpenChange={(abrir) => !abrir && setAbierto(null)}>
        {elegido && (
          <DialogContent className="max-h-[calc(100dvh-2rem)] gap-4 overflow-y-auto p-4 sm:max-w-4xl">
            <DialogTitle>
              {elegido.tipo === "video" ? "Video" : "Foto"} {abierto! + 1} de {archivos.length}
            </DialogTitle>
            {elegido.tipo === "foto" ? (
              <Image src={elegido.url} alt={`Foto ${abierto! + 1} de la consulta`} width={elegido.ancho ?? 1600} height={elegido.alto ?? 1200} unoptimized className="max-h-[70dvh] w-full bg-superficie object-contain" />
            ) : (
              <video src={elegido.url} controls playsInline preload="metadata" aria-label={`Video ${abierto! + 1} de la consulta`} className="max-h-[70dvh] w-full bg-negro" />
            )}
            <div>
              <Button type="button" variant="outline" disabled={quitando} onClick={() => quitar(elegido.id)}>
                <TrashIcon />
                {quitando ? "Quitando…" : elegido.tipo === "video" ? "Quitar video" : "Quitar foto"}
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </section>
  );
}
