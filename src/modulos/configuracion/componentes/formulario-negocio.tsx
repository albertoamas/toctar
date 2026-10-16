"use client";

import { useActionState, useState } from "react";
import { ExternalLinkIcon } from "lucide-react";
import { conAviso } from "@/componentes/panel/avisos";
import { Campo } from "@/componentes/panel/campo";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
import type { DiaHorario } from "@/lib/horarios";
import { enlaceMapa, leerUbicacion } from "@/lib/ubicacion";
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

  const ubicacion = v.ubicacion ? leerUbicacion(v.ubicacion) : null;

  return (
    <form action={accion} className="flex max-w-2xl flex-col gap-10" noValidate>
      <Seccion titulo="Contacto">
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
      </Seccion>

      <Seccion titulo="Ubicación">
        <Campo id="direccion" etiqueta="Dirección" error={e.direccion}>
          <Textarea id="direccion" name="direccion" rows={2} defaultValue={v.direccion} aria-invalid={!!e.direccion} aria-describedby={describir("direccion")} />
        </Campo>
        <Campo
          id="ubicacion"
          etiqueta="Ubicación en el mapa"
          error={e.ubicacion}
          ayuda={
            <>
              Pega las coordenadas o el enlace de Google Maps. Para copiarlas: en Google Maps, mantén presionado el punto del taller.
              {ubicacion?.ok && (
                <>
                  {" "}
                  <a href={enlaceMapa(ubicacion.coordenadas)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-tinta underline">
                    Ver en el mapa
                    <ExternalLinkIcon className="size-3.5" aria-hidden />
                  </a>
                </>
              )}
            </>
          }
        >
          <Input id="ubicacion" name="ubicacion" autoComplete="off" spellCheck={false} placeholder="-21.5355, -64.7296" defaultValue={v.ubicacion} aria-invalid={!!e.ubicacion} aria-describedby={describir("ubicacion", true)} />
        </Campo>
      </Seccion>

      <Seccion titulo="Horario de atención" descripcion="Se muestra en la página. Marca los días que abren.">
        <EditorHorarios valor={horarios} onChange={setHorarios} errores={e} />
        {e.horarios && <p className="text-sm font-semibold text-rojo-texto">{e.horarios}</p>}
      </Seccion>

      <Seccion titulo="Redes sociales" descripcion="Copia el enlace desde la página del negocio en cada red. Las que queden vacías no se muestran.">
        {REDES.map((red) => (
          <Campo key={red} id={red} etiqueta={NOMBRE_RED[red]} error={e[red]}>
            <Input id={red} name={red} type="url" autoCapitalize="none" spellCheck={false} placeholder={`https://www.${red}.com/…`} defaultValue={v[red]} aria-invalid={!!e[red]} aria-describedby={describir(red)} />
          </Campo>
        ))}
      </Seccion>

      <Seccion titulo="Datos para facturar" descripcion="Opcionales. Salen en los documentos.">
        <Campo id="nit" etiqueta="NIT" error={e.nit}>
          <Input id="nit" name="nit" inputMode="numeric" defaultValue={v.nit} aria-invalid={!!e.nit} aria-describedby={describir("nit")} className="max-w-60" />
        </Campo>
        <Campo id="razonSocial" etiqueta="Razón social" error={e.razonSocial}>
          <Input id="razonSocial" name="razonSocial" defaultValue={v.razonSocial} aria-invalid={!!e.razonSocial} aria-describedby={describir("razonSocial")} />
        </Campo>
      </Seccion>

      <div>
        <Button type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}

function Seccion(props: { titulo: string; descripcion?: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-5">
      <legend className="mb-5 flex flex-col gap-1">
        <span className="font-heading text-2xl font-bold italic">{props.titulo}</span>
        {props.descripcion && <span className="text-sm text-tinta-suave">{props.descripcion}</span>}
      </legend>
      {props.children}
    </fieldset>
  );
}
