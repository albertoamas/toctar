import { cn } from "cn";
import type { TonoEstado } from "@/lib/tonos";

// Los pasos de un trabajo en una tarjeta de lista (recorrido visual del 20/11, en Órdenes; Cotizaciones la usó del 22 al 23/11): una
// barra por paso, los hechos y el actual en el color del estado, los que faltan en gris, y el nombre debajo. Se lee de un
// vistazo en qué paso va. La marca de la tarjeta ya dice el estado en palabras: para el lector de pantalla no se repite.
// Los pasos de un formulario (PasosFlujo) son otra cosa: se tocan para volver y van en negro.

const BARRA: Record<TonoEstado, string> = { exito: "bg-exito", aviso: "bg-aviso", peligro: "bg-peligro", info: "bg-info", violeta: "bg-violeta" };

export function BarraPasos({ pasos, actual, tono }: { pasos: readonly string[]; /** El índice del paso en que va. */ actual: number; tono?: TonoEstado }) {
  const barra = tono ? BARRA[tono] : "bg-tinta";
  return (
    <ol aria-hidden className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${pasos.length}, minmax(0, 1fr))` }}>
      {pasos.map((texto, i) => (
        <li key={texto} className="flex min-w-0 flex-col gap-1">
          <span className={cn("h-1.5 rounded-full", i <= actual ? barra : "bg-border")} />
          <span className={cn("truncate text-xs", i === actual ? "font-semibold text-tinta" : "text-tinta-suave")}>{texto}</span>
        </li>
      ))}
    </ol>
  );
}
