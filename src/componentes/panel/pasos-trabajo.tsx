import { PASOS_TRABAJO, PRIMER_PASO_SIN_COTIZACION } from "@/modulos/agenda/pasos";
import { PasosFlujo } from "./pasos-flujo";

// En qué paso está un trabajo, de la cotización a la entrega (pedido 31, etapas/P31-flujo-de-un-trabajo.md §7). Va
// arriba de la cotización, de la reserva y de la orden, con las barras de PasosFlujo. Una reserva sin cotización empieza
// en "Reservada".

export function PasosTrabajo({ paso, conCotizacion = true }: { paso: number; conCotizacion?: boolean }) {
  const desde = conCotizacion ? 0 : PRIMER_PASO_SIN_COTIZACION;
  return <PasosFlujo pasos={PASOS_TRABAJO.slice(desde)} actual={paso - desde} etiqueta="Pasos del trabajo" />;
}
