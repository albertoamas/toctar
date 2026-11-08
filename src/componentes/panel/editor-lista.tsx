import { ChevronDownIcon, ChevronUpIcon, PlusIcon, XIcon } from "lucide-react";
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
};

export function EditorLista<T>({ nombre, etiqueta, valor, onChange, nueva, maximo, textoAgregar, errores, fila, flechasEnFila = false }: Props<T>) {
  const mover = (i: number, j: number) => {
    const copia = [...valor];
    [copia[i], copia[j]] = [copia[j], copia[i]];
    onChange(copia);
  };

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name={nombre} value={JSON.stringify(valor)} />
      {valor.length > 0 && (
        <ol className="flex flex-col gap-3" aria-label={etiqueta}>
          {valor.map((elemento, i) => {
            const error = errores[`${nombre}.${i}`];
            const marca = { "aria-invalid": !!error, "aria-describedby": error ? `${nombre}-${i}-error` : undefined };
            return (
              <li key={i} className="flex flex-col gap-1">
                <div className="grid grid-cols-[1.25rem_minmax(0,1fr)_auto] gap-x-2">
                  {/* El número, a la altura del primer campo */}
                  <span aria-hidden className="flex h-9 items-center justify-end text-sm text-tinta-suave pointer-coarse:h-11">{i + 1}.</span>
                  <div className="flex flex-col gap-2">{fila(elemento, (nuevo) => onChange(valor.map((e, k) => (k === i ? nuevo : e))), i, marca)}</div>
                  <div className="flex items-start">
                    {valor.length > 1 && (
                      <div className={cn("flex flex-col text-tinta-suave", flechasEnFila && "sm:flex-row")}>
                        <Button type="button" variant="ghost" size="icon" disabled={i === 0} onClick={() => mover(i, i - 1)} aria-label={`Subir ${etiqueta.toLowerCase()} ${i + 1}`}>
                          <ChevronUpIcon />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" disabled={i === valor.length - 1} onClick={() => mover(i, i + 1)} aria-label={`Bajar ${etiqueta.toLowerCase()} ${i + 1}`}>
                          <ChevronDownIcon />
                        </Button>
                      </div>
                    )}
                    <Button type="button" variant="ghost" size="icon" onClick={() => onChange(valor.filter((_, k) => k !== i))} aria-label={`Quitar ${etiqueta.toLowerCase()} ${i + 1}`}>
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
