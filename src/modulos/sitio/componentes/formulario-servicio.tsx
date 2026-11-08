"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { avisarResultado, conAviso } from "@/componentes/panel/avisos";
import { Campo } from "@/componentes/panel/campo";
import { EditorLista } from "@/componentes/panel/editor-lista";
import { MenuMas } from "@/componentes/panel/menu-mas";
import { CancelarModal, ModalFormulario, PieModal, useCerrarModal } from "@/componentes/panel/modal-formulario";
import { Selector } from "@/componentes/panel/selector";
import { TextoCorto } from "@/componentes/panel/texto-corto";
import { IconoBeneficio } from "@/componentes/sitio/icono-beneficio";
import { Button } from "@/componentes/ui/button";
import { Checkbox } from "@/componentes/ui/checkbox";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
import type { Beneficio, Paso } from "@/db/esquema";
import type { EstadoFormulario } from "@/lib/formularios";
import { cambiarVisibilidadServicio, guardarParteServicio } from "../acciones";
import { ICONOS_BENEFICIO, iconoDe } from "../beneficios";
import { LIMITES, type ParteServicio } from "../esquemas";

// HU-07: la página del servicio en el sitio (RF-03). Sin precios (RN-10). El nombre y las variantes son del catálogo.
// Pulido 13.19: la ficha se lee como el sitio y cada parte se edita en su modal, con su propio botón. Antes era un solo
// formulario con todo abierto (cinco pantallas en el celular) y un "Guardar cambios" al final, mezclado con fotos que
// se guardaban al momento.

/** El formulario de una parte: se guarda sola y cierra su modal al guardar. */
function useParte() {
  const cerrar = useCerrarModal();
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(
    conAviso(guardarParteServicio, (r) => r.ok && cerrar()),
    {},
  );
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);
  return { accion, enviando, formulario, e: estado.errores ?? {}, v: estado.valores };
}

function Pie({ texto, enviando }: { texto: string; enviando: boolean }) {
  return (
    <PieModal>
      <Button type="submit" disabled={enviando}>
        {enviando ? "Guardando…" : texto}
      </Button>
      <CancelarModal />
    </PieModal>
  );
}

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
      <Pie texto="Guardar resumen" enviando={enviando} />
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
        fila={(b, cambiar, i, marca) => (
          <>
            <TextoCorto value={b.texto} onChange={(ev) => cambiar({ ...b, texto: ev.target.value })} aria-label={`Beneficio ${i + 1}`} placeholder="Repele el agua y la suciedad" {...marca} />
            <span className="flex items-center gap-2">
              <IconoBeneficio icono={b.icono} className="size-6 shrink-0 text-rojo" />
              <Selector value={b.icono} onChange={(ev) => cambiar({ ...b, icono: ev.target.value })} aria-label={`Beneficio ${i + 1}, ícono`} {...marca}>
                {Object.entries(ICONOS_BENEFICIO).map(([clave, nombre]) => (
                  <option key={clave} value={clave}>
                    {nombre}
                  </option>
                ))}
              </Selector>
            </span>
          </>
        )}
      />
      <Pie texto="Guardar beneficios" enviando={enviando} />
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
      <Pie texto="Guardar pasos" enviando={enviando} />
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
      <Pie texto="Guardar opciones" enviando={enviando} />
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
      <Pie texto="Guardar dirección" enviando={enviando} />
    </form>
  );
}

/**
 * "Más" del encabezado: lo que se usa poco. Mostrar u ocultar se hace al momento (se deshace con la misma opción); la
 * dirección se cambia en un modal, con su advertencia; el catálogo, si la persona lo ve.
 */
export function MasServicio({ id, slug, visible, catalogo }: { id: number; slug: string; visible: boolean; catalogo: boolean }) {
  const router = useRouter();
  const [enviando, iniciar] = useTransition();
  const [direccion, setDireccion] = useState(false);
  const acciones = [
    {
      texto: visible ? "Ocultar del sitio" : "Mostrar en el sitio",
      alElegir: () => iniciar(async () => avisarResultado(await cambiarVisibilidadServicio({ id, visible: !visible }))),
    },
    { texto: "Cambiar dirección de la página", alElegir: () => setDireccion(true) },
    ...(catalogo ? [{ texto: "Abrir en el catálogo", alElegir: () => router.push(`/panel/catalogo/${id}`) }] : []),
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
