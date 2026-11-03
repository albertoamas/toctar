"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { CameraIcon, TrashIcon } from "lucide-react";
import { useHidratado } from "@/componentes/hidratado";
import { avisarResultado } from "@/componentes/panel/avisos";
import { MensajeError } from "@/componentes/panel/campo";
import { achicarFoto } from "@/componentes/panel/subida-foto";
import { Button } from "@/componentes/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/componentes/ui/dialog";
import type { EtapaFoto } from "@/db/esquema/trabajos";
import type { UrlsFoto } from "@/lib/fotos";
import { quitarFotoOrden, subirFotoOrden } from "../acciones";
import { FRASE_ETAPA, MAXIMO_FOTOS_ETAPA, NOMBRE_ETAPA } from "../reglas";

// HU-33 y HU-34: las fotos de una etapa de la orden (RF-40, RF-42). En el taller, con el celular: "Tomar foto" abre la
// cámara trasera; también se pueden elegir varias de la galería. Se suben de a una (achicadas en el navegador), así
// una que falla no frena a las demás. Al tocar una se ve en grande; quitarla está ahí y no en la grilla. Los dos
// botones van siempre en una fila arriba de las fotos, iguales con fotos o sin ellas (recorrido de la Entrega 2).

type FotoEnOrden = UrlsFoto & { id: number; puedeQuitar: boolean };

type Props = {
  trabajoId: number;
  etapa: EtapaFoto;
  fotos: FotoEnOrden[];
  /** Se pueden agregar y quitar (la etapa está abierta y quien mira la trabaja). */
  editable: boolean;
  /** Lo que se muestra sin fotos. */
  textoVacio: string;
};

const NO_SUBIO = "no se pudo subir. Revisa tu conexión y vuelve a intentar.";

export function FotosOrden({ trabajoId, etapa, fotos, editable, textoVacio }: Props) {
  const camara = useRef<HTMLInputElement>(null);
  const galeria = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState<{ actual: number; total: number } | null>(null);
  const [error, setError] = useState<string>();
  const [abierta, setAbierta] = useState<number | null>(null);
  const [quitando, iniciar] = useTransition();
  // Necesita JavaScript (se sube al elegir): se habilita al hidratar
  const listo = useHidratado();
  const lugares = MAXIMO_FOTOS_ETAPA - fotos.length;
  const elegida = abierta === null ? null : fotos[abierta];
  const nombre = NOMBRE_ETAPA[etapa];
  const frase = FRASE_ETAPA[etapa];
  const id = `fotos-${etapa}`;

  async function subir(elegidas: File[]) {
    setError(undefined);
    const aSubir = elegidas.slice(0, lugares);
    const errores: string[] = [];
    if (elegidas.length > lugares) errores.push(`Hasta ${MAXIMO_FOTOS_ETAPA} fotos por etapa: no se subieron ${elegidas.length - lugares}.`);
    let subidas = 0;
    for (const [i, archivo] of aSubir.entries()) {
      setSubiendo({ actual: i + 1, total: aSubir.length });
      try {
        const datos = new FormData();
        datos.set("trabajoId", String(trabajoId));
        datos.set("etapa", etapa);
        datos.set("foto", await achicarFoto(archivo));
        const r = await subirFotoOrden({}, datos);
        if (r.ok) subidas++;
        else errores.push(`${archivo.name}: ${r.errores?.foto ?? r.mensaje ?? NO_SUBIO}`);
      } catch {
        errores.push(`${archivo.name}: ${NO_SUBIO}`);
      }
    }
    setSubiendo(null);
    for (const entrada of [camara.current, galeria.current]) if (entrada) entrada.value = "";
    if (subidas > 0) avisarResultado({ ok: true, mensaje: subidas === 1 ? "Foto guardada." : `${subidas} fotos guardadas.` });
    if (errores.length > 0) setError(errores.join(" "));
  }

  function quitar(fotoId: number) {
    iniciar(async () => {
      const r = await quitarFotoOrden({ trabajoId, fotoId });
      avisarResultado(r);
      if (r.ok) setAbierta(null);
    });
  }

  const alElegir = (e: React.ChangeEvent<HTMLInputElement>) => {
    const elegidas = Array.from(e.currentTarget.files ?? []);
    if (elegidas.length > 0) void subir(elegidas);
  };
  const ocupado = !listo || subiendo !== null || lugares <= 0;
  const textoCamara = subiendo ? `Subiendo ${subiendo.actual} de ${subiendo.total}…` : lugares <= 0 ? `Ya tiene ${MAXIMO_FOTOS_ETAPA}` : "Tomar foto";

  return (
    <div className="flex flex-col gap-3">
      <h3 className="tt-titulo-sub">
        {nombre} <span className="text-sm font-normal text-tinta-suave">({fotos.length})</span>
      </h3>

      {fotos.length === 0 && !editable && <p className="text-sm text-tinta-suave">{textoVacio}</p>}
      {/* Los dos caminos para sumar fotos, iguales y juntos, arriba de las fotos: con muchas, la cámara sigue a mano */}
      {editable && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={ocupado} onClick={() => camara.current?.click()} aria-describedby={error ? `${id}-error` : undefined}>
            <CameraIcon />
            {textoCamara}
          </Button>
          <Button type="button" variant="outline" disabled={ocupado} onClick={() => galeria.current?.click()} aria-describedby={error ? `${id}-error` : undefined}>
            Elegir de la galería
          </Button>
          <input ref={camara} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} aria-label={`Cámara para fotos ${frase}`} onChange={alElegir} />
          <input ref={galeria} type="file" accept="image/*" multiple className="sr-only" tabIndex={-1} aria-label={`Fotos ${frase} desde la galería`} onChange={alElegir} />
        </div>
      )}
      {fotos.length > 0 && (
        <ul aria-label={`Fotos ${frase}`} className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {fotos.map((f, i) => (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => setAbierta(i)}
                className="block aspect-square w-full overflow-hidden rounded-sm bg-superficie focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foco)]"
                aria-label={`Ver la foto ${i + 1} ${frase}`}
              >
                <Image src={f.miniatura} alt="" width={f.ancho ?? 640} height={f.alto ?? 640} unoptimized className="size-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <MensajeError id={`${id}-error`}>{error}</MensajeError>}

      <Dialog open={elegida !== null} onOpenChange={(abrir) => !abrir && setAbierta(null)}>
        {elegida && (
          <DialogContent className="max-h-[calc(100dvh-2rem)] gap-4 overflow-y-auto p-4 sm:max-w-4xl">
            <DialogTitle>
              {nombre}: foto {abierta! + 1} de {fotos.length}
            </DialogTitle>
            <Image src={elegida.url} alt={`Foto ${abierta! + 1} ${frase}`} width={elegida.ancho ?? 1600} height={elegida.alto ?? 1200} unoptimized className="max-h-[70dvh] w-full bg-superficie object-contain" />
            {/* Quitar no depende de poder subir: una foto de durante (de antes del pedido 27) se quita mientras la orden esté abierta */}
            {elegida.puedeQuitar && (
              <div>
                <Button type="button" variant="outline" disabled={quitando} onClick={() => quitar(elegida.id)}>
                  <TrashIcon />
                  {quitando ? "Quitando…" : "Quitar foto"}
                </Button>
              </div>
            )}
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
