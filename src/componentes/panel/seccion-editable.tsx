"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { PencilIcon } from "lucide-react";
import { useHidratado } from "@/componentes/hidratado";
import { Button } from "@/componentes/ui/button";

// Fichas del panel en modo lectura (skill pantallas-panel, §2): cada sección muestra sus datos como texto y tiene
// "Editar", que abre su formulario en el mismo lugar. Dentro de una FichaEditable, abrir una sección cierra la que
// estaba abierta: hay un solo formulario a la vez y nunca una pared de botones de guardar.
// El formulario cierra su sección al guardar con useCerrarSeccion, y pone "Cancelar" (o "Listo") al lado de su botón
// con CancelarSeccion.

/** El primer control que puede recibir el foco (uno deshabilitado, como "Subir" en la primera fila, no lo recibe). */
const PRIMER_CONTROL = ["input:not([type=hidden])", "textarea", "select", "button"].map((c) => `${c}:not(:disabled)`).join(", ");

const Ficha = createContext<{ abierta: string | null; abrir: (id: string | null) => void } | null>(null);
const Seccion = createContext<{ cerrar: () => void } | null>(null);

/** Agrupa las secciones de una ficha para que se abra una a la vez. `abierta`: la que empieza abierta. */
export function FichaEditable({ abierta: inicial = null, children }: { abierta?: string | null; children: React.ReactNode }) {
  const [abierta, abrir] = useState(inicial);
  return <Ficha.Provider value={{ abierta, abrir }}>{children}</Ficha.Provider>;
}

type Props = {
  id: string;
  titulo: string;
  /** Título de nivel 2 (sección de la ficha) o 3 (dentro de otra sección). */
  nivel?: 2 | 3;
  /** Lo que dice "Editar" al lector de pantalla: "Editar precios de 1 año". */
  etiquetaEditar: string;
  /** Los datos como texto, cuando la sección está cerrada. */
  lectura: React.ReactNode;
  /** El formulario, cuando está abierta. */
  children: React.ReactNode;
};

export function SeccionEditable({ id, titulo, nivel = 2, etiquetaEditar, lectura, children }: Props) {
  const ficha = useContext(Ficha);
  const [sola, setSola] = useState(false);
  const abierta = ficha ? ficha.abierta === id : sola;
  const abrir = (si: boolean) => (ficha ? ficha.abrir(si ? id : null) : setSola(si));
  const hidratado = useHidratado();
  const contenido = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  // Al abrir, el foco va al primer campo; al cerrar (guardar o cancelar), vuelve a "Editar". No en la primera pintura
  const primera = useRef(true);
  useEffect(() => {
    if (primera.current) {
      primera.current = false;
      if (!abierta) return;
    }
    if (abierta) contenido.current?.querySelector<HTMLElement>(PRIMER_CONTROL)?.focus();
    else boton.current?.focus();
  }, [abierta]);
  const Titulo = nivel === 3 ? "h3" : "h2";

  return (
    <section aria-labelledby={`${id}-titulo`} className="flex flex-col gap-3">
      <div className="flex min-h-11 items-center justify-between gap-3">
        <Titulo id={`${id}-titulo`} className={nivel === 3 ? "text-lg font-semibold" : "font-heading text-2xl font-bold italic"}>
          {titulo}
        </Titulo>
        {!abierta && (
          <Button ref={boton} type="button" variant="outline" disabled={!hidratado} aria-label={etiquetaEditar} onClick={() => abrir(true)}>
            <PencilIcon />
            Editar
          </Button>
        )}
      </div>
      <div ref={contenido}>{abierta ? <Seccion.Provider value={{ cerrar: () => abrir(false) }}>{children}</Seccion.Provider> : lectura}</div>
    </section>
  );
}

/** Para el formulario de una sección: cierra la sección (después de guardar). Fuera de una sección no hace nada. */
export function useCerrarSeccion(): () => void {
  return useContext(Seccion)?.cerrar ?? sinSeccion;
}
const sinSeccion = () => {};

/**
 * "Cancelar" al lado del botón de guardar: cierra la sección sin guardar. "Listo" donde cada cambio ya se guardó al
 * momento (una lista que se edita fila por fila). Fuera de una sección no se muestra.
 */
export function CancelarSeccion({ texto = "Cancelar" }: { texto?: "Cancelar" | "Listo" }) {
  const seccion = useContext(Seccion);
  if (!seccion) return null;
  return (
    <Button type="button" variant="outline" onClick={seccion.cerrar}>
      {texto}
    </Button>
  );
}
