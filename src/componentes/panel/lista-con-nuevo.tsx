import { CheckIcon, PlusIcon } from "lucide-react";
import { cn } from "cn";
import { Seccion } from "@/componentes/panel/cabecera-seccion";

// Componente de cliente: se usa dentro de otros componentes de cliente (recibe funciones como props).
// Elegir de una lista en un flujo de pasos, con "Nuevo" que se llena ahí mismo (recorrido visual del 24/11, a pedido del
// desarrollador): el cliente y el vehículo de Nueva cotización y de Nueva reserva, con la misma forma. Tocar una tarjeta
// la marca (con su tilde) y no avanza: confirma el "Siguiente" del pie de cada flujo. "Nuevo…" va arriba, punteada; al
// marcarla, sus campos se abren dentro de su tarjeta (sin ir a otra pantalla ni un botón para volver a buscar). Lo
// escrito se conserva si se marca otra y se vuelve. Cada tarjeta, el nombre (o la placa) y una línea que ayuda a elegir.

export const NUEVO = "nuevo";

type OpcionLista = {
  clave: string;
  titulo: string;
  /** El título es una placa: con su letra. */
  esPlaca?: boolean;
  detalle?: string | null;
};

type Props = {
  /** La tarjeta que la contiene: su id y su título ("Cliente", "Vehículo"). */
  id: string;
  titulo: string;
  /** Arriba de la lista, dentro de la tarjeta: el buscador. */
  encima?: React.ReactNode;
  /** Debajo de la lista, dentro de la tarjeta: "No hay clientes…", "Son los más recientes…". */
  debajo?: React.ReactNode;
  /** El nombre del grupo para el lector de pantalla: "Elegir cliente". */
  etiqueta: string;
  opciones: OpcionLista[];
  /** "Cliente nuevo", "Otro vehículo": la primera, punteada. Sin él, no se ofrece. */
  nuevo?: { titulo: string; detalle?: string } | null;
  /** La marcada: una clave, NUEVO o null. */
  elegida: string | null;
  alElegir: (clave: string) => void;
  /** Los campos de "Nuevo", dentro de su tarjeta cuando está marcada. Se montan siempre: lo escrito no se pierde. */
  children?: React.ReactNode;
  /** Falta elegir: borde rojo. */
  conError?: boolean;
};

export function ListaConNuevo({ id, titulo, encima, debajo, etiqueta, opciones, nuevo, elegida, alElegir, children, conError }: Props) {
  const marca = (esta: boolean) => (
    <span className={cn("grid size-6 shrink-0 place-items-center rounded-full", esta ? "bg-tinta text-fondo" : "border border-border")} aria-hidden>
      {esta && <CheckIcon className="size-4" strokeWidth={3} />}
    </span>
  );
  const tarjeta = (esta: boolean, punteada = false) =>
    cn(
      "w-full rounded-lg border border-border bg-fondo transition-colors",
      punteada && !esta && "border-dashed border-input",
      esta && "border-tinta ring-1 ring-tinta",
      conError && !elegida && "border-destructive",
    );
  const fila = "flex min-h-16 w-full items-center gap-3 rounded-lg px-4 py-3 text-left hover:bg-superficie/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
  const nuevaMarcada = elegida === NUEVO;

  return (
    <Seccion id={id} titulo={titulo} sinRelleno>
      {encima}
      <ul role="radiogroup" aria-label={etiqueta} className="flex flex-col gap-2 p-4 sm:p-5">
        {nuevo && (
          <li className={tarjeta(nuevaMarcada, true)}>
            <button type="button" role="radio" aria-checked={nuevaMarcada} onClick={() => alElegir(NUEVO)} className={cn(fila, nuevaMarcada && "bg-neutro-fondo")}>
              <PlusIcon className="size-5 shrink-0 text-tinta-suave" aria-hidden />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-semibold">{nuevo.titulo}</span>
                {nuevo.detalle && <span className="text-sm text-tinta-suave">{nuevo.detalle}</span>}
              </span>
              {marca(nuevaMarcada)}
            </button>
            {/* Montados siempre, escondidos sin marcar: así lo escrito queda si se marca otra y se vuelve */}
            <div hidden={!nuevaMarcada} className="flex flex-col gap-5 border-t border-border px-4 pt-4 pb-5">
              {children}
            </div>
          </li>
        )}
        {opciones.map((o) => {
          const esta = elegida === o.clave;
          return (
            <li key={o.clave} className={tarjeta(esta)}>
              <button type="button" role="radio" aria-checked={esta} onClick={() => alElegir(o.clave)} className={cn(fila, esta && "bg-neutro-fondo")}>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className={o.esPlaca ? "tt-placa text-base" : "font-semibold"}>{o.titulo}</span>
                  {o.detalle && <span className="text-sm text-tinta-suave">{o.detalle}</span>}
                </span>
                {marca(esta)}
              </button>
            </li>
          );
        })}
      </ul>
      {debajo}
    </Seccion>
  );
}

/** El "Siguiente" de un paso para elegir, en gris hasta que se elige una (24/11). */
export const GRIS_SIN_ELEGIR = "disabled:bg-superficie disabled:text-tinta-suave disabled:opacity-100";
