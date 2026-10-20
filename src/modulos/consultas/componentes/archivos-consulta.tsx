"use client";

import Image from "next/image";
import { useRef, useState, useSyncExternalStore, useTransition } from "react";
import { CameraIcon, TrashIcon } from "lucide-react";
import { avisarResultado } from "@/componentes/panel/avisos";
import { MensajeError } from "@/componentes/panel/campo";
import { achicarFoto } from "@/componentes/panel/subida-foto";
import { Button } from "@/componentes/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/componentes/ui/dialog";
import { quitarArchivoConsulta, subirArchivoConsulta } from "../acciones";
import type { ArchivoConsulta } from "../consultas";
import { MAXIMO_ARCHIVOS } from "../reglas";

// HU-24: fotos de la consulta (RF-29). Se eligen varias a la vez y se suben de a una (achicadas en el navegador, como
// en el resto del panel), así una que falla no frena a las demás. Al tocar una se ve en grande; quitarla está ahí y
// no en la grilla, para no borrarla sin querer: se borra también del almacenamiento.

type Props = { consultaId: number; archivos: ArchivoConsulta[] };

const sinSuscripcion = () => () => {};

export function FotosConsulta({ consultaId, archivos }: Props) {
  const entrada = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState<{ actual: number; total: number } | null>(null);
  const [error, setError] = useState<string>();
  const [abierta, setAbierta] = useState<number | null>(null);
  const [quitando, iniciar] = useTransition();
  // Necesita JavaScript (se sube al elegir los archivos): se habilita al hidratar
  const listo = useSyncExternalStore(sinSuscripcion, () => true, () => false);
  const lugares = MAXIMO_ARCHIVOS - archivos.length;
  const foto = abierta === null ? null : archivos[abierta];

  async function subir(elegidos: File[]) {
    setError(undefined);
    const aSubir = elegidos.slice(0, lugares);
    const errores: string[] = [];
    if (elegidos.length > lugares) errores.push(`Hasta ${MAXIMO_ARCHIVOS} fotos o videos por consulta: no se subieron ${elegidos.length - lugares}.`);
    let subidas = 0;
    for (const [i, archivo] of aSubir.entries()) {
      setSubiendo({ actual: i + 1, total: aSubir.length });
      try {
        const datos = new FormData();
        datos.set("id", String(consultaId));
        datos.set("foto", await achicarFoto(archivo));
        const r = await subirArchivoConsulta({}, datos);
        if (r.ok) subidas++;
        else errores.push(`${archivo.name}: ${r.errores?.foto ?? r.mensaje ?? "no se pudo subir."}`);
      } catch {
        errores.push(`${archivo.name}: no se pudo subir. Revisa tu conexión y vuelve a intentar.`);
      }
    }
    setSubiendo(null);
    if (entrada.current) entrada.current.value = "";
    if (subidas > 0) avisarResultado({ ok: true, mensaje: subidas === 1 ? "Foto agregada." : `${subidas} fotos agregadas.` });
    if (errores.length > 0) setError(errores.join(" "));
  }

  function quitar(archivoId: number) {
    iniciar(async () => {
      const r = await quitarArchivoConsulta({ consultaId, archivoId });
      avisarResultado(r);
      if (r.ok) setAbierta(null);
    });
  }

  return (
    <section aria-labelledby="fotos-titulo" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="fotos-titulo" className="font-heading text-2xl font-bold italic">Fotos y videos</h2>
        <p id="fotos-ayuda" className="text-sm text-tinta-suave">Lo que mandó el cliente o lo que viste en el taller. Hasta {MAXIMO_ARCHIVOS}.</p>
      </div>

      {archivos.length > 0 && (
        <ul aria-label="Fotos de la consulta" className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
          {archivos.map((a, i) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => setAbierta(i)}
                className="block aspect-square w-full overflow-hidden rounded-sm bg-superficie focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foco)]"
                aria-label={`Ver la foto ${i + 1}`}
              >
                <Image src={a.miniatura} alt="" width={a.ancho ?? 640} height={a.alto ?? 640} unoptimized className="size-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={entrada}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-label="Archivos de las fotos"
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
          {subiendo ? `Subiendo ${subiendo.actual} de ${subiendo.total}…` : lugares <= 0 ? "Ya tiene 10 fotos" : "Agregar fotos"}
        </Button>
      </div>
      {error && <MensajeError id="fotos-error">{error}</MensajeError>}

      <Dialog open={foto !== null} onOpenChange={(abrir) => !abrir && setAbierta(null)}>
        {foto && (
          <DialogContent className="max-h-[calc(100dvh-2rem)] gap-4 overflow-y-auto p-4 sm:max-w-4xl">
            <DialogTitle>Foto {abierta! + 1} de {archivos.length}</DialogTitle>
            <Image src={foto.url} alt={`Foto ${abierta! + 1} de la consulta`} width={foto.ancho ?? 1600} height={foto.alto ?? 1200} unoptimized className="max-h-[70dvh] w-full bg-superficie object-contain" />
            <div>
              <Button type="button" variant="outline" disabled={quitando} onClick={() => quitar(foto.id)}>
                <TrashIcon />
                {quitando ? "Quitando…" : "Quitar foto"}
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </section>
  );
}
