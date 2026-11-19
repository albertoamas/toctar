"use client";

import { useState } from "react";
import { cn } from "cn";
import { PencilIcon } from "lucide-react";
import { useHidratado } from "@/componentes/hidratado";
import { CabeceraSeccion, CabeceraTarjeta } from "@/componentes/panel/cabecera-seccion";
import { ModalFormulario } from "@/componentes/panel/modal-formulario";
import { Button } from "@/componentes/ui/button";

// Fichas del panel en lectura (skill pantallas-panel, §2): cada sección muestra sus datos en una tarjeta y "Editar"
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
  /** Clases del recuadro, donde el lugar lo pide (un nivel 3 suelto sobre el gris lleva fondo blanco). */
  claseRecuadro?: string;
  /** Los datos como texto, en el recuadro. */
  lectura: React.ReactNode;
  /** El formulario, en el modal. */
  children: React.ReactNode;
};

export function SeccionConEditar({ id, titulo, nivel = 2, etiquetaEditar, tituloModal, abierta = false, claseRecuadro, lectura, children }: Props) {
  const hidratado = useHidratado();
  // Abierto si la persona lo abrió o, hasta que lo toque, si empieza abierta. La que empieza abierta se abre al cargar
  // la página (hidratado) y no desde el servidor: el diálogo pone el foco en su primer campo cuando se abre
  const [elegido, setAbierto] = useState<boolean | null>(null);
  const abierto = elegido ?? (abierta && hidratado);
  const editar = (
      <Button type="button" variant="accion" disabled={!hidratado} aria-label={etiquetaEditar} onClick={() => setAbierto(true)}>
        <PencilIcon />
        Editar
      </Button>
  );
  const modal = (
      <ModalFormulario titulo={tituloModal} abierto={abierto} alCambiar={setAbierto}>
        {children}
      </ModalFormulario>
  );

  // Una sección de nivel 3 va dentro de otra tarjeta: un recuadro con borde, sin sombra, con el título arriba de lo que
  // dice; `claseRecuadro` lo ajusta donde va suelto
  if (nivel === 3) {
    return (
      <section aria-labelledby={`${id}-titulo`} className={cn("flex flex-1 flex-col gap-3 rounded-lg border border-border p-4", claseRecuadro)}>
        <CabeceraSeccion id={id} titulo={titulo} nivel={3}>
          {editar}
        </CabeceraSeccion>
        {lectura}
        {modal}
      </section>
    );
  }
  // El título adentro, en la cabecera de la tarjeta, con "Editar" al lado (C7, 18/11). En una grilla, las tarjetas de una
  // misma fila quedan del mismo alto
  return (
    <section aria-labelledby={`${id}-titulo`} className="tt-tarjeta-panel flex flex-col overflow-hidden">
      <CabeceraTarjeta id={id} titulo={titulo}>
        {editar}
      </CabeceraTarjeta>
      <div className={cn("flex flex-1 flex-col gap-3 p-4 sm:p-5", claseRecuadro)}>{lectura}</div>
      {modal}
    </section>
  );
}
