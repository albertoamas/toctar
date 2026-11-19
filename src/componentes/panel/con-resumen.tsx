// Un formulario en pasos con su resumen al costado (C7 §5.2, 18/11): Nueva cotización, Nueva versión y Nueva reserva.
// Según el ancho del área de trabajo, el paso a la izquierda en dos tercios y, a la derecha, lo elegido y el total, fijos
// mientras se baja: así los precios y el total que forman están a la vista a la vez, y los campos no se estiran. Más
// angosto (el celular, una tableta), el resumen no se muestra: arriba queda lo elegido y abajo el total, en el pie fijo,
// como hasta ahora.

export function ConResumen({ etiqueta, resumen, children }: { /** Cómo lo nombra el lector de pantalla: "Resumen de la cotización". */ etiqueta: string; resumen: React.ReactNode; children: React.ReactNode }) {
  // Sin nada que resumir (una reserva desde una cotización para quien no ve montos), el paso a todo el ancho, como antes
  if (!resumen) return <div className="flex flex-col gap-6">{children}</div>;
  return (
    <div className="grid items-start gap-6 @4xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-6">{children}</div>
      <aside aria-label={etiqueta} className="hidden min-w-0 flex-col gap-6 @4xl:sticky @4xl:top-4 @4xl:flex">
        {resumen}
      </aside>
    </div>
  );
}

/**
 * Una fila del resumen: la etiqueta a la izquierda y el monto a la derecha, en columna. `fuerte`: el total; con filas
 * antes (`separada`), una línea lo separa de ellas.
 */
export function FilaResumen({ etiqueta, valor, fuerte, suave, separada }: { etiqueta: React.ReactNode; valor: React.ReactNode; fuerte?: boolean; suave?: boolean; separada?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 ${fuerte ? "text-lg font-bold" : suave ? "text-tinta-suave" : ""} ${separada ? "border-t border-border pt-2" : ""}`}>
      <dt>{etiqueta}</dt>
      <dd className="tabular-nums">{valor}</dd>
    </div>
  );
}

/**
 * Un paso del taller con lo que se entrega o se recibe al costado (C7 §5.3, 18/11): Entregar y Recibir. A diferencia de
 * `ConResumen`, el costado se ve siempre: en lo angosto va primero (es lo que se entrega, arriba del paso) y desde `@4xl`
 * a la derecha, en un tercio. No queda fijo al bajar: puede ser más alto que la pantalla (los servicios y los pagos).
 */
export function PasoConCostado({ etiqueta, costado, children }: { /** "Lo que se entrega". */ etiqueta: string; costado: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid items-start gap-6 @4xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <aside aria-label={etiqueta} className="flex min-w-0 flex-col gap-6 @4xl:col-start-2 @4xl:row-start-1">
        {costado}
      </aside>
      <div className="flex min-w-0 flex-col gap-6 @4xl:col-start-1 @4xl:row-start-1">{children}</div>
    </div>
  );
}
