// Para quién es lo que se arma en un flujo de pasos, en una línea bajo el indicador (recorrido visual del 20/11): "Para
// Carla Rodríguez · 1234ABC, Compactos", en Nueva reserva y Nueva cotización. Antes, una tarjeta con "Cambiar" en cada
// paso; ahora se vuelve a un paso tocándolo en el indicador, y la pantalla muestra solo el paso que se hace.

export function ParaQuien({ etiqueta, nombre, placa, tamano, extra }: { /** Cómo lo nombra el lector de pantalla: "Reserva para". */ etiqueta: string; nombre: string; placa?: string | null; tamano?: string | null; extra?: React.ReactNode }) {
  return (
    <section aria-label={etiqueta} className="flex flex-col gap-1.5 text-sm text-tinta-suave">
      <p className="break-words">
        Para <span className="font-semibold text-tinta">{nombre}</span>
        {placa && (
          <>
            {" · "}
            <span className="tt-placa text-tinta">{placa}</span>
            {tamano && `, ${tamano}`}
          </>
        )}
      </p>
      {extra}
    </section>
  );
}
