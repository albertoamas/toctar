// Lo que comparten los gráficos de Reportes (shadcn/ui Charts, 17/11): la animación al cargar y la fila del detalle que
// aparece al pasar el mouse o tocar. Un solo lugar, así los tres gráficos no se desvían entre sí.

/** Una sola animación corta al cargar; con "reducir movimiento" en el equipo, Recharts no anima ("auto"). */
export const ANIMACION = { isAnimationActive: "auto", animationDuration: 700, animationEasing: "ease-out" } as const;

/** "octubre de 2026" → "Octubre de 2026": el título del detalle. */
export const mayuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

/** Una fila del detalle: el color de la serie, su nombre y el valor ya escrito ("1.200 Bs", "4"). */
export function FilaDetalle({ color, nombre, valor }: { color?: string; nombre: React.ReactNode; valor: React.ReactNode }) {
  return (
    <span className="flex w-full items-center justify-between gap-4">
      <span className="flex items-center gap-1.5 font-medium">
        <span aria-hidden className="size-2.5 rounded-[3px]" style={{ background: color }} />
        {nombre}
      </span>
      <span className="font-semibold tabular-nums">{valor}</span>
    </span>
  );
}
