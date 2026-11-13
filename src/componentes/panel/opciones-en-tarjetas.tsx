import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { CheckIcon, type LucideIcon } from "lucide-react";
import { cn } from "cn";
import { MensajeError } from "@/componentes/panel/campo";

// Componente de cliente: se usa dentro de otros componentes de cliente (recibe funciones como props).
// Elegir una opción entre pocas, con tarjetas que se tocan enteras: "¿Cómo pagó?" al registrar un pago y "Qué tiene" en
// el detalle del checklist (revisión del 13/11). Cada tarjeta ES la opción de radio (no una etiqueta que le pasa el toque a
// un circulito adentro): se toca en cualquier parte. Sin el circulito: la elegida se marca con su borde, el fondo y un
// check, sin rojo (el rojo del panel es solo el botón principal). Por dentro sigue siendo un grupo de radio: se recorre
// con las flechas y el lector lo anuncia como opciones.
// El valor va en un campo oculto propio: los radios de base-ui se vaciaban al reiniciarse el formulario tras un error.

export type OpcionTarjeta<V extends string> = { valor: V; texto: string; icono?: LucideIcon };

export function OpcionesEnTarjetas<V extends string>({
  id,
  titulo,
  nombre,
  valor,
  cambiar,
  opciones,
  error,
  className,
}: {
  id: string;
  titulo: string;
  /** El nombre del campo del formulario. */
  nombre: string;
  valor: V | "";
  cambiar: (valor: V) => void;
  opciones: readonly OpcionTarjeta<V>[];
  error?: string;
  /** Las columnas de la grilla, por ejemplo "grid-cols-3 sm:grid-cols-5". */
  className?: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p id={`${id}-titulo`} className="text-sm font-medium">
        {titulo}
      </p>
      <input type="hidden" name={nombre} value={valor} />
      <RadioGroup
        value={valor}
        onValueChange={(v) => cambiar(v as V)}
        aria-labelledby={`${id}-titulo`}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn("grid gap-2", className)}
      >
        {opciones.map((o, i) => {
          const Icono = o.icono;
          return (
            <Radio.Root
              key={o.valor}
              value={o.valor}
              // El foco va aquí si falta elegir (useFocoEnError)
              data-invalido={(!!error && i === 0) || undefined}
              className={cn(
                "relative flex min-h-12 cursor-pointer touch-manipulation flex-col items-center justify-center gap-1.5 rounded-lg border border-border bg-fondo px-2 py-2.5 text-center select-none transition-colors outline-none",
                "hover:bg-superficie focus-visible:ring-3 focus-visible:ring-ring/50",
                "data-checked:border-tinta data-checked:bg-neutro-fondo data-checked:ring-1 data-checked:ring-tinta",
                Icono && "min-h-20",
                error && "border-destructive",
              )}
            >
              {Icono && <Icono className="size-6" aria-hidden />}
              <span className="text-sm leading-tight font-semibold">{o.texto}</span>
              <Radio.Indicator className="absolute top-1.5 right-1.5 grid size-5 place-items-center rounded-full bg-tinta text-fondo">
                <CheckIcon className="size-3.5" strokeWidth={3} aria-hidden />
              </Radio.Indicator>
            </Radio.Root>
          );
        })}
      </RadioGroup>
      {error && <MensajeError id={`${id}-error`}>{error}</MensajeError>}
    </div>
  );
}
