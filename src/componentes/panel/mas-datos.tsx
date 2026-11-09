"use client";

import { useRef, useState } from "react";
import { PlusIcon } from "lucide-react";

// "＋ Agregar …" (skill pantallas-panel, §2 "Crear"): los datos opcionales de un formulario de crear, plegados para que
// el caso común sea llenar poco. Es un <details> nativo: se abre aunque la página no haya terminado de cargar y sus
// campos se envían igual estando cerrado. Empieza abierto si alguno trae un valor o un error, así un error nunca queda
// escondido (useFocoEnError llega a su campo), y una vez abierto no se vuelve a cerrar solo: un envío sin esos datos no
// esconde lo que la persona abrió. Al abrirlo con un toque, el foco pasa a su primer campo.

type Props = {
  /** Lo que se agrega: "Agregar correo, NIT y notas". */
  texto: string;
  abierto: boolean;
  /** Al abrirlo la persona (la reserva sin cotización muestra entonces su "Siguiente"). */
  alAbrir?: () => void;
  children: React.ReactNode;
};

export function MasDatos({ texto, abierto, alAbrir, children }: Props) {
  const tocado = useRef(false);
  // Solo pasa de cerrado a abierto: si `abierto` vuelve a false después de un envío, sigue abierto
  const [fijo, setFijo] = useState(abierto);
  if (abierto && !fijo) setFijo(true);
  return (
    <details
      open={fijo}
      onToggle={(e) => {
        // Solo si lo abrió la persona, y una vez: el que se abre por un error deja el foco a useFocoEnError
        if (!tocado.current || !e.currentTarget.open) return;
        tocado.current = false;
        alAbrir?.();
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
