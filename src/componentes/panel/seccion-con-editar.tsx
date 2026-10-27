"use client";

import { useState } from "react";
import { PencilIcon } from "lucide-react";
import { useHidratado } from "@/componentes/hidratado";
import { ModalFormulario } from "@/componentes/panel/modal-formulario";
import { Button } from "@/componentes/ui/button";

// Fichas del panel en lectura (skill pantallas-panel, §2): cada sección muestra sus datos en un recuadro y "Editar"
// abre su formulario en un modal (ModalFormulario). La página no salta ni cambia mientras se edita, y el modal ya es
// "una edición a la vez". Una sección de nivel 2 lleva su título fuera del recuadro; una de nivel 3 (dentro de otra,
// como cada variante en Precios), dentro, en la cabecera del recuadro.

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

/**
 * La cabecera de una sección de ficha: el título y, en su misma fila, su acción sin borde ("Editar", "＋ Agregar"). La
 * usan SeccionConEditar y las secciones que son una lista (los vehículos del cliente), así las de al lado se ven igual.
 */
export function CabeceraSeccion({ id, titulo, nivel = 2, children }: { id: string; titulo: string; nivel?: 2 | 3; children: React.ReactNode }) {
  const Titulo = nivel === 3 ? "h3" : "h2";
  return (
    <div className="flex min-h-11 items-center justify-between gap-3">
      <Titulo id={`${id}-titulo`} className={nivel === 3 ? "text-lg font-semibold" : "font-heading text-2xl font-bold italic"}>
        {titulo}
      </Titulo>
      {children}
    </div>
  );
}

export function SeccionConEditar({ id, titulo, nivel = 2, etiquetaEditar, tituloModal, abierta = false, lectura, children }: Props) {
  const hidratado = useHidratado();
  // Abierto si la persona lo abrió o, hasta que lo toque, si empieza abierta. La que empieza abierta se abre al cargar
  // la página (hidratado) y no desde el servidor: el diálogo pone el foco en su primer campo cuando se abre
  const [elegido, setAbierto] = useState<boolean | null>(null);
  const abierto = elegido ?? (abierta && hidratado);
  const cabecera = (
    <CabeceraSeccion id={id} titulo={titulo} nivel={nivel}>
      <Button type="button" variant="ghost" disabled={!hidratado} aria-label={etiquetaEditar} onClick={() => setAbierto(true)}>
        <PencilIcon />
        Editar
      </Button>
    </CabeceraSeccion>
  );

  return (
    <section aria-labelledby={`${id}-titulo`} className="flex flex-col gap-3">
      {nivel === 2 && cabecera}
      {/* flex-1: en una grilla, los recuadros de una misma fila quedan del mismo alto */}
      <div className="flex flex-1 flex-col gap-3 rounded-sm border border-border p-4">
        {nivel === 3 && cabecera}
        {lectura}
      </div>
      <ModalFormulario titulo={tituloModal} abierto={abierto} alCambiar={setAbierto}>
        {children}
      </ModalFormulario>
    </section>
  );
}
