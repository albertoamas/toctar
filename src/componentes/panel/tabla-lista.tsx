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
  /**
   * Dónde va en el celular: arriba a la izquierda, arriba a la derecha, debajo en su propio renglón, debajo de a dos por
   * renglón (datos cortos: "5 variantes" y "1 día") o no se muestra.
   */
  movil: "titulo" | "estado" | "detalle" | "par" | "oculta";
  /** Si ninguna fila tiene algo en ella, la columna no se muestra (inventario-pantallas.md, cambio 4d: "Sin fotos" o una
   * columna en blanco en cada fila no decían nada). */
  ocultarSiVacia?: boolean;
};

/**
 * Una celda vacía (null, undefined, false o "") no ocupa lugar en el celular ni se lee; en la computadora, su columna
 * queda. `atenuada`: inactiva o desactivada, en tinta suave.
 */
export type FilaTabla = { href: string; celdas: React.ReactNode[]; atenuada?: boolean };

const CELDA_MOVIL: Record<ColumnaTabla["movil"], string> = {
  titulo: "col-start-1 row-start-1",
  estado: "col-start-2 row-start-1 justify-self-end",
  detalle: "col-span-2 text-tinta-suave",
  par: "text-tinta-suave",
  oculta: "hidden",
};
/**
 * Las medidas de toda tabla del panel (pulido final, 10/11: la de acciones se había hecho con otras): los títulos de las
 * columnas y cada fila, con lugar a la derecha para la "›" (`FlechaFila`). Las usan TablaLista y TablaAcciones.
 */
export const ENCABEZADO_TABLA = "gap-4 border-b border-border bg-superficie/50 py-2.5 pr-11 pl-4 text-xs font-semibold text-tinta-suave";
export const FILA_TABLA = "min-h-11 items-center gap-x-4 gap-y-1 py-3 pr-11 pl-4 text-sm";

/** La "›" de una fila que se abre, a la derecha y centrada: en toda tabla del panel, en el mismo lugar. */
export function FlechaFila() {
  return <ChevronRightIcon className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-tinta-suave" aria-hidden />;
}

// Con espacio, todas en su columna, en una sola línea de la grilla
const CELDA_TABLA = "@2xl:col-auto @2xl:col-span-1 @2xl:row-auto @2xl:block @2xl:justify-self-auto @2xl:text-tinta";

export function TablaLista({ etiqueta, columnas: todas, filas: todasLasFilas }: { etiqueta: string; columnas: ColumnaTabla[]; filas: FilaTabla[] }) {
  // Las columnas que se quedan, con sus celdas: así una celda nunca cae bajo el título de otra
  const quedan = todas.map((c, i) => !c.ocultarSiVacia || todasLasFilas.some((f) => tieneAlgo(f.celdas[i])));
  const columnas = todas.filter((_, i) => quedan[i]);
  const filas = todasLasFilas.map((f) => ({ ...f, celdas: f.celdas.filter((_, i) => quedan[i]) }));
  const plantilla = { "--columnas": columnas.map((c) => c.ancho ?? "minmax(0,1fr)").join(" ") } as React.CSSProperties;
  return (
    <div className="tt-tarjeta-panel overflow-hidden" style={plantilla}>
      {/* Los títulos de las columnas, solo a la vista: cada fila es un enlace que ya dice todo */}
      <div aria-hidden className={cn("hidden @2xl:grid @2xl:grid-cols-[var(--columnas)]", ENCABEZADO_TABLA)}>
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
              className={cn(
                "grid grid-cols-[minmax(0,1fr)_auto] hover:bg-superficie/60 focus-visible:-outline-offset-2 @2xl:grid-cols-[var(--columnas)]",
                FILA_TABLA,
                f.atenuada && "text-tinta-suave [&_*]:text-tinta-suave",
              )}
            >
              {f.celdas.map((celda, i) => (
                <span
                  key={i}
                  className={cn("min-w-0", CELDA_MOVIL[columnas[i].movil], CELDA_TABLA, !tieneAlgo(celda) && "hidden", columnas[i].alinear === "derecha" && "@2xl:text-right")}
                >
                  {celda}
                  {/* Entre celdas con algo, una coma para el lector de pantalla: el enlace se oye "3456GHT, Toyota Hilux,
                      Jorge Quiroga…" */}
                  {tieneAlgo(celda) && i < f.celdas.findLastIndex(tieneAlgo) && <span className="sr-only">, </span>}
                </span>
              ))}
            </Link>
            <FlechaFila />
          </li>
        ))}
      </ul>
    </div>
  );
}

const tieneAlgo = (celda: React.ReactNode) => celda !== null && celda !== undefined && celda !== false && celda !== "";

/** Cómo se lee lo principal de una celda. */
const PESO_CELDA = {
  /** Una placa, con su letra. */
  placa: "tt-placa text-[0.95rem]",
  /** Lo que identifica a la fila cuando no es una placa (el cliente, el servicio, el usuario): en negrita, como en toda tabla. */
  fuerte: "font-semibold",
  /** Un dato que acompaña (el cliente al lado de la placa). */
  medio: "font-medium",
  /** Un dato más (una fecha, un servicio). */
  normal: undefined,
} as const;

/** Una celda de dos renglones: lo principal y, debajo, un dato en tinta suave ("6789TRS" y "Toyota Hilux"). */
export function CeldaDoble({ principal, secundario, peso = "medio" }: { principal: React.ReactNode; secundario?: React.ReactNode; peso?: keyof typeof PESO_CELDA }) {
  return (
    <span className="flex flex-col">
      <span className={PESO_CELDA[peso]}>{principal}</span>
      {secundario && (
        <span className="text-xs text-tinta-suave">
          <span className="sr-only">, </span>
          {secundario}
        </span>
      )}
    </span>
  );
}
