import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { cn } from "cn";

// Una lista que en la computadora se lee como tabla (pedido 26): una tarjeta con una fila por elemento y cada fila abre
// su pantalla, igual que ListaFilas. Es una sola estructura: con espacio (el área de trabajo desde 672 px) las celdas se
// alinean en columnas bajo sus títulos; en el celular, la misma fila se acomoda en renglones (lo que identifica arriba a
// la izquierda, el estado a la derecha y el resto debajo, en tinta suave). Sin contenido repetido para el celular: el
// lector de pantalla y las pruebas encuentran cada dato una vez. El nombre del enlace empieza por la primera celda
// (la placa, el cliente o el número): así se nombra en voz alta.
//
// Necesita un contenedor @container (el <main> del panel).

export type ColumnaTabla = {
  titulo: string;
  /** El ancho de la columna en la grilla: "minmax(0,1.4fr)", "7rem"… Por defecto, una parte igual. */
  ancho?: string;
  alinear?: "derecha";
  /** Dónde va en el celular: arriba a la izquierda, arriba a la derecha, debajo o no se muestra. */
  movil: "titulo" | "estado" | "detalle" | "oculta";
};

export type FilaTabla = { href: string; celdas: React.ReactNode[] };

const CELDA_MOVIL: Record<ColumnaTabla["movil"], string> = {
  titulo: "col-start-1 row-start-1",
  estado: "col-start-2 row-start-1 justify-self-end",
  detalle: "col-span-2 text-tinta-suave",
  oculta: "hidden",
};
// Con espacio, todas en su columna, en una sola línea de la grilla
const CELDA_TABLA = "@2xl:col-auto @2xl:col-span-1 @2xl:row-auto @2xl:block @2xl:justify-self-auto @2xl:text-tinta";

export function TablaLista({ etiqueta, columnas, filas }: { etiqueta: string; columnas: ColumnaTabla[]; filas: FilaTabla[] }) {
  const plantilla = { "--columnas": columnas.map((c) => c.ancho ?? "minmax(0,1fr)").join(" ") } as React.CSSProperties;
  return (
    <div className="tt-tarjeta-panel overflow-hidden" style={plantilla}>
      {/* Los títulos de las columnas, solo a la vista: cada fila es un enlace que ya dice todo */}
      <div aria-hidden className="hidden gap-4 border-b border-border bg-superficie/50 py-2.5 pr-11 pl-4 text-xs font-semibold text-tinta-suave @2xl:grid @2xl:grid-cols-[var(--columnas)]">
        {columnas.map((c) => (
          <span key={c.titulo} className={cn(c.alinear === "derecha" && "text-right")}>
            {c.titulo}
          </span>
        ))}
      </div>
      <ul aria-label={etiqueta} className="flex flex-col divide-y divide-border">
        {filas.map((f) => (
          <li key={f.href} className="relative">
            <Link
              href={f.href}
              className="grid min-h-11 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 py-3 pr-11 pl-4 text-sm hover:bg-superficie/60 focus-visible:-outline-offset-2 @2xl:grid-cols-[var(--columnas)]"
            >
              {f.celdas.map((celda, i) => (
                <span key={i} className={cn("min-w-0", CELDA_MOVIL[columnas[i].movil], CELDA_TABLA, columnas[i].alinear === "derecha" && "@2xl:text-right")}>
                  {celda}
                </span>
              ))}
            </Link>
            <ChevronRightIcon className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-tinta-suave" aria-hidden />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Una celda de dos renglones: lo principal y, debajo, un dato en tinta suave ("6789TRS" y "Toyota Hilux"). */
export function CeldaDoble({ principal, secundario, marcada = false }: { principal: React.ReactNode; secundario?: React.ReactNode; marcada?: boolean }) {
  return (
    <span className="flex flex-col">
      <span className={marcada ? "tt-placa text-[0.95rem]" : "font-medium"}>{principal}</span>
      {secundario && <span className="text-xs text-tinta-suave">{secundario}</span>}
    </span>
  );
}
