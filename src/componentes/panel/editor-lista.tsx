import { ChevronDownIcon, ChevronUpIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import { cn } from "cn";
import { MensajeError } from "@/componentes/panel/campo";
import { Button } from "@/componentes/ui/button";

// Componente de cliente: se usa dentro de otros componentes de cliente (recibe funciones como props).
// Lista de filas dentro de un formulario (beneficios, pasos, "por qué elegirnos"): agregar, quitar y ordenar.
// El valor viaja al servidor como JSON en un campo oculto. Cada fila se dibuja con `fila`, que recibe `marca` para
// los campos de la fila: los marca con error y los enlaza a su mensaje.
// Ordenar es poco frecuente (pulido 13.19): subir y bajar van en gris al costado de la fila, junto a "Quitar", también en
// el celular; apilados, para dejarle el ancho al campo. Con `flechasEnFila`, desde 640 px van una al lado de la otra: una
// fila de un renglón (los beneficios, pulido 13.22) no se estira. Con una sola fila no se muestran.
// Con `enBloques` (los servicios de una cotización o una reserva, 20/11): una fila por servicio con un basurero al final,
// arriba a la derecha, en el celular y en pantalla ancha (en el celular, los campos del servicio se apilan a su
// izquierda; el título "Servicio 1" se quitó: los campos ya dicen qué son). Sin borde propio: va dentro de su tarjeta y
// una línea separa cada fila. El basurero, sin cuadro y en gris (rojo solo al pasar el mouse): el ícono ya dice que se
// toca, con el cuadro pesaba más que el servicio; quitar una fila sin guardar se deshace agregándola. No una X: en el
// panel la X cierra. Sin subir ni bajar: el orden de los servicios casi no se toca y en el celular eran dos cajas más
// por servicio.

type MarcaError = { "aria-invalid": boolean; "aria-describedby": string | undefined };

type Props<T> = {
  nombre: string;
  etiqueta: string;
  valor: T[];
  onChange: (valor: T[]) => void;
  nueva: () => T;
  maximo: number;
  /** Texto del botón: "Agregar beneficio". */
  textoAgregar: string;
  /** Errores por fila: "<nombre>.0" es la primera. */
  errores: Partial<Record<string, string>>;
  fila: (elemento: T, cambiar: (nuevo: T) => void, indice: number, marca: MarcaError) => React.ReactNode;
  /** Filas de un renglón: desde 640 px, subir y bajar uno al lado del otro. */
  flechasEnFila?: boolean;
  /**
   * Una fila sin nada elegido ni escrito. Si todas lo están, se envía la lista vacía: una fila que la pantalla ya trae
   * lista para elegir (Nueva reserva) no es un cambio sin guardar y el servidor dice "Agrega al menos …".
   */
  vacia?: (elemento: T) => boolean;
  /** Cada fila en un bloque con su título ("Servicio 1") y "Quitar" con su palabra. */
  enBloques?: boolean;
};

export function EditorLista<T>({ nombre, etiqueta, valor, onChange, nueva, maximo, textoAgregar, errores, fila, flechasEnFila = false, vacia, enBloques = false }: Props<T>) {
  const mover = (i: number, j: number) => {
    const copia = [...valor];
    [copia[i], copia[j]] = [copia[j], copia[i]];
    onChange(copia);
  };

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name={nombre} value={JSON.stringify(vacia && valor.every(vacia) ? [] : valor)} />
      {valor.length > 0 && (
        <ol className={cn("flex flex-col", enBloques ? "divide-y divide-border" : "gap-3")} aria-label={etiqueta}>
          {valor.map((elemento, i) => {
            const error = errores[`${nombre}.${i}`];
            const marca = { "aria-invalid": !!error, "aria-describedby": error ? `${nombre}-${i}-error` : undefined };
            const cambiar = (nuevo: T) => onChange(valor.map((e, k) => (k === i ? nuevo : e)));
            const quitar = () => onChange(valor.filter((_, k) => k !== i));
            if (enBloques)
              return (
                // Sin caja propia (20/11): ya va dentro de una tarjeta; una línea fina separa un servicio del otro
                <li key={i} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-1 gap-y-3 py-4 first:pt-0 @2xl:gap-x-3 @2xl:py-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={quitar}
                    aria-label={`Quitar ${etiqueta.toLowerCase()} ${i + 1}`}
                    title={`Quitar ${etiqueta.toLowerCase()}`}
                    className="col-start-2 row-start-1 justify-self-end text-tinta-suave hover:text-peligro"
                  >
                    <Trash2Icon />
                  </Button>
                  <div className="col-start-1 row-start-1 min-w-0">{fila(elemento, cambiar, i, marca)}</div>
                  {error && (
                    <div className="col-span-2">
                      <MensajeError id={`${nombre}-${i}-error`}>{error}</MensajeError>
                    </div>
                  )}
                </li>
              );
            return (
              <li key={i} className="flex flex-col gap-1">
                <div className="grid grid-cols-[1.25rem_minmax(0,1fr)_auto] gap-x-2">
                  {/* El número, a la altura del primer campo */}
                  <span aria-hidden className="flex h-9 items-center justify-end text-sm text-tinta-suave pointer-coarse:h-11">{i + 1}.</span>
                  <div className="flex flex-col gap-2">{fila(elemento, cambiar, i, marca)}</div>
                  <div className="flex items-start">
                    {valor.length > 1 && (
                      <div className={cn("flex flex-col text-tinta-suave", flechasEnFila && "sm:flex-row")}>
                        <Button type="button" variant="accion" size="icon" disabled={i === 0} onClick={() => mover(i, i - 1)} aria-label={`Subir ${etiqueta.toLowerCase()} ${i + 1}`}>
                          <ChevronUpIcon />
                        </Button>
                        <Button type="button" variant="accion" size="icon" disabled={i === valor.length - 1} onClick={() => mover(i, i + 1)} aria-label={`Bajar ${etiqueta.toLowerCase()} ${i + 1}`}>
                          <ChevronDownIcon />
                        </Button>
                      </div>
                    )}
                    <Button type="button" variant="accion" size="icon" onClick={quitar} aria-label={`Quitar ${etiqueta.toLowerCase()} ${i + 1}`}>
                      <XIcon />
                    </Button>
                  </div>
                </div>
                {error && <MensajeError id={`${nombre}-${i}-error`}>{error}</MensajeError>}
              </li>
            );
          })}
        </ol>
      )}
      {errores[nombre] && <MensajeError id={`${nombre}-error`}>{errores[nombre]}</MensajeError>}
      {valor.length < maximo && (
        <div>
          <Button type="button" variant="outline" onClick={() => onChange([...valor, nueva()])}>
            <PlusIcon />
            {textoAgregar}
          </Button>
        </div>
      )}
    </div>
  );
}
