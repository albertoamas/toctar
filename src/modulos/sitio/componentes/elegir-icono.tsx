import { Menu } from "@base-ui/react/menu";
import { ChevronDownIcon } from "lucide-react";
import { useHidratado } from "@/componentes/hidratado";
import { IconoBeneficio } from "@/componentes/sitio/icono-beneficio";
import { Button } from "@/componentes/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/componentes/ui/dropdown-menu";
import { ICONOS_BENEFICIO, iconoDe } from "../beneficios";

// Componente de cliente: se usa dentro de otros componentes de cliente (recibe funciones como props).
// El ícono de un beneficio (pulido 13.22): se elige viendo los dibujos. Antes era una lista desplegable del sistema, que
// solo puede mostrar texto ("Sol y rayos UV", "Agua"…): había que adivinar el dibujo. El botón muestra el ícono en rojo,
// como en el sitio, y abre una cuadrícula con los 15, cada uno con su nombre debajo; el elegido, marcado. Es el menú
// desplegable del panel (el de "Más") con un grupo de opciones, que se elige con Enter. El menú solo sabe ir de a uno:
// las flechas de la cuadrícula las maneja `moverEnCuadricula` (izquierda y derecha, de a uno; arriba y abajo, de a una
// fila). En tinta y no en rojo: en el panel el rojo es solo del botón principal (identidad visual).

type Props = {
  valor: string;
  alCambiar: (icono: string) => void;
  /** Cómo se anuncia: "Beneficio 1, ícono" (se le suma el elegido: "…: Sol y rayos UV"). */
  etiqueta: string;
  /**
   * El error de la fila, si hay: el botón lo anuncia. No se marca inválido: casi siempre el error es del texto, y el foco
   * (useFocoEnError) va al primer campo marcado.
   */
  describedBy?: string;
};

const PASOS: Record<string, "izquierda" | "derecha" | "arriba" | "abajo"> = { ArrowLeft: "izquierda", ArrowRight: "derecha", ArrowUp: "arriba", ArrowDown: "abajo" };

/** Las flechas en la cuadrícula: de a uno a los costados, de a una fila arriba y abajo (3 columnas, o 5 desde 640 px). */
function moverEnCuadricula(e: React.KeyboardEvent<HTMLDivElement>) {
  const paso = PASOS[e.key];
  if (!paso) return;
  const opciones = [...e.currentTarget.querySelectorAll<HTMLElement>("[role=menuitemradio]")];
  const actual = opciones.indexOf(document.activeElement as HTMLElement);
  if (actual < 0) return;
  const columnas = getComputedStyle(e.currentTarget).gridTemplateColumns.split(" ").length;
  const destino = actual + { izquierda: -1, derecha: 1, arriba: -columnas, abajo: columnas }[paso];
  e.preventDefault();
  e.stopPropagation();
  opciones[destino]?.focus();
}

export function ElegirIcono({ valor, alCambiar, etiqueta, describedBy }: Props) {
  const hidratado = useHidratado();
  const elegido = iconoDe(valor);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button type="button" variant="outline" disabled={!hidratado} aria-label={`${etiqueta}: ${ICONOS_BENEFICIO[elegido]}`} aria-describedby={describedBy} className="shrink-0 gap-0.5 px-2" />}
      >
        <IconoBeneficio icono={elegido} className="size-6 text-tinta" />
        <ChevronDownIcon className="size-3.5 text-tinta-suave" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-auto p-2">
        <Menu.RadioGroup value={elegido} onValueChange={(v) => alCambiar(String(v))} onKeyDownCapture={moverEnCuadricula} className="grid grid-cols-3 gap-1 sm:grid-cols-5">
          {Object.entries(ICONOS_BENEFICIO).map(([clave, nombre]) => (
            <Menu.RadioItem
              key={clave}
              value={clave}
              closeOnClick
              className="flex w-22 cursor-pointer flex-col items-center gap-1 rounded-md border border-transparent p-2 text-center text-xs leading-tight outline-hidden select-none focus:bg-accent data-checked:border-info data-checked:bg-info-fondo data-checked:font-semibold"
            >
              <IconoBeneficio icono={clave} className="size-6 text-tinta" />
              {nombre}
            </Menu.RadioItem>
          ))}
        </Menu.RadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
