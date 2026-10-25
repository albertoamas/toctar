import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";

// Un bloque de la pantalla del día (HU-39): título con su cantidad y filas de un toque, cada una a su pantalla. La placa
// va al frente, grande: es como el taller nombra a cada vehículo. Vacío, una sola línea.

export type FilaDelDia = {
  href: string;
  /** La placa o, si la fila no es de un vehículo, lo que se cuenta ("3 pendientes"). */
  titulo: string;
  /** Quién y dónde: "Juan Pérez, Box 1, a las 9". */
  detalle?: string;
  /** Lo que pide atención ("Debía ingresar el 21/10"), resaltado. */
  aviso?: string | null;
  /** El estado escrito ("En proceso"), si no hay aviso. */
  estado?: string;
};

export function BloqueDelDia({ id, titulo, filas, vacio, cantidad = filas.length }: { id: string; titulo: string; filas: FilaDelDia[]; vacio: string; cantidad?: number }) {
  return (
    <section aria-labelledby={`${id}-titulo`} className="flex min-w-0 flex-col gap-3">
      <h2 id={`${id}-titulo`} className="flex items-baseline gap-3 font-heading text-2xl font-bold italic">
        {titulo}
        {cantidad > 0 && <span className="font-sans text-sm font-normal not-italic tabular-nums text-tinta-suave">{cantidad}</span>}
      </h2>
      {filas.length === 0 ? (
        <p className="text-tinta-suave">{vacio}</p>
      ) : (
        <ul aria-label={titulo} className="flex flex-col divide-y divide-border rounded-sm border border-border">
          {filas.map((f) => (
            <li key={f.href}>
              <Link href={f.href} className="flex min-h-11 items-center gap-3 p-3 hover:bg-superficie">
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="font-heading text-xl font-extrabold italic tabular-nums">{f.titulo}</span>
                    {f.aviso ? <span className="tt-insignia tt-insignia--aviso">{f.aviso}</span> : f.estado && <span className="tt-insignia">{f.estado}</span>}
                  </span>
                  {f.detalle && <span className="text-sm text-tinta-suave">{f.detalle}</span>}
                </span>
                <ChevronRightIcon className="size-5 shrink-0 text-tinta-suave" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
