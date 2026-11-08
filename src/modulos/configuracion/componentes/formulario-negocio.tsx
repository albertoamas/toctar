"use client";

import { useState } from "react";
import { Campo, MensajeError } from "@/componentes/panel/campo";
import { PieGuardar, useFormularioEnModal } from "@/componentes/panel/modal-formulario";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
import type { DiaHorario } from "@/lib/horarios";
import { guardarParteNegocio } from "../acciones";
import { NOMBRE_RED, REDES, type ParteNegocio } from "../esquemas";
import { EditorHorarios } from "./editor-horarios";

// HU-04: los datos del negocio. Pulido 13.26: la ficha se lee (Configuración > Negocio) y cada parte se edita en su modal,
// con su propio botón. Antes era un solo formulario con 43 campos abiertos (4,5 pantallas en el celular) y "Guardar
// cambios" al final, mezclado con el logo, que se guardaba al momento.

const useParte = () => useFormularioEnModal(guardarParteNegocio);

const Parte = ({ parte }: { parte: ParteNegocio }) => <input type="hidden" name="parte" value={parte} />;

type Valores = Record<string, string>;

export function FormularioContacto({ valores }: { valores: Valores }) {
  const { accion, enviando, formulario, e, v } = useParte();
  const valor = (c: string) => v?.[c] ?? valores[c];
  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-5" noValidate>
      <Parte parte="contacto" />
      <Campo id="nombre" etiqueta="Nombre del negocio" error={e.nombre}>
        <Input id="nombre" name="nombre" defaultValue={valor("nombre")} aria-invalid={!!e.nombre} />
      </Campo>
      <Campo id="whatsapp" etiqueta="WhatsApp" error={e.whatsapp} ayuda="El número al que escriben los clientes desde la página.">
        <div className="flex items-center gap-2">
          <span className="text-tinta-suave">+591</span>
          <Input id="whatsapp" name="whatsapp" type="tel" inputMode="tel" autoComplete="off" placeholder="71234567" defaultValue={valor("whatsapp")} aria-invalid={!!e.whatsapp} className="max-w-48" />
        </div>
      </Campo>
      <Campo id="correo" etiqueta="Correo" opcional error={e.correo}>
        <Input id="correo" name="correo" type="email" autoCapitalize="none" spellCheck={false} defaultValue={valor("correo")} aria-invalid={!!e.correo} />
      </Campo>
      <PieGuardar texto="Guardar contacto" enviando={enviando} />
    </form>
  );
}

export function FormularioUbicacion({ valores }: { valores: Valores }) {
  const { accion, enviando, formulario, e, v } = useParte();
  const valor = (c: string) => v?.[c] ?? valores[c];
  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-5" noValidate>
      <Parte parte="ubicacion" />
      <Campo id="direccion" etiqueta="Dirección" error={e.direccion}>
        <Textarea id="direccion" name="direccion" rows={2} defaultValue={valor("direccion")} aria-invalid={!!e.direccion} />
      </Campo>
      {/* Pedido 38: lo que da la ficha del taller en Google Maps, en "Compartir" */}
      <Campo id="enlaceMapa" etiqueta="Enlace de Google Maps" error={e.enlaceMapa} ayuda="En Google Maps, abre la ficha del taller y toca Compartir → Copiar vínculo. También sirven las coordenadas.">
        <Input
          id="enlaceMapa"
          name="enlaceMapa"
          inputMode="url"
          autoCapitalize="none"
          autoComplete="off"
          spellCheck={false}
          placeholder="https://maps.app.goo.gl/…"
          defaultValue={valor("enlaceMapa")}
          aria-invalid={!!e.enlaceMapa}
        />
      </Campo>
      <Campo
        id="mapaInsertado"
        etiqueta="Mapa para la página"
        opcional
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
          defaultValue={valor("mapaInsertado")}
          aria-invalid={!!e.mapaInsertado}
          className="font-mono text-sm break-all"
        />
      </Campo>
      <PieGuardar texto="Guardar ubicación" enviando={enviando} />
    </form>
  );
}

export function FormularioHorario({ horarios: iniciales }: { horarios: DiaHorario[] }) {
  const { accion, enviando, formulario, e } = useParte();
  const [horarios, setHorarios] = useState(iniciales);
  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-5" noValidate>
      <Parte parte="horario" />
      <p className="text-sm text-tinta-suave">Se muestra en la página. Marca los días que abren.</p>
      <EditorHorarios valor={horarios} onChange={setHorarios} errores={e} />
      {e.horarios && <MensajeError id="horarios-error">{e.horarios}</MensajeError>}
      <PieGuardar texto="Guardar horario" enviando={enviando} />
    </form>
  );
}

export function FormularioRedes({ valores }: { valores: Valores }) {
  const { accion, enviando, formulario, e, v } = useParte();
  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-5" noValidate>
      <Parte parte="redes" />
      <p className="text-sm text-tinta-suave">Copia el enlace desde la página del negocio en cada red. Las que queden vacías no se muestran.</p>
      {REDES.map((red) => (
        <Campo key={red} id={red} etiqueta={NOMBRE_RED[red]} opcional error={e[red]}>
          <Input id={red} name={red} type="url" autoCapitalize="none" spellCheck={false} placeholder={`https://www.${red}.com/…`} defaultValue={v?.[red] ?? valores[red]} aria-invalid={!!e[red]} />
        </Campo>
      ))}
      <PieGuardar texto="Guardar redes" enviando={enviando} />
    </form>
  );
}

export function FormularioFacturacion({ valores }: { valores: Valores }) {
  const { accion, enviando, formulario, e, v } = useParte();
  const valor = (c: string) => v?.[c] ?? valores[c];
  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-5" noValidate>
      <Parte parte="facturacion" />
      <p className="text-sm text-tinta-suave">Salen en los documentos.</p>
      <Campo id="nit" etiqueta="NIT" opcional error={e.nit}>
        <Input id="nit" name="nit" inputMode="numeric" defaultValue={valor("nit")} aria-invalid={!!e.nit} className="max-w-60" />
      </Campo>
      <Campo id="razonSocial" etiqueta="Razón social" opcional error={e.razonSocial}>
        <Input id="razonSocial" name="razonSocial" defaultValue={valor("razonSocial")} aria-invalid={!!e.razonSocial} />
      </Campo>
      <PieGuardar texto="Guardar datos para facturar" enviando={enviando} />
    </form>
  );
}
