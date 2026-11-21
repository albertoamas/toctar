"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { avisarResultado } from "@/componentes/panel/avisos";
import { Campo } from "@/componentes/panel/campo";
import { EditorLista } from "@/componentes/panel/editor-lista";
import { MenuMas } from "@/componentes/panel/menu-mas";
import { Selector } from "@/componentes/panel/selector";
import { useFormularioEnModal } from "@/componentes/panel/modal-contexto";
import { ModalFormulario } from "@/componentes/panel/modal-formulario";
import { PieGuardar } from "@/componentes/panel/modal-pie";
import { TextoCorto } from "@/componentes/panel/texto-corto";
import { Checkbox } from "@/componentes/ui/checkbox";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
import type { Beneficio, ColorServicio, Paso } from "@/db/esquema";
import { ACABADOS_COLOR } from "@/db/esquema/sitio";
import { cambiarVisibilidadServicio, guardarParteServicio } from "../acciones/servicios";
import { iconoDe } from "../beneficios";
import { NOMBRE_ACABADO } from "../colores";
import { LIMITES, type ParteServicio } from "../esquemas";
import { ElegirIcono } from "./elegir-icono";
import { conDesde } from "@/lib/volver";

// HU-07: la página del servicio en el sitio (RF-03). Sin precios (RN-10). El nombre y las variantes son del catálogo.
// Pulido 13.19: la ficha se lee como el sitio y cada parte se edita en su modal, con su propio botón. Antes era un solo
// formulario con todo abierto (cinco pantallas en el celular) y un "Guardar cambios" al final, mezclado con fotos que
// se guardaban al momento.

const useParte = () => useFormularioEnModal(guardarParteServicio);

function Ocultos({ id, parte }: { id: number; parte: ParteServicio }) {
  return (
    <>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="parte" value={parte} />
    </>
  );
}

export function FormularioResumen({ id, resumen }: { id: number; resumen: string }) {
  const { accion, enviando, formulario, e, v } = useParte();
  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-6" noValidate>
      <Ocultos id={id} parte="resumen" />
      <Campo id="resumen" etiqueta="Resumen" error={e.resumen} ayuda="Una o dos frases sobre en qué consiste. Se ve arriba en la página, en su tarjeta y en Google.">
        <Textarea
          id="resumen"
          name="resumen"
          rows={4}
          defaultValue={v?.resumen ?? resumen}
          aria-invalid={!!e.resumen}
          aria-describedby={e.resumen ? "resumen-error" : "resumen-ayuda"}
        />
      </Campo>
      <PieGuardar texto="Guardar resumen" enviando={enviando} />
    </form>
  );
}

export function FormularioBeneficios({ id, beneficios: iniciales }: { id: number; beneficios: Beneficio[] }) {
  const { accion, enviando, formulario, e } = useParte();
  // Un ícono guardado que ya no está en la lista pasa al genérico: lo que se ve en el selector es lo que se guarda
  const [beneficios, setBeneficios] = useState<Beneficio[]>(() => iniciales.map((b) => ({ ...b, icono: iconoDe(b.icono) })));
  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-6" noValidate>
      <Ocultos id={id} parte="beneficios" />
      <p className="text-sm text-tinta-suave">Lo que gana el cliente, en pocas palabras y con un ícono. Hasta {LIMITES.beneficios}.</p>
      <EditorLista
        nombre="beneficios"
        etiqueta="Beneficio"
        valor={beneficios}
        onChange={setBeneficios}
        nueva={() => ({ texto: "", icono: "listo" })}
        maximo={LIMITES.beneficios}
        textoAgregar="Agregar beneficio"
        errores={e}
        flechasEnFila
        fila={(b, cambiar, i, marca) => (
          // Un renglón, como en el sitio: el ícono a la izquierda del texto (pulido 13.22)
          <span className="flex items-start gap-2">
            <ElegirIcono valor={b.icono} alCambiar={(icono) => cambiar({ ...b, icono })} etiqueta={`Beneficio ${i + 1}, ícono`} describedBy={marca["aria-describedby"]} />
            <span className="min-w-0 flex-1">
              <TextoCorto value={b.texto} onChange={(ev) => cambiar({ ...b, texto: ev.target.value })} aria-label={`Beneficio ${i + 1}`} placeholder="Repele el agua y la suciedad" {...marca} />
            </span>
          </span>
        )}
      />
      <PieGuardar texto="Guardar beneficios" enviando={enviando} />
    </form>
  );
}

export function FormularioPasos({ id, pasos: iniciales }: { id: number; pasos: Paso[] }) {
  const { accion, enviando, formulario, e } = useParte();
  const [pasos, setPasos] = useState(iniciales);
  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-6" noValidate>
      <Ocultos id={id} parte="pasos" />
      <p className="text-sm text-tinta-suave">Cómo se hace, en orden. Hasta {LIMITES.pasos} pasos.</p>
      <EditorLista
        nombre="pasos"
        etiqueta="Paso"
        valor={pasos}
        onChange={setPasos}
        nueva={() => ({ titulo: "", detalle: "" })}
        maximo={LIMITES.pasos}
        textoAgregar="Agregar paso"
        errores={e}
        fila={(paso, cambiar, i, marca) => (
          <>
            <Input value={paso.titulo} onChange={(ev) => cambiar({ ...paso, titulo: ev.target.value })} aria-label={`Paso ${i + 1}, título`} placeholder="Lavado técnico" {...marca} />
            <Textarea value={paso.detalle} onChange={(ev) => cambiar({ ...paso, detalle: ev.target.value })} aria-label={`Paso ${i + 1}, detalle`} rows={2} placeholder="Qué se hace en este paso (opcional)" {...marca} />
          </>
        )}
      />
      <PieGuardar texto="Guardar pasos" enviando={enviando} />
    </form>
  );
}

/** Pedido 56: los colores del probador de la página del servicio, en el orden en que se muestran. */
export function FormularioColores({ id, colores: iniciales }: { id: number; colores: ColorServicio[] }) {
  const { accion, enviando, formulario, e } = useParte();
  const [colores, setColores] = useState(iniciales);
  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-6" noValidate>
      <Ocultos id={id} parte="colores" />
      <p className="text-sm text-tinta-suave">Los que se pueden elegir en el sitio, en este orden. El primero es el que se ve al entrar. Hasta {LIMITES.colores}.</p>
      <EditorLista
        nombre="colores"
        etiqueta="Color"
        valor={colores}
        onChange={setColores}
        nueva={(): ColorServicio => ({ nombre: "", hex: "#141414", acabado: "mate" })}
        maximo={LIMITES.colores}
        textoAgregar="Agregar color"
        errores={e}
        flechasEnFila
        fila={(c, cambiar, i, marca) => (
          // En el celular, dos renglones (el color y el nombre; el acabado abajo): en uno, el nombre quedaba de cuatro letras
          <span className="flex flex-wrap items-start gap-2">
            {/* El selector del navegador: en el celular abre el del teléfono */}
            <input
              type="color"
              value={c.hex}
              onChange={(ev) => cambiar({ ...c, hex: ev.target.value })}
              aria-label={`Color ${i + 1}, tono`}
              className="h-9 w-11 shrink-0 cursor-pointer rounded-lg border border-input bg-fondo p-1 pointer-coarse:h-11"
            />
            <span className="min-w-32 flex-1">
              <TextoCorto value={c.nombre} onChange={(ev) => cambiar({ ...c, nombre: ev.target.value })} aria-label={`Color ${i + 1}, nombre`} placeholder="Bronce" {...marca} />
            </span>
            <Selector value={c.acabado} onChange={(ev) => cambiar({ ...c, acabado: ev.target.value as ColorServicio["acabado"] })} aria-label={`Color ${i + 1}, acabado`} className="basis-full sm:w-32 sm:shrink-0 sm:basis-auto">
              {ACABADOS_COLOR.map((a) => (
                <option key={a} value={a}>
                  {NOMBRE_ACABADO[a]}
                </option>
              ))}
            </Selector>
          </span>
        )}
      />
      <PieGuardar texto="Guardar colores" enviando={enviando} />
    </form>
  );
}

export function FormularioOpciones({ id, escalera: inicial }: { id: number; escalera: boolean }) {
  const { accion, enviando, formulario, v } = useParte();
  const escalera = v ? v.opcionesEnEscalera === "on" : inicial;
  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-6" noValidate>
      <Ocultos id={id} parte="opciones" />
      <label className="flex cursor-pointer items-start gap-3">
        <Checkbox key={String(escalera)} name="opcionesEnEscalera" defaultChecked={escalera} className="mt-0.5" />
        <span className="flex flex-col">
          <span className="font-semibold">Van de menor a mayor</span>
          <span className="text-sm text-tinta-suave">Por ejemplo 1, 2, 3, 5 y 10 años: el sitio las muestra como escalones, cada una con una capa más gruesa.</span>
        </span>
      </label>
      <PieGuardar texto="Guardar opciones" enviando={enviando} />
    </form>
  );
}

function FormularioDireccion({ id, slug }: { id: number; slug: string }) {
  const { accion, enviando, formulario, e, v } = useParte();
  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-6" noValidate>
      <Ocultos id={id} parte="direccion" />
      <Campo id="slug" etiqueta="Dirección de la página" error={e.slug} ayuda="Si la cambias, los enlaces que ya compartiste dejan de funcionar.">
        <div className="flex items-center gap-1">
          <span className="shrink-0 text-tinta-suave">…/servicios/</span>
          <Input
            id="slug"
            name="slug"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            defaultValue={v?.slug ?? slug}
            aria-invalid={!!e.slug}
            aria-describedby={e.slug ? "slug-error" : "slug-ayuda"}
          />
        </div>
      </Campo>
      <PieGuardar texto="Guardar dirección" enviando={enviando} />
    </form>
  );
}

/**
 * "Más" del encabezado: lo que se usa poco. Mostrar u ocultar se hace al momento (se deshace con la misma opción); la
 * dirección se cambia en un modal, con su advertencia; el catálogo, si la persona lo ve.
 */
export function MasServicio(props: { id: number; slug: string; visible: boolean; activo: boolean; catalogo: boolean; /** Esta pantalla: el catálogo vuelve aquí (pedido 43). */ desde: string }) {
  const { id, slug, visible, activo, catalogo, desde } = props;
  const router = useRouter();
  const [enviando, iniciar] = useTransition();
  const [direccion, setDireccion] = useState(false);
  // Inactivo en el catálogo no sale en el sitio: mostrarlo no cambiaría nada a la vista
  const acciones = [
    ...(activo
      ? [
          {
            texto: visible ? "Ocultar del sitio" : "Mostrar en el sitio",
            alElegir: () => iniciar(async () => avisarResultado(await cambiarVisibilidadServicio({ id, visible: !visible }))),
          },
        ]
      : []),
    { texto: "Cambiar dirección de la página", alElegir: () => setDireccion(true) },
    ...(catalogo ? [{ texto: "Abrir en el catálogo", alElegir: () => router.push(conDesde(`/panel/catalogo/${id}`, desde)) }] : []),
  ];
  return (
    <>
      <MenuMas acciones={acciones} deshabilitado={enviando} />
      <ModalFormulario titulo="Dirección de la página" abierto={direccion} alCambiar={setDireccion}>
        <FormularioDireccion id={id} slug={slug} />
      </ModalFormulario>
    </>
  );
}
