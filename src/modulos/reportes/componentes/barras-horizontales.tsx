import { cn } from "cn";

// Una lista con barras (pedido 16): el nombre, su número y una barra proporcional al mayor. Para "cuánto de cada cosa"
// (formas de pago, categorías, servicios) se lee mejor como lista que como gráfico, también en el celular. Los gráficos
// de Reportes son de shadcn/ui Charts (graficos-resumen, grafico-acumulado y grafico-clientes).

/** Barras horizontales con su nombre y su valor escritos (formas de pago, categorías, servicios, el embudo). */
export function BarrasHorizontales({ filas, alta }: { filas: { nombre: string; valor: number; texto: React.ReactNode; clase: string }[]; alta?: boolean }) {
  const maximo = Math.max(...filas.map((f) => f.valor), 0);
  return (
    <ul className="flex flex-col gap-3.5">
      {filas.map((f) => (
        <li key={f.nombre} className="flex flex-col gap-1.5">
          <span className="flex justify-between gap-3 text-sm">
            <span>{f.nombre}</span>
            <span className="tabular-nums">{f.texto}</span>
          </span>
          <span aria-hidden className={cn("block rounded-full bg-fondo-panel", alta ? "h-3" : "h-2")}>
            <span className={cn("block h-full rounded-full", f.clase)} style={{ width: `${maximo > 0 ? Math.max((f.valor / maximo) * 100, f.valor > 0 ? 2 : 0) : 0}%` }} />
          </span>
        </li>
      ))}
    </ul>
  );
}
