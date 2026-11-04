import { cn } from "cn";
import { PASOS_TRABAJO, PRIMER_PASO_SIN_COTIZACION } from "@/modulos/agenda/pasos";

// En qué paso está un trabajo, de la cotización a la entrega (pedido 31, etapas/P31-flujo-de-un-trabajo.md §7). Va
// arriba de la cotización, de la reserva y de la orden: los hechos en tinta, el actual en rojo (el único rojo además
// del botón principal) y los que faltan en el borde. En el celular, "Paso 3 de 6: Reservada" sobre las barras; desde
// @xl, el nombre de cada paso debajo de su barra. Una reserva sin cotización empieza en "Reservada".

export function PasosTrabajo({ paso, conCotizacion = true }: { paso: number; conCotizacion?: boolean }) {
  const desde = conCotizacion ? 0 : PRIMER_PASO_SIN_COTIZACION;
  const pasos = PASOS_TRABAJO.slice(desde);
  const actual = paso - desde;
  return (
    <nav aria-label="Pasos del trabajo" className="flex max-w-3xl flex-col gap-2">
      <p className="text-sm text-tinta-suave @xl:hidden" aria-hidden>
        Paso {actual + 1} de {pasos.length}: <span className="font-semibold text-tinta">{pasos[actual]}</span>
      </p>
      <ol className={cn("grid gap-1.5", conCotizacion ? "grid-cols-6" : "grid-cols-4")}>
        {pasos.map((nombre, i) => (
          <li key={nombre} aria-current={i === actual ? "step" : undefined} className="flex min-w-0 flex-col gap-1.5">
            <span aria-hidden className={cn("h-1.5 rounded-full", i < actual ? "bg-tinta" : i === actual ? "bg-rojo" : "bg-border")} />
            <span
              className={cn(
                "truncate text-xs @max-xl:sr-only",
                i === actual ? "font-semibold text-tinta" : i < actual ? "text-tinta-media" : "text-tinta-suave",
              )}
            >
              {nombre}
              {i < actual && <span className="sr-only">, hecho</span>}
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
