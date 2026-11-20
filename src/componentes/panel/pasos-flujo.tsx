import Link from "next/link";
import type { Route } from "next";
import { ChevronLeftIcon } from "lucide-react";
import { cn } from "cn";

// En qué paso está un flujo del panel: los pasos del trabajo (pedido 31), la nueva cotización (pedido 40) y la nueva
// reserva (pedido 41). Barras: los hechos en gris oscuro, el actual en tinta (negro) y los que faltan en el borde. Sin
// azul (20/11): es el color de estado de "En proceso"; el rojo es del botón principal. En el celular, "Paso 2 de 3:
// Vehículo" sobre las barras; desde @xl, el nombre de cada paso debajo de su barra.
// Recorrido visual del 20/11: un paso hecho con `destinos` se toca para volver a él (un enlace o una función). Así la
// pantalla muestra solo el paso que se hace, sin las tarjetas de lo ya elegido con su "Cambiar".

/** A dónde lleva tocar un paso hecho: otra dirección (los pasos que se eligen por la dirección) o una función. */
export type DestinoPaso = { href: Route } | { alTocar: () => void };

export function PasosFlujo({ pasos, actual, etiqueta, destinos }: { pasos: readonly string[]; actual: number; etiqueta: string; destinos?: readonly (DestinoPaso | undefined)[] }) {
  const anterior = actual > 0 ? destinos?.[actual - 1] : undefined;
  return (
    <nav aria-label={etiqueta} className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3 @xl:hidden">
        <p className="text-sm text-tinta-suave" aria-hidden>
          Paso {actual + 1} de {pasos.length}: <span className="font-semibold text-tinta">{pasos[actual]}</span>
        </p>
        {/* En el celular las barras van sin nombre: el paso anterior, escrito, para que se vea que se puede volver */}
        {anterior && <Anterior destino={anterior} nombre={pasos[actual - 1]} />}
      </div>
      <ol className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${pasos.length}, minmax(0, 1fr))` }}>
        {pasos.map((nombre, i) => {
          const contenido = (
            <>
              <span aria-hidden className={cn("h-1.5 rounded-full", i < actual ? "bg-tinta-suave" : i === actual ? "bg-tinta" : "bg-border")} />
              <span className={cn("truncate text-xs @max-xl:sr-only", i === actual ? "font-semibold text-tinta" : i < actual ? "text-tinta-media" : "text-tinta-suave")}>
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

/** "‹ Vehículo": el paso anterior en el celular. */
function Anterior({ destino, nombre }: { destino: DestinoPaso; nombre: string }) {
  const clase = "inline-flex min-h-11 shrink-0 items-center gap-0.5 text-sm font-semibold text-tinta underline-offset-4 hover:underline";
  const contenido = (
    <>
      <ChevronLeftIcon className="size-4" aria-hidden />
      {nombre}
    </>
  );
  return "href" in destino ? (
    <Link href={destino.href} className={clase} aria-label={`Volver al paso ${nombre}`}>
      {contenido}
    </Link>
  ) : (
    <button type="button" onClick={destino.alTocar} className={clase} aria-label={`Volver al paso ${nombre}`}>
      {contenido}
    </button>
  );
}

