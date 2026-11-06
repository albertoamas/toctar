import { cn } from "cn";

// En qué paso está un flujo del panel: los pasos del trabajo (pedido 31) y la nueva cotización (pedido 40). Barras: los
// hechos en tinta, el actual en azul (el rojo es del botón principal) y los que faltan en el borde. En el celular,
// "Paso 2 de 3: Vehículo" sobre las barras; desde @xl, el nombre de cada paso debajo de su barra.

export function PasosFlujo({ pasos, actual, etiqueta }: { pasos: readonly string[]; actual: number; etiqueta: string }) {
  return (
    <nav aria-label={etiqueta} className="flex flex-col gap-2">
      <p className="text-sm text-tinta-suave @xl:hidden" aria-hidden>
        Paso {actual + 1} de {pasos.length}: <span className="font-semibold text-tinta">{pasos[actual]}</span>
      </p>
      <ol className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${pasos.length}, minmax(0, 1fr))` }}>
        {pasos.map((nombre, i) => (
          <li key={nombre} aria-current={i === actual ? "step" : undefined} className="flex min-w-0 flex-col gap-1.5">
            <span aria-hidden className={cn("h-1.5 rounded-full", i < actual ? "bg-tinta" : i === actual ? "bg-info" : "bg-border")} />
            <span className={cn("truncate text-xs @max-xl:sr-only", i === actual ? "font-semibold text-tinta" : i < actual ? "text-tinta-media" : "text-tinta-suave")}>
              {nombre}
              {i < actual && <span className="sr-only">, hecho</span>}
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
