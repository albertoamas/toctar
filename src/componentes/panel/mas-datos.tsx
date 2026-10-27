"use client";

import { useRef } from "react";
import { PlusIcon } from "lucide-react";

// "＋ Agregar …" (skill pantallas-panel, §2 "Crear"): los datos opcionales de un formulario de crear, plegados para que
// el caso común sea llenar poco. Es un <details> nativo: se abre aunque la página no haya terminado de cargar y sus
// campos se envían igual estando cerrado. Empieza abierto si alguno trae un valor o un error, así un error nunca queda
// escondido (useFocoEnError llega a su campo). Al abrirlo con un toque, el foco pasa a su primer campo.

type Props = {
  /** Lo que se agrega: "Agregar correo, NIT y notas". */
  texto: string;
  abierto: boolean;
  children: React.ReactNode;
};

export function MasDatos({ texto, abierto, children }: Props) {
  const tocado = useRef(false);
  return (
    <details
      open={abierto}
      onToggle={(e) => {
        // Solo si lo abrió la persona: el que empieza abierto por un error deja el foco a useFocoEnError
        if (!tocado.current || !e.currentTarget.open) return;
        e.currentTarget.querySelector<HTMLElement>("input:not([type=hidden]), textarea, select")?.focus();
      }}
      className="group"
    >
      <summary
        onClick={() => (tocado.current = true)}
        className="inline-flex min-h-11 w-fit cursor-pointer list-none items-center gap-2 text-sm font-semibold hover:underline group-open:hidden [&::-webkit-details-marker]:hidden"
      >
        <PlusIcon className="size-4" aria-hidden />
        {texto}
      </summary>
      <div className="flex flex-col gap-6">{children}</div>
    </details>
  );
}
