import { CheckIcon } from "lucide-react";
import { cn } from "cn";
import { PASOS_TRABAJO, PRIMER_PASO_SIN_COTIZACION } from "@/modulos/agenda/pasos";

// En qué paso está un trabajo, de la cotización a la entrega (pedido 31, etapas/P31-flujo-de-un-trabajo.md §7). Va
// arriba de la cotización, de la reserva y de la orden, con los círculos del panel: hecho en verde con ✓, el actual en
// azul, los que faltan en gris (el rojo es del botón principal). En el celular, los círculos y el nombre del paso actual;
// con más ancho, el nombre debajo de cada uno. El número sale de un contador CSS, así el texto de cada paso es solo su
// nombre. Una reserva sin cotización empieza en "Reservada".

export function PasosTrabajo({ paso, conCotizacion = true }: { paso: number; conCotizacion?: boolean }) {
  const desde = conCotizacion ? 0 : PRIMER_PASO_SIN_COTIZACION;
  const pasos = PASOS_TRABAJO.slice(desde);
  const actual = paso - desde;
  return (
    <nav aria-label="Pasos del trabajo" className="tt-tarjeta-panel flex flex-col gap-2 p-3 sm:px-4">
      <ol className={cn("grid gap-1 [counter-reset:paso]", conCotizacion ? "grid-cols-6" : "grid-cols-4")}>
        {pasos.map((nombre, i) => (
          <li
            key={nombre}
            aria-current={i === actual ? "step" : undefined}
            className={cn(
              "flex min-w-0 flex-col items-center gap-1 text-center text-sm font-semibold [counter-increment:paso]",
              i < actual && "text-tinta",
              i === actual && "text-info",
              i > actual && "text-tinta-suave",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-full border-2 text-xs",
                i < actual && "border-exito bg-exito text-fondo",
                i === actual && "border-info bg-info-fondo before:content-[counter(paso)]",
                i > actual && "border-border bg-fondo before:content-[counter(paso)]",
              )}
            >
              {i < actual && <CheckIcon className="size-4" />}
            </span>
            <span className="@max-xl:sr-only">
              {nombre}
              {i < actual && <span className="sr-only">, hecho</span>}
            </span>
          </li>
        ))}
      </ol>
      {/* En el celular, el nombre del paso actual: los seis no entran. Quien usa lector de pantalla ya los oye en la lista */}
      <p aria-hidden className="text-center text-sm font-semibold text-info @xl:hidden">
        {pasos[actual]}
      </p>
    </nav>
  );
}
