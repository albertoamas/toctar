import { ListaFilas, type DatosFila } from "@/componentes/panel/fila-lista";

// Un bloque de la pantalla del día (HU-39): título con su cantidad y filas de un toque (FilaLista), cada una a su
// pantalla. El título de la fila va grande: la placa, que es como el taller nombra a cada vehículo, o la cuenta. Vacío,
// una sola línea.

/** `contar`: la cantidad de filas junto al título. No va cuando la fila misma es la cuenta ("3 pendientes"). */
export function BloqueDelDia({ id, titulo, filas, vacio, contar = true }: { id: string; titulo: string; filas: DatosFila[]; vacio: string; contar?: boolean }) {
  return (
    <section aria-labelledby={`${id}-titulo`} className="flex min-w-0 flex-col gap-3">
      <h2 id={`${id}-titulo`} className="flex items-baseline gap-3 font-heading text-2xl font-bold italic">
        {titulo}
        {contar && filas.length > 0 && <span className="font-sans text-sm font-normal not-italic tabular-nums text-tinta-suave">{filas.length}</span>}
      </h2>
      {filas.length === 0 ? (
        <p className="text-tinta-suave">{vacio}</p>
      ) : (
        <ListaFilas etiqueta={titulo} filas={filas.map((f) => ({ tituloGrande: true, ...f }))} />
      )}
    </section>
  );
}
