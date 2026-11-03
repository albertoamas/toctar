// Mientras carga una pantalla del panel: siluetas grises con la forma de lo que viene.
// Aparecen recién si la carga tarda más de 0,3 s (si no, no se ve nada y no hay parpadeo).
// El lector de pantalla anuncia "Cargando…". Una sola versión para todo el panel.

export function Cargando({ filas = 3 }: { filas?: number }) {
  return (
    <div role="status" className="tt-cargando flex flex-col gap-3">
      <span className="sr-only">Cargando…</span>
      <div aria-hidden className="tt-cargando__bloque h-8 w-48" />
      {Array.from({ length: filas }, (_, i) => (
        <div key={i} aria-hidden className="tt-cargando__bloque h-16 w-full max-w-3xl" />
      ))}
    </div>
  );
}
