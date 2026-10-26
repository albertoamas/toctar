"use client";

import { createContext, useContext, useRef, useState } from "react";
import { PencilIcon } from "lucide-react";
import { useHidratado } from "@/componentes/hidratado";
import { Button } from "@/componentes/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/componentes/ui/dialog";

// Fichas del panel en lectura (skill pantallas-panel, §2): cada sección muestra sus datos en un recuadro y "Editar"
// abre su formulario en un modal (en el celular, una hoja desde abajo). La página no salta ni cambia mientras se edita,
// y el modal ya es "una edición a la vez". Una sección de nivel 2 lleva su título fuera del recuadro; una de nivel 3
// (dentro de otra, como cada variante en Precios), dentro, en la cabecera del recuadro.
// El formulario cierra el modal al guardar con useCerrarSeccion, y pone sus botones en PieSeccion ("Cancelar" o "Listo"
// con CancelarSeccion).

const Seccion = createContext<{ cerrar: () => void } | null>(null);

/** Dónde va el foco al abrir: el primer campo para escribir; si no hay (una lista), el primer botón habilitado. */
const habilitado = (selectores: string[]) => selectores.map((c) => `${c}:not(:disabled)`).join(", ");
const primerControl = (modal: HTMLElement | null) =>
  modal?.querySelector<HTMLElement>(habilitado(["input:not([type=hidden])", "textarea", "select"])) ??
  modal?.querySelector<HTMLElement>(habilitado(["button"])) ??
  true;

type Props = {
  id: string;
  titulo: string;
  nivel?: 2 | 3;
  /** Lo que dice "Editar" al lector de pantalla: "Editar precios de 1 año". */
  etiquetaEditar: string;
  /** El título del modal: "Precios de 1 año". */
  tituloModal: string;
  /** Empieza abierta (por ejemplo, los precios de un servicio recién creado). */
  abierta?: boolean;
  /** Los datos como texto, en el recuadro. */
  lectura: React.ReactNode;
  /** El formulario, en el modal. */
  children: React.ReactNode;
};

export function SeccionConEditar({ id, titulo, nivel = 2, etiquetaEditar, tituloModal, abierta = false, lectura, children }: Props) {
  const hidratado = useHidratado();
  // Abierto si la persona lo abrió o, hasta que lo toque, si empieza abierta. La que empieza abierta se abre al cargar
  // la página (hidratado) y no desde el servidor: el diálogo pone el foco en su primer campo cuando se abre, no si ya
  // venía abierto
  const [elegido, setAbierto] = useState<boolean | null>(null);
  const abierto = elegido ?? (abierta && hidratado);
  const modal = useRef<HTMLDivElement>(null);
  const Titulo = nivel === 3 ? "h3" : "h2";
  const cabecera = (
    <div className="flex min-h-11 items-center justify-between gap-3">
      <Titulo id={`${id}-titulo`} className={nivel === 3 ? "text-lg font-semibold" : "font-heading text-2xl font-bold italic"}>
        {titulo}
      </Titulo>
      <Button type="button" variant="ghost" disabled={!hidratado} aria-label={etiquetaEditar} onClick={() => setAbierto(true)}>
        <PencilIcon />
        Editar
      </Button>
    </div>
  );

  return (
    <section aria-labelledby={`${id}-titulo`} className="flex flex-col gap-3">
      {nivel === 2 && cabecera}
      {/* flex-1: en una grilla, los recuadros de una misma fila quedan del mismo alto */}
      <div className="flex flex-1 flex-col gap-3 rounded-sm border border-border p-4">
        {nivel === 3 && cabecera}
        {lectura}
      </div>
      <Dialog open={abierto} onOpenChange={setAbierto}>
        {/* En el celular, una hoja desde abajo que ocupa el ancho; desde 640 px, el modal centrado */}
        <DialogContent ref={modal} initialFocus={() => primerControl(modal.current)} className="max-h-[calc(100dvh-2rem)] gap-5 overflow-y-auto text-base max-sm:top-auto max-sm:bottom-0 max-sm:max-w-full max-sm:translate-y-0 max-sm:rounded-b-none sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl">{tituloModal}</DialogTitle>
          </DialogHeader>
          <Seccion.Provider value={{ cerrar: () => setAbierto(false) }}>{children}</Seccion.Provider>
        </DialogContent>
      </Dialog>
    </section>
  );
}

/** Para el formulario de una sección: cierra el modal (después de guardar). Fuera de una sección no hace nada. */
export function useCerrarSeccion(): () => void {
  return useContext(Seccion)?.cerrar ?? sinSeccion;
}
const sinSeccion = () => {};

/** Los botones del formulario, al pie del modal: fijos abajo mientras el formulario se desplaza (en el celular, la hoja). */
export function PieSeccion({ children }: { children: React.ReactNode }) {
  return <div className="sticky -bottom-4 -mx-4 -mb-4 flex flex-wrap gap-2 border-t border-border bg-popover p-4">{children}</div>;
}

/**
 * "Cancelar" al lado del botón de guardar: cierra sin guardar. "Listo" donde cada cambio ya se guardó al momento (una
 * lista que se edita fila por fila). Fuera de una sección no se muestra.
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
