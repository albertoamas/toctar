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
// desplegable del panel (el de "Más") con un grupo de opciones: se recorre con las flechas y se elige con Enter.

type Props = {
  valor: string;
  alCambiar: (icono: string) => void;
  /** Cómo se anuncia: "Beneficio 1, ícono" (se le suma el elegido: "…: Sol y rayos UV"). */
  etiqueta: string;
};

export function ElegirIcono({ valor, alCambiar, etiqueta }: Props) {
  const hidratado = useHidratado();
  const elegido = iconoDe(valor);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button type="button" variant="outline" disabled={!hidratado} aria-label={`${etiqueta}: ${ICONOS_BENEFICIO[elegido]}`} className="shrink-0 gap-0.5 px-2" />}
      >
        <IconoBeneficio icono={elegido} className="size-6 text-rojo" />
        <ChevronDownIcon className="size-3.5 text-tinta-suave" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-auto p-2">
        <Menu.RadioGroup value={elegido} onValueChange={(v) => alCambiar(String(v))} className="grid grid-cols-3 gap-1 sm:grid-cols-5">
          {Object.entries(ICONOS_BENEFICIO).map(([clave, nombre]) => (
            <Menu.RadioItem
              key={clave}
              value={clave}
              closeOnClick
              className="flex w-22 cursor-pointer flex-col items-center gap-1 rounded-md border border-transparent p-2 text-center text-xs leading-tight outline-hidden select-none focus:bg-accent data-checked:border-info data-checked:bg-info-fondo data-checked:font-semibold"
            >
              <IconoBeneficio icono={clave} className="size-6 text-rojo" />
              {nombre}
            </Menu.RadioItem>
          ))}
        </Menu.RadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
