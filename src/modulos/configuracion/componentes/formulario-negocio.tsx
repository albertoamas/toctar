"use client";

import { useActionState, useRef, useState } from "react";
import { ExternalLinkIcon } from "lucide-react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { conAviso } from "@/componentes/panel/avisos";
import { SeccionFormulario } from "@/componentes/panel/seccion-formulario";
import { Campo, MensajeError } from "@/componentes/panel/campo";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
import type { DiaHorario } from "@/lib/horarios";
import { enlaceMapa, leerEnlaceMapa } from "@/lib/ubicacion";
import type { EstadoFormulario } from "@/lib/formularios";
import { guardarNegocio } from "../acciones";
import { NOMBRE_RED, REDES } from "../esquemas";
import { EditorHorarios } from "./editor-horarios";

type Props = {
  /** Valores iniciales, ya como texto de los campos. */
  valores: Record<string, string>;
  horarios: DiaHorario[];
};

// El aviso sale desde la acción: el formulario se vuelve a pintar con los datos guardados.
const guardarConAviso = conAviso(guardarNegocio);

export function FormularioNegocio(props: Props) {
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(guardarConAviso, {});
  const [horarios, setHorarios] = useState(props.horarios);
  const v = estado.valores ?? props.valores;
  const e = estado.errores ?? {};
  const describir = (campo: string, conAyuda = false) =>
    e[campo] ? `${campo}-error` : conAyuda ? `${campo}-ayuda` : undefined;

  // "Ver en el mapa": lo guardado, para revisar que abre el taller
  const enlace = v.enlaceMapa ? leerEnlaceMapa(v.enlaceMapa) : null;
  const verEnMapa = enlace?.ok && enlace.valor ? (enlace.valor.enlace ?? (enlace.valor.coordenadas && enlaceMapa(enlace.valor.coordenadas))) : null;
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);

  return (
    <form ref={formulario} action={accion} className="flex max-w-2xl flex-col gap-6" noValidate>
      <SeccionFormulario titulo="Contacto">
        <Campo id="nombre" etiqueta="Nombre del negocio" error={e.nombre}>
          <Input id="nombre" name="nombre" defaultValue={v.nombre} aria-invalid={!!e.nombre} aria-describedby={describir("nombre")} />
        </Campo>
        <Campo id="whatsapp" etiqueta="WhatsApp" error={e.whatsapp} ayuda="El número al que escriben los clientes desde la página.">
          <div className="flex items-center gap-2">
            <span className="text-tinta-suave">+591</span>
            <Input
              id="whatsapp"
              name="whatsapp"
              type="tel"
              inputMode="tel"
              autoComplete="off"
              placeholder="71234567"
              defaultValue={v.whatsapp}
              aria-invalid={!!e.whatsapp}
              aria-describedby={describir("whatsapp", true)}
              className="max-w-48"
            />
          </div>
        </Campo>
        <Campo id="correo" etiqueta="Correo" error={e.correo}>
          <Input id="correo" name="correo" type="email" autoCapitalize="none" spellCheck={false} defaultValue={v.correo} aria-invalid={!!e.correo} aria-describedby={describir("correo")} />
        </Campo>
      </SeccionFormulario>

      <SeccionFormulario titulo="Ubicación">
        <Campo id="direccion" etiqueta="Dirección" error={e.direccion}>
          <Textarea id="direccion" name="direccion" rows={2} defaultValue={v.direccion} aria-invalid={!!e.direccion} aria-describedby={describir("direccion")} />
        </Campo>
        {/* Pedido 38: lo que da la ficha del taller en Google Maps, en "Compartir" */}
        <Campo
          id="enlaceMapa"
          etiqueta="Enlace de Google Maps"
          error={e.enlaceMapa}
          ayuda={
            <>
              En Google Maps, abre la ficha del taller y toca Compartir → Copiar vínculo. También sirven las coordenadas.
              {verEnMapa && (
                <>
                  {" "}
                  <a href={verEnMapa} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-tinta underline">
                    Ver en el mapa
                    <ExternalLinkIcon className="size-3.5" aria-hidden />
                  </a>
                </>
              )}
            </>
          }
        >
          <Input
            id="enlaceMapa"
            name="enlaceMapa"
            inputMode="url"
            autoCapitalize="none"
            autoComplete="off"
            spellCheck={false}
            placeholder="https://maps.app.goo.gl/…"
            defaultValue={v.enlaceMapa}
            aria-invalid={!!e.enlaceMapa}
            aria-describedby={describir("enlaceMapa", true)}
          />
        </Campo>
        <Campo
          id="mapaInsertado"
          etiqueta="Mapa para la página"
          error={e.mapaInsertado}
          ayuda="En la ficha del taller: Compartir → Insertar un mapa → Copiar HTML. Si lo dejas vacío, el mapa muestra un pin en la ubicación del taller."
        >
          <Textarea
            id="mapaInsertado"
            name="mapaInsertado"
            rows={3}
            autoCapitalize="none"
            spellCheck={false}
            placeholder={'<iframe src="https://www.google.com/maps/embed?pb=…"></iframe>'}
            defaultValue={v.mapaInsertado}
            aria-invalid={!!e.mapaInsertado}
            aria-describedby={describir("mapaInsertado", true)}
            className="font-mono text-sm break-all"
          />
        </Campo>
      </SeccionFormulario>

      <SeccionFormulario titulo="Horario de atención" descripcion="Se muestra en la página. Marca los días que abren.">
        <EditorHorarios valor={horarios} onChange={setHorarios} errores={e} />
        {e.horarios && <MensajeError id="horarios-error">{e.horarios}</MensajeError>}
      </SeccionFormulario>

      <SeccionFormulario titulo="Redes sociales" descripcion="Copia el enlace desde la página del negocio en cada red. Las que queden vacías no se muestran.">
        {REDES.map((red) => (
          <Campo key={red} id={red} etiqueta={NOMBRE_RED[red]} error={e[red]}>
            <Input id={red} name={red} type="url" autoCapitalize="none" spellCheck={false} placeholder={`https://www.${red}.com/…`} defaultValue={v[red]} aria-invalid={!!e[red]} aria-describedby={describir(red)} />
          </Campo>
        ))}
      </SeccionFormulario>

      <SeccionFormulario titulo="Datos para facturar" descripcion="Opcionales. Salen en los documentos.">
        <Campo id="nit" etiqueta="NIT" error={e.nit}>
          <Input id="nit" name="nit" inputMode="numeric" defaultValue={v.nit} aria-invalid={!!e.nit} aria-describedby={describir("nit")} className="max-w-60" />
        </Campo>
        <Campo id="razonSocial" etiqueta="Razón social" error={e.razonSocial}>
          <Input id="razonSocial" name="razonSocial" defaultValue={v.razonSocial} aria-invalid={!!e.razonSocial} aria-describedby={describir("razonSocial")} />
        </Campo>
      </SeccionFormulario>

      <div>
        <Button type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
