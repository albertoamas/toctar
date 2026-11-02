import Link from "next/link";
import { cn } from "cn";
import { ChevronRightIcon } from "lucide-react";

/** Los tonos de las insignias de estado (.tt-estado de globals.css). Sin tono, gris. */
export type TonoEstado = "exito" | "aviso" | "peligro" | "info" | "violeta";

// Listas de un toque del panel (skill pantallas-panel, §2 "Lista"): una tarjeta con una fila por elemento, y cada fila
// abre su pantalla. Lo que identifica va arriba (un nombre, o una placa o una cuenta, más marcada), lo que decide en
// negrita debajo ("Desde 700 Bs"), los datos secundarios en tinta suave, y el estado y lo que pide atención en
// insignias de color (pedido 26). La flecha dice que se toca.
// La usan el inicio (lo del día) y las listas de cada módulo, así todas se ven y se leen igual.

export type DatosFila = {
  href: string;
  titulo: string;
  /** Marcado: una placa o una cuenta ("3 pendientes"), que es como el taller las nombra. */
  tituloGrande?: boolean;
  /** Lo que decide, en negrita debajo del título: "Desde 700 Bs". */
  dato?: string | null;
  /** Datos secundarios, en una línea que se parte si no cabe: ["5 variantes", "1 día"]. */
  detalles?: string[];
  /** Lo que pide atención ("Faltan 3 precios", "Debía ingresar el 21/10"): insignia de aviso junto al título. */
  aviso?: string | null;
  /** El estado escrito ("En proceso", "Inactivo"), en una insignia después del aviso (los dos se ven: pulido 9.1). */
  estado?: string;
  /** El color del estado, si dice algo por sí mismo: "Confirmado" en verde, "Perdido" o "Cancelada" en ámbar. */
  tonoEstado?: TonoEstado;
  /** Inactiva o desactivada: atenuada. */
  atenuada?: boolean;
};

export function ListaFilas({ etiqueta, filas }: { etiqueta: string; filas: DatosFila[] }) {
  return (
    <ul aria-label={etiqueta} className="tt-tarjeta-panel flex flex-col divide-y divide-border overflow-hidden">
      {filas.map((f) => (
        <li key={f.href}>
          <FilaLista {...f} />
        </li>
      ))}
    </ul>
  );
}

function FilaLista({ href, titulo, tituloGrande, dato, detalles = [], aviso, estado, tonoEstado, atenuada }: DatosFila) {
  return (
    <Link href={href} className={cn("flex min-h-11 items-center gap-3 px-4 py-3 hover:bg-superficie/60 focus-visible:-outline-offset-2", atenuada && "text-tinta-suave")}>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className={tituloGrande ? "tt-placa text-base" : "font-semibold"}>{titulo}</span>
          {estado && <span className={cn("tt-estado", tonoEstado && `tt-estado--${tonoEstado}`)}>{estado}</span>}
          {aviso && <span className="tt-estado tt-estado--aviso">{aviso}</span>}
        </span>
        {dato && <span className="text-sm font-semibold tabular-nums">{dato}</span>}
        {detalles.length > 0 && (
          <span className="flex flex-wrap gap-x-3 text-sm text-tinta-suave">
            {/* Por posición: dos datos pueden decir lo mismo (un cliente y un espacio con el mismo nombre) */}
            {detalles.map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </span>
        )}
      </span>
      <ChevronRightIcon className="size-5 shrink-0 text-tinta-suave" aria-hidden />
    </Link>
  );
}
