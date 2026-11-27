import { cn } from "cn";

// El dato que decide, arriba de un modal (C7 §5.4, 18/11): "Falta cobrar 300 Bs", "Ahora: 18/11 al 20/11", "Adelanto
// recibido 390 Bs". Una sola franja con la etiqueta a la izquierda y el valor a la derecha, así se lee antes de tocar
// nada. El tono dice qué es: neutro (un dato), aviso (falta algo) o peligro (lo que se pierde si se confirma).

const TONO = {
  neutro: "bg-superficie text-tinta",
  aviso: "bg-aviso-fondo text-aviso",
  peligro: "bg-peligro-fondo text-peligro",
} as const;

export function DatoClave({ etiqueta, valor, tono = "neutro" }: { etiqueta: React.ReactNode; valor: React.ReactNode; tono?: keyof typeof TONO }) {
  return (
    <p className={cn("flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-lg px-3 py-2.5 tabular-nums", TONO[tono])}>
      <span>{etiqueta}</span>
      <span className="font-semibold">{valor}</span>
    </p>
  );
}
