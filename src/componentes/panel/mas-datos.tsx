"use client";

import { useRef, useState } from "react";
import { CheckIcon, ChevronUpIcon, PencilIcon, PlusIcon, XIcon } from "lucide-react";
import { cn } from "cn";
import { Button, buttonVariants } from "@/componentes/ui/button";

// "＋ Agregar …" (skill pantallas-panel, §2 "Crear"): los datos opcionales de un formulario de crear, plegados para que
// el caso común sea llenar poco. Es un <details> nativo: se abre aunque la página no haya terminado de cargar y sus
// campos se envían igual estando cerrado. Empieza abierto si alguno trae un valor o un error, así un error nunca queda
// escondido (useFocoEnError llega a su campo). Al abrirlo con un toque, el foco pasa a su primer campo.
// Pulido final (10/11): cerrado, un botón con borde, como "＋ Agregar servicio" (como enlace de texto no parecía que se
// pudiera tocar). Abierto, debajo de una línea fina, con su título y el botón para cerrarlo en la misma fila, como el
// título de una sección con su acción (antes quedaba suelto y no se cerraba; sin recuadro: va dentro de su tarjeta y un
// recuadro dentro de otro no se lee). El botón, según el `modo`:
// - "agregar": "Quitar" borra lo escrito y lo cierra; así nada escondido se guarda.
// - "cambiar" (lo que ya viene puesto, con `detalle`: "Ahora: 200 Bs, hasta el 24/11"): "Listo" lo cierra, y el detalle
//   dice lo nuevo.
// - "ver" (más filas de una lista): sin recuadro, con "Ver menos" al pie.

type Props = {
  /** El botón cerrado: "Agregar correo, NIT y notas". */
  texto: string;
  /** El título abierto ("Correo, NIT y notas"); si no, el texto del botón. */
  titulo?: string;
  /** Lo que ya viene puesto y se guarda si no se abre: "Ahora: 200 Bs, hasta el 24/11". */
  detalle?: string;
  /**
   * "agregar": datos nuevos, y "Quitar" los borra. "cambiar": lo que ya viene puesto o ya está guardado (al editar), y
   * "Listo" lo cierra sin borrar nada. Si no se dice, "cambiar" con `detalle` y "agregar" sin él.
   */
  modo?: "agregar" | "cambiar" | "ver";
  abierto: boolean;
  /** Alguno de sus campos tiene un error: en el modo "cambiar", no se cierra hasta corregirlo. */
  conError?: boolean;
  /** Al abrirlo la persona (la reserva sin cotización muestra entonces su "Siguiente"). */
  alAbrir?: () => void;
  /**
   * "Quitar", para lo que no se borra vaciando sus campos (las filas de una lista). Sin él, se vacían los campos de
   * adentro, también los controlados (con el evento que escucha React).
   */
  alQuitar?: () => void;
  children: React.ReactNode;
};

/**
 * Vacía un campo como si lo borrara la persona: el formulario controlado y el aviso de cambios sin guardar se enteran. Un
 * menú, solo si tiene una opción vacía (si no, quedaría sin ninguna elegida).
 */
function vaciar(campo: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) {
  if (campo instanceof HTMLSelectElement && ![...campo.options].some((o) => o.value === "")) return;
  const prototipo = Object.getPrototypeOf(campo) as object;
  Object.getOwnPropertyDescriptor(prototipo, "value")?.set?.call(campo, "");
  campo.dispatchEvent(new Event(campo instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
}

export function MasDatos({ texto, titulo, detalle, modo = detalle ? "cambiar" : "agregar", abierto, conError = false, alAbrir, alQuitar, children }: Props) {
  const tocado = useRef(false);
  const caja = useRef<HTMLDetailsElement>(null);
  const [abiertoAhora, setAbiertoAhora] = useState(abierto);
  // Se abre solo cuando llega un valor o un error (de cerrado a abierto); cerrarlo es de la persona
  const [antes, setAntes] = useState(abierto);
  if (abierto !== antes) {
    setAntes(abierto);
    if (abierto) setAbiertoAhora(true);
  }

  function cerrar() {
    if (modo === "agregar") {
      if (alQuitar) alQuitar();
      else caja.current?.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input:not([type=hidden]):not([type=checkbox]):not([type=radio]), textarea, select").forEach(vaciar);
    }
    setAbiertoAhora(false);
    // El foco vuelve al botón que lo abre
    requestAnimationFrame(() => caja.current?.querySelector("summary")?.focus());
  }

  const Icono = modo === "cambiar" ? PencilIcon : PlusIcon;
  const cierre =
    modo === "agregar" ? { texto: "Quitar", Icono: XIcon } : modo === "cambiar" ? { texto: "Listo", Icono: CheckIcon } : { texto: "Ver menos", Icono: ChevronUpIcon };
  const nombre = titulo ?? texto;
  // Lo que cambia algo que ya viene puesto, con un error (`conError`), queda abierto hasta corregirlo: cerrado, el
  // siguiente envío devolvería el mismo error escondido. Lo nuevo sí se quita: al borrarlo, el error se va con el envío
  const fijoPorError = conError && modo === "cambiar";
  const botonCerrar = (
    <Button type="button" variant="ghost" onClick={cerrar}>
      <cierre.Icono />
      {cierre.texto}
      {/* Qué cierra, para el lector de pantalla (en el contenido y no en aria-label: así no se confunde con un campo) */}
      {modo !== "ver" && <span className="sr-only"> {nombre}</span>}
    </Button>
  );

  return (
    <details
      ref={caja}
      open={abiertoAhora || fijoPorError}
      onToggle={(e) => {
        const ahora = e.currentTarget.open;
        setAbiertoAhora(ahora);
        // Solo si lo abrió la persona, y una vez: el que se abre por un error deja el foco a useFocoEnError
        if (!tocado.current || !ahora) return;
        tocado.current = false;
        alAbrir?.();
        e.currentTarget.querySelector<HTMLElement>("input:not([type=hidden]), textarea, select")?.focus();
      }}
      className="group"
    >
      <summary
        onClick={() => (tocado.current = true)}
        className={cn(
          buttonVariants({ variant: "outline" }),
          "h-auto min-h-11 w-fit max-w-full cursor-pointer list-none justify-start gap-2 px-3 py-2 text-left whitespace-normal group-open:hidden [&::-webkit-details-marker]:hidden",
        )}
      >
        <Icono aria-hidden />
        {detalle ? (
          <span className="flex flex-col">
            <span className="font-semibold">{texto}</span>
            <span className="font-normal text-tinta-suave">{detalle}</span>
          </span>
        ) : (
          <span className="font-semibold">{texto}</span>
        )}
      </summary>
      {modo === "ver" ? (
        <div className="flex flex-col gap-3">
          {children}
          <div>{botonCerrar}</div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 border-t border-border pt-4">
          <div className="-my-1 -mr-2 flex min-h-11 items-center justify-between gap-3">
            <p className="font-semibold">{nombre}</p>
            {!fijoPorError && botonCerrar}
          </div>
          <div className="flex flex-col gap-6">{children}</div>
        </div>
      )}
    </details>
  );
}
