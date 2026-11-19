"use client";

import { useState } from "react";
import { Combobox } from "@base-ui/react/combobox";
import { CheckIcon, ChevronDownIcon, PlusIcon } from "lucide-react";
import { cn } from "cn";
import { useAtributosDeCampo } from "@/componentes/panel/campo";

// Un campo que se escribe y se elige de una lista que se filtra mientras se escribe (pedido 52, C7 fase 2): la marca de
// un vehículo. Sobre el Combobox de Base UI (ya instalado): teclado (flechas, Enter, Escape), lector de pantalla y
// toque. Lo que queda escrito es el valor del campo (`nombre`); con `agregar`, si no está en la lista, la última opción
// es "Agregar «X»" (el servidor la suma). Dentro de un Campo toma su id y su ayuda (useAtributosDeCampo).

type Opcion = { valor: string; nueva?: boolean };

export function CampoConBusqueda(props: {
  id: string;
  nombre: string;
  opciones: string[];
  /** Las opciones que coinciden con lo escrito, en el orden en que se muestran. */
  filtrar: (opciones: string[], texto: string) => string[];
  /** Si lo escrito ya es una opción (con otras mayúsculas), cuál: no se ofrece agregarla. */
  exacta: (opciones: string[], texto: string) => string | null;
  valorInicial?: string;
  alCambiar?: (valor: string) => void;
  /** Ofrece "Agregar «X»" cuando lo escrito no está en la lista. */
  agregar?: boolean;
  placeholder?: string;
  invalido?: boolean;
  "aria-describedby"?: string;
}) {
  const { id, nombre, opciones, filtrar, exacta, valorInicial = "", alCambiar, agregar, placeholder, invalido } = props;
  const atributos = useAtributosDeCampo({ id, "aria-describedby": props["aria-describedby"] });
  const [texto, setTexto] = useState(valorInicial);
  const cambiar = (valor: string) => {
    setTexto(valor);
    alCambiar?.(valor);
  };
  const escrito = texto.trim();
  const coinciden: Opcion[] = filtrar(opciones, texto).map((valor) => ({ valor }));
  // "Agregar «X»" solo si lo escrito no coincide con ninguna: "toy" encuentra Toyota y no ofrece agregar "toy"
  const items: Opcion[] = agregar && escrito && coinciden.length === 0 && !exacta(opciones, escrito) ? [{ valor: escrito, nueva: true }] : coinciden;

  return (
    <Combobox.Root<Opcion>
      items={items}
      filter={null}
      inputValue={texto}
      // Solo lo que escribe la persona (o borra): al salir del campo sin elegir, el Combobox volvería el texto a la última
      // opción elegida y una marca escrita a mano se perdería
      onInputValueChange={(valor, detalles) => {
        // ("input-clear" es ese volver atrás; borrar escribiendo llega como "input-change")
        if (detalles.reason === "input-change" || detalles.reason === "clear-press") cambiar(valor);
      }}
      onValueChange={(opcion) => opcion && cambiar(opcion.valor)}
      itemToStringLabel={(o) => o.valor}
      itemToStringValue={(o) => o.valor}
      isItemEqualToValue={(a, b) => a.valor === b.valor}
      autoHighlight
    >
      <div className="relative">
        {/* El valor va en su campo oculto: el Combobox no manda el nombre del input con el formulario */}
        <input type="hidden" name={nombre} value={texto} />
        <Combobox.Input
          {...atributos}
          placeholder={placeholder}
          autoComplete="off"
          aria-invalid={invalido || undefined}
          className="h-9 w-full min-w-0 rounded-lg border border-input bg-fondo py-1 pr-9 pl-2.5 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 pointer-coarse:h-11"
        />
        <Combobox.Trigger aria-label="Ver la lista" className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-tinta-suave">
          <ChevronDownIcon className="size-4" aria-hidden />
        </Combobox.Trigger>
      </div>
      <Combobox.Portal>
        <Combobox.Positioner sideOffset={4} className="isolate z-50 outline-none">
          <Combobox.Popup className="max-h-[min(18rem,var(--available-height))] w-(--anchor-width) overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none">
            <Combobox.Empty className="px-2.5 py-2 text-sm text-tinta-suave empty:hidden">No está en la lista.</Combobox.Empty>
            <Combobox.List>
              {(o: Opcion) => (
                <Combobox.Item
                  key={`${o.nueva ? "+" : ""}${o.valor}`}
                  value={o}
                  className={cn(
                    "flex min-h-9 cursor-default items-center gap-2 rounded-md px-2.5 text-base outline-none select-none data-highlighted:bg-superficie pointer-coarse:min-h-11",
                    o.nueva && "font-semibold",
                  )}
                >
                  {o.nueva ? (
                    <>
                      <PlusIcon className="size-4 shrink-0" aria-hidden />
                      Agregar «{o.valor}»
                    </>
                  ) : (
                    <>
                      <span className="flex-1">{o.valor}</span>
                      <Combobox.ItemIndicator>
                        <CheckIcon className="size-4" aria-hidden />
                      </Combobox.ItemIndicator>
                    </>
                  )}
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
