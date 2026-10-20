"use client";

import Link from "next/link";
import { useState } from "react";
import { Campo } from "@/componentes/panel/campo";
import { Selector } from "@/componentes/panel/selector";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
import type { Tamano } from "@/modulos/configuracion/consultas";
import type { EstadoCliente } from "../acciones";

// Campos de cliente y de vehículo (HU-21): los usan el alta y la ficha (HU-23). Componentes de cliente: se usan
// dentro de formularios con useActionState.

type PropsCampos = {
  estado: EstadoCliente;
  /** Valores iniciales (al editar). */
  iniciales?: Record<string, string>;
  /** Prefijo de los nombres de campo, para tener dos formularios en la misma página. */
  prefijo?: string;
};

/** Si el dato ya es de otro cliente, el enlace a su ficha (RF-23). */
function Existente({ estado, campo }: { estado: EstadoCliente; campo: string }) {
  const existente = estado.existentes?.[campo];
  if (!existente) return null;
  return (
    // Va debajo del Campo, después de su error: primero se lee qué pasó y después la salida
    <Link href={`/panel/clientes/${existente.id}`} className="-mt-4 inline-flex min-h-11 items-center self-start text-sm font-semibold underline">
      Abrir la ficha de {existente.nombre}
    </Link>
  );
}

export function CamposCliente({ estado, iniciales = {} }: PropsCampos) {
  const v = estado.valores ?? iniciales;
  const e = estado.errores ?? {};
  const describir = (campo: string, ayuda = false) => (e[campo] ? `${campo}-error` : ayuda ? `${campo}-ayuda` : undefined);
  return (
    <>
      <Campo id="nombre" etiqueta="Nombre" error={e.nombre}>
        <Input id="nombre" name="nombre" autoComplete="off" defaultValue={v.nombre} aria-invalid={!!e.nombre} aria-describedby={describir("nombre")} />
      </Campo>
      <Campo id="telefono" etiqueta="WhatsApp" error={e.telefono} ayuda="Celular de Bolivia, 8 dígitos.">
        <div className="flex items-center gap-2">
          <span className="text-tinta-suave">+591</span>
          <Input
            id="telefono"
            name="telefono"
            type="tel"
            inputMode="tel"
            autoComplete="off"
            placeholder="71234567"
            defaultValue={v.telefono}
            aria-invalid={!!e.telefono}
            aria-describedby={describir("telefono", true)}
            className="max-w-48"
          />
        </div>
      </Campo>
      <Existente estado={estado} campo="telefono" />
      <Campo id="correo" etiqueta="Correo" error={e.correo}>
        <Input id="correo" name="correo" type="email" autoCapitalize="none" spellCheck={false} defaultValue={v.correo} aria-invalid={!!e.correo} aria-describedby={describir("correo")} />
      </Campo>
      <div className="grid gap-6 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
        <Campo id="nit" etiqueta="NIT" error={e.nit}>
          <Input id="nit" name="nit" inputMode="numeric" autoComplete="off" defaultValue={v.nit} aria-invalid={!!e.nit} aria-describedby={describir("nit")} />
        </Campo>
        <Campo id="razonSocial" etiqueta="Razón social" error={e.razonSocial}>
          <Input id="razonSocial" name="razonSocial" autoComplete="off" defaultValue={v.razonSocial} aria-invalid={!!e.razonSocial} aria-describedby={describir("razonSocial")} />
        </Campo>
      </div>
      <Campo id="notas" etiqueta="Notas" error={e.notas} ayuda="Lo que convenga recordar: cómo prefiere que lo contacten, detalles del vehículo…">
        <Textarea id="notas" name="notas" rows={2} defaultValue={v.notas} aria-invalid={!!e.notas} aria-describedby={describir("notas", true)} />
      </Campo>
    </>
  );
}

export function CamposVehiculo({ estado, iniciales = {}, prefijo = "", tamanos }: PropsCampos & { tamanos: Tamano[] }) {
  const v = estado.valores ?? iniciales;
  const e = estado.errores ?? {};
  const n = (campo: string) => prefijo + campo;
  const describir = (campo: string, ayuda = false) => (e[n(campo)] ? `${n(campo)}-error` : ayuda ? `${n(campo)}-ayuda` : undefined);
  // El estado solo elige la ayuda (los modelos del tamaño). React reinicia el formulario al terminar la acción y un
  // <select> vuelve a la opción de cuando se montó: la key lo vuelve a montar con lo enviado, así no queda en
  // "Elige el tamaño" tras un error.
  const [tamanoId, setTamanoId] = useState(v[n("tamanoId")] ?? "");
  const elegido = tamanos.find((t) => String(t.id) === tamanoId);

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="flex flex-col gap-6">
        <Campo id={n("placa")} etiqueta="Placa" error={e[n("placa")]}>
          <Input
            id={n("placa")}
            name={n("placa")}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            defaultValue={v[n("placa")]}
            aria-invalid={!!e[n("placa")]}
            aria-describedby={describir("placa")}
            className="uppercase"
          />
        </Campo>
        <Existente estado={estado} campo={n("placa")} />
      </div>
      <Campo id={n("tamanoId")} etiqueta="Tamaño" error={e[n("tamanoId")]} ayuda={elegido?.descripcion ?? "Define el precio al cotizar."}>
        <Selector
          key={v[n("tamanoId")] ?? ""}
          id={n("tamanoId")}
          name={n("tamanoId")}
          defaultValue={v[n("tamanoId")] ?? ""}
          onChange={(ev) => setTamanoId(ev.target.value)}
          aria-invalid={!!e[n("tamanoId")]}
          aria-describedby={describir("tamanoId", true)}
        >
          <option value="">Elige el tamaño</option>
          {tamanos.map((t) => (
            <option key={t.id} value={t.id}>{t.nombre}</option>
          ))}
        </Selector>
      </Campo>
      <Campo id={n("marca")} etiqueta="Marca" error={e[n("marca")]}>
        <Input id={n("marca")} name={n("marca")} autoComplete="off" defaultValue={v[n("marca")]} aria-invalid={!!e[n("marca")]} aria-describedby={describir("marca")} />
      </Campo>
      <Campo id={n("modelo")} etiqueta="Modelo" error={e[n("modelo")]}>
        <Input id={n("modelo")} name={n("modelo")} autoComplete="off" defaultValue={v[n("modelo")]} aria-invalid={!!e[n("modelo")]} aria-describedby={describir("modelo")} />
      </Campo>
      <Campo id={n("anio")} etiqueta="Año" error={e[n("anio")]}>
        <Input id={n("anio")} name={n("anio")} inputMode="numeric" autoComplete="off" defaultValue={v[n("anio")]} aria-invalid={!!e[n("anio")]} aria-describedby={describir("anio")} className="max-w-28" />
      </Campo>
      <Campo id={n("color")} etiqueta="Color" error={e[n("color")]}>
        <Input id={n("color")} name={n("color")} autoComplete="off" defaultValue={v[n("color")]} aria-invalid={!!e[n("color")]} aria-describedby={describir("color")} />
      </Campo>
    </div>
  );
}
