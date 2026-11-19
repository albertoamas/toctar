"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { avisarResultado } from "@/componentes/panel/avisos";
import { Campo, MensajeError } from "@/componentes/panel/campo";
import { AvisoFoto, GuiaFoto } from "@/componentes/panel/guia-foto";
import { Selector } from "@/componentes/panel/selector";
import { achicarFoto, medidasDeFoto } from "@/componentes/panel/subida-foto";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { avisosDeGaleria } from "@/lib/formato-fotos";
import type { EstadoFormulario } from "@/lib/formularios";
import { subirGaleria } from "../acciones/galeria";
import { useCambioFueraDelFormulario, useCerrarModal } from "@/componentes/panel/modal-contexto";
import { CancelarModal, PieModal } from "@/componentes/panel/modal-pie";
import { ElegirFoto } from "@/componentes/panel/elegir-foto";
import type { Servicio } from "./galeria-comun";

// Galería (HU-09): subir un trabajo, un par (antes y después) o una foto sola, con su vista previa.
// Las fotos se achican en el navegador antes de subir.

const sinSuscripcion = () => () => {};

/** La vista previa de una foto elegida: un enlace local, que se libera al cambiar la foto o al desmontarse. */
function useVistaDe(archivo: File | null): string | null {
  const vista = useMemo(() => (archivo ? URL.createObjectURL(archivo) : null), [archivo]);
  useEffect(() => () => {
    if (vista) URL.revokeObjectURL(vista);
  }, [vista]);
  return vista;
}

export function SubirFotos({ servicios }: { servicios: Servicio[] }) {
  const cerrar = useCerrarModal();
  const [despues, setDespues] = useState<File | null>(null);
  const [antes, setAntes] = useState<File | null>(null);
  // La vista de cada foto elegida: un enlace local del navegador, que se libera al cambiarla y al cerrar el modal
  const vistaAntes = useVistaDe(antes);
  const vistaDespues = useVistaDe(despues);
  // Las medidas de cada foto elegida, para avisar antes de subir. Se leen aparte: la última elegida es la que vale
  const [medidas, setMedidas] = useState<Record<"antes" | "despues", { ancho: number; alto: number } | null>>({ antes: null, despues: null });
  const ultima = useRef<Record<"antes" | "despues", File | null>>({ antes: null, despues: null });
  const [etapa, setEtapa] = useState<"preparando" | "subiendo" | null>(null);
  const [estado, setEstado] = useState<EstadoFormulario>({});
  const [, iniciar] = useTransition();
  const formulario = useRef<HTMLFormElement>(null);
  const listo = useSyncExternalStore(sinSuscripcion, () => true, () => false);
  const e = estado.errores ?? {};
  useFocoEnError(formulario, estado);
  // Las fotos no son campos del formulario: elegidas, el modal pregunta antes de cerrarse sin querer
  useCambioFueraDelFormulario(!!antes || !!despues);

  async function elegir(lado: "antes" | "despues", archivo: File | null) {
    (lado === "antes" ? setAntes : setDespues)(archivo);
    ultima.current[lado] = archivo;
    setMedidas((m) => ({ ...m, [lado]: null }));
    const leidas = archivo ? await medidasDeFoto(archivo) : null;
    if (ultima.current[lado] === archivo) setMedidas((m) => ({ ...m, [lado]: leidas }));
  }

  async function enviar(evento: React.SyntheticEvent<HTMLFormElement, SubmitEvent>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    setEtapa("preparando");
    datos.set("despues", despues ? await achicarFoto(despues) : new File([], ""));
    if (antes) datos.set("antes", await achicarFoto(antes));
    setEtapa("subiendo");
    iniciar(async () => {
      try {
        const r = await subirGaleria({}, datos);
        setEstado(r);
        avisarResultado(r);
        if (r.ok) cerrar();
      } catch {
        setEstado({ mensaje: "No se pudieron subir las fotos. Revisa tu conexión y vuelve a intentar." });
      } finally {
        setEtapa(null);
      }
    });
  }

  return (
    <form ref={formulario} onSubmit={enviar} className="flex flex-col gap-5" noValidate>
      <p className="text-sm text-tinta-suave">Un par de antes y después, o solo la foto del resultado.</p>
      <GuiaFoto titulo="Cómo sacar estas fotos" consejo="El auto, al centro. Antes y después, desde el mismo lugar y la misma distancia." />

      {/* Lado a lado desde la tableta; en el celular, una debajo de la otra (dos botones cada una no entran de a dos) */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold">
            Antes <span className="font-normal text-tinta-suave">(opcional)</span>
          </span>
          <ElegirFoto id="foto-antes" de="del antes" vista={vistaAntes} alElegir={(f) => void elegir("antes", f)} quitable error={e.antes} />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold">Después</span>
          <ElegirFoto id="foto-despues" de="del después" vista={vistaDespues} alElegir={(f) => void elegir("despues", f)} quitable error={e.despues} />
        </div>
      </div>
      {avisosDeGaleria(medidas.antes, medidas.despues).map((aviso) => (
        <AvisoFoto key={aviso}>{aviso}</AvisoFoto>
      ))}

      <Campo id="servicio" etiqueta="Servicio" error={e.servicioId}>
        <Selector id="servicio" name="servicioId" defaultValue={estado.valores?.servicioId ?? ""} aria-invalid={!!e.servicioId} aria-describedby={e.servicioId ? "servicio-error" : undefined}>
          <option value="">Elige el servicio</option>
          {servicios.map((s) => (
            <option key={s.id} value={s.id}>{s.nombre}</option>
          ))}
        </Selector>
      </Campo>
      <Campo id="descripcion" etiqueta="Descripción" opcional error={e.descripcion} ayuda='La leen Google y los lectores de pantalla, y se ve debajo de la foto si va en la portada. Ejemplo: "Pulido y nano cerámico 5 años en una Hilux".'>
        <Input id="descripcion" name="descripcion" autoComplete="off" defaultValue={estado.valores?.descripcion} aria-invalid={!!e.descripcion} aria-describedby={e.descripcion ? "descripcion-error" : "descripcion-ayuda"} />
      </Campo>

      {estado.mensaje && !estado.ok && <MensajeError id="subir-error">{estado.mensaje}</MensajeError>}
      <PieModal>
        <Button type="submit" disabled={!listo || etapa !== null}>
          {etapa === "preparando" ? "Preparando fotos…" : etapa === "subiendo" ? "Subiendo…" : "Guardar en la galería"}
        </Button>
        {/* Mientras achica y sube, no se cierra: se perdería la subida a medias */}
        <CancelarModal enviando={etapa !== null} />
      </PieModal>
    </form>
  );
}
