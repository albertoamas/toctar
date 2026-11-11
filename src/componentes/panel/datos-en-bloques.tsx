import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";

// La tarjeta "Datos" de una ficha de trabajo, en bloques separados por una línea (pulido 13.49, en la orden; 13.50, en la
// cotización): cada bloque con sus filas de etiqueta y valor, y lo que lleva a otra pantalla (la ficha del cliente, la
// reserva) como una fila que se toca con "›", no como un enlace subrayado suelto. La etiqueta tiene ancho fijo: así los
// valores quedan en columna de un bloque a otro. Sin estado: se dibuja en el servidor.

/** Una fila de Datos: la etiqueta de ancho fijo, así los valores quedan en columna entre bloques. */
export function FilaDato(props: {
  etiqueta: string;
  /** "span" fuera de una lista de datos (un enlace no puede llevar un dl). */
  como?: "div" | "span";
  /** Dentro de un enlace que ya dice qué es ("Ver ficha del cliente:"): la etiqueta no se lee dos veces. */
  enEnlace?: boolean;
  children: React.ReactNode;
}) {
  const { etiqueta, como = "div", enEnlace, children } = props;
  if (como === "span") {
    return (
      <span className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-3">
        <span aria-hidden={enEnlace || undefined} className="text-tinta-suave">{etiqueta}</span>
        <span className="flex min-w-0 flex-col break-words">{children}</span>
      </span>
    );
  }
  return (
    <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-3">
      <dt className="text-tinta-suave">{etiqueta}</dt>
      <dd className="flex min-w-0 flex-col break-words">{children}</dd>
    </div>
  );
}

/** Una fila de la tarjeta que lleva a otra pantalla, con "›"; sin `href` (quien mira no tiene ese módulo), solo la fila. */
export function FilaEnlace({ href, oculto, children }: { href: string | null; /** Lo que oye el lector antes del contenido. */ oculto?: string; children: React.ReactNode }) {
  if (!href) return <div className="px-4 py-3">{children}</div>;
  return (
    <Link href={href} className="flex min-h-11 items-center justify-between gap-3 px-4 py-3 hover:bg-fondo-panel focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring">
      <span className="min-w-0 flex-1">
        {oculto && <span className="sr-only">{oculto}</span>}
        {children}
      </span>
      <ChevronRightIcon aria-hidden className="size-4 shrink-0 text-tinta-suave" />
    </Link>
  );
}
