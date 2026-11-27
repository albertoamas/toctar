import Link from "next/link";
import type { Route } from "next";
import { cn } from "cn";

// En qué paso está un flujo del panel: los pasos del trabajo (pedido 31), la nueva cotización (pedido 40) y la nueva
// reserva (pedido 41). Barras: los hechos en gris oscuro, el actual en tinta (negro) y los que faltan en el borde. Sin
// azul (20/11): es el color de estado de "En proceso"; el rojo es del botón principal. En el celular, "Paso 2 de 3:
// Vehículo" sobre las barras; desde @xl, el nombre de cada paso debajo de su barra. A 14 px (24/11: a 12 px y en gris
// claro se veía como otra letra, más chica que el resto de la pantalla).
// Recorrido visual del 20/11: un paso hecho con `destinos` se toca para volver a él (un enlace o una función). Así la
// pantalla muestra solo el paso que se hace, sin las tarjetas de lo ya elegido con su "Cambiar". Sin un "‹ Vehículo"
// escrito arriba en el celular (20/11, a pedido del dueño): repetía el "Atrás" del pie.

/** A dónde lleva tocar un paso hecho: otra dirección (los pasos que se eligen por la dirección) o una función. */
export type DestinoPaso = { href: Route } | { alTocar: () => void };

export function PasosFlujo({ pasos, actual, etiqueta, destinos }: { pasos: readonly string[]; actual: number; etiqueta: string; destinos?: readonly (DestinoPaso | undefined)[] }) {
  return (
    <nav aria-label={etiqueta} className="flex flex-col gap-2">
      <p className="text-sm text-tinta-media @xl:hidden" aria-hidden>
        Paso {actual + 1} de {pasos.length}: <span className="font-semibold text-tinta">{pasos[actual]}</span>
      </p>
      <ol className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${pasos.length}, minmax(0, 1fr))` }}>
        {pasos.map((nombre, i) => {
          const contenido = (
            <>
              <span aria-hidden className={cn("h-1.5 rounded-full", i < actual ? "bg-tinta-suave" : i === actual ? "bg-tinta" : "bg-border")} />
              <span className={cn("truncate text-sm @max-xl:sr-only", i === actual ? "font-semibold text-tinta" : i < actual ? "font-medium text-tinta-media" : "text-tinta-suave")}>
                {nombre}
                {i < actual && <span className="sr-only">, hecho</span>}
              </span>
            </>
          );
          const destino = i < actual ? destinos?.[i] : undefined;
          // Un paso hecho que se puede tocar: más alto para el dedo (la barra sola mide 6 px) y con su nombre para el lector
          const clase = "group flex min-h-11 min-w-0 flex-col justify-center gap-1.5 rounded-md text-left focus-visible:outline-offset-2 @xl:min-h-0";
          return (
            <li key={nombre} aria-current={i === actual ? "step" : undefined} className="flex min-w-0 flex-col gap-1.5">
              {!destino ? (
                // La misma altura que los que se tocan: así las barras quedan en línea
                <span className="flex min-h-11 min-w-0 flex-col justify-center gap-1.5 @xl:min-h-0">{contenido}</span>
              ) : "href" in destino ? (
                <Link href={destino.href} className={clase} aria-label={`Ir al paso ${nombre}`}>
                  {contenido}
                </Link>
              ) : (
                <button type="button" onClick={destino.alTocar} className={clase} aria-label={`Ir al paso ${nombre}`}>
                  {contenido}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
