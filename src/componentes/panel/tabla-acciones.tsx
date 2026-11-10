import Link from "next/link";
import { cn } from "cn";
import { ENCABEZADO_TABLA, FILA_TABLA, FlechaFila } from "./tabla-lista";

// Una lista de acciones como tabla en la computadora (pulido final, 10/11; inventario-pantallas.md, cambio 1): Saldos y
// Mantenimientos eran las únicas listas del panel que no se leían como tabla. Es como TablaLista, pero una fila puede
// llevar botones (escribir por WhatsApp, cobrar, reservar), que en TablaLista no caben porque toda la fila es un enlace.
// Aquí el enlace va en la primera celda y se estira sobre la fila (`after:inset-0`); la columna de acciones queda por
// encima y se toca aparte. Sin `href`, la fila no abre nada.
//
// Solo desde @4xl (el área de trabajo desde 896 px, una laptop de 1280 con el menú: entran los botones al lado de las
// columnas). Más angosto, la página muestra sus tarjetas (con `@4xl:hidden`): son dos dibujos de lo mismo, uno escondido, así que el lector de pantalla y
// las pruebas encuentran cada dato una vez. Necesita el contenedor @container del panel.

export type ColumnaAcciones = {
  titulo: string;
  /** El ancho en la grilla: "minmax(0,1.4fr)", "auto"… Por defecto, una parte igual. */
  ancho?: string;
  alinear?: "derecha";
};

export type FilaAcciones = {
  clave: string | number;
  /** A dónde lleva la fila (su orden, su reserva); sin él, no es un enlace. */
  href?: string;
  /** El nombre corto del enlace: "Ver la orden: Valeria Gutiérrez, 120 Bs". */
  etiqueta?: string;
  celdas: React.ReactNode[];
  acciones?: React.ReactNode;
};

export function TablaAcciones(props: {
  etiqueta: string;
  columnas: ColumnaAcciones[];
  filas: FilaAcciones[];
  /** El ancho de la columna de acciones ("23rem"): fijo, así los títulos quedan sobre sus datos (cada fila es su grilla). */
  anchoAcciones?: string;
}) {
  const { etiqueta, columnas, filas, anchoAcciones } = props;
  // Las acciones, si hay, son la última columna; la "›", en el lugar de siempre, a la derecha
  const plantilla = { "--columnas": [...columnas.map((c) => c.ancho ?? "minmax(0,1fr)"), ...(anchoAcciones ? [anchoAcciones] : [])].join(" ") } as React.CSSProperties;
  return (
    <div className="hidden tt-tarjeta-panel overflow-hidden @4xl:block" style={plantilla}>
      <div aria-hidden className={cn("grid grid-cols-[var(--columnas)]", ENCABEZADO_TABLA)}>
        {columnas.map((c) => (
          <span key={c.titulo} className={cn(c.alinear === "derecha" && "text-right")}>
            {c.titulo}
          </span>
        ))}
        {/* La columna de los botones, con su título como las demás (sin él, no se sabía qué era) */}
        {anchoAcciones && <span className="text-right">Acciones</span>}
      </div>
      <ul aria-label={etiqueta} className="flex flex-col divide-y divide-border">
        {filas.map((f) => (
          <li key={f.clave} className={cn("relative grid grid-cols-[var(--columnas)] has-[a[data-fila]:hover]:bg-superficie/60", FILA_TABLA)}>
            {f.celdas.map((celda, i) => (
              <div key={i} className={cn("min-w-0", columnas[i].alinear === "derecha" && "text-right")}>
                {i === 0 && f.href ? (
                  // El enlace de la fila: se estira sobre toda la fila, debajo de las acciones
                  <Link
                    href={f.href}
                    data-fila
                    aria-label={f.etiqueta}
                    className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-[var(--foco)]"
                  >
                    {celda}
                  </Link>
                ) : (
                  celda
                )}
              </div>
            ))}
            {anchoAcciones && <div className="relative z-10 flex items-center justify-end gap-2">{f.acciones}</div>}
            {f.href && <FlechaFila />}
          </li>
        ))}
      </ul>
    </div>
  );
}
