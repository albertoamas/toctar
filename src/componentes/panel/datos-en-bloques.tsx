import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { formatearWhatsApp } from "@/lib/whatsapp";

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
function FilaEnlace({ href, oculto, children }: { href: string | null; /** Lo que oye el lector antes del contenido. */ oculto?: string; children: React.ReactNode }) {
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

/**
 * El cliente de una ficha de trabajo: su nombre y su WhatsApp, como una fila que lleva a su ficha. `href` null: quien mira
 * no tiene Clientes, y la fila se ve pero no lleva a ningún lado.
 */
export function FilaCliente({ href, nombre, telefono }: { href: string | null; nombre: string; telefono: string }) {
  return (
    <FilaEnlace href={href} oculto="Ver ficha del cliente: ">
      <FilaDato etiqueta="Cliente" como="span" enEnlace={href !== null}>
        <span className="font-semibold">{nombre}</span>
        <span className="text-sm text-tinta-suave">{formatearWhatsApp(telefono)}</span>
      </FilaDato>
    </FilaEnlace>
  );
}

/** La cotización de la que salió un trabajo, como una fila que lleva a ella: "Ver la cotización 2026-0004, versión 2 ›". */
export function FilaCotizacion({ href, numero, version }: { href: string; numero: string; version: number }) {
  return (
    <FilaEnlace href={href}>
      <span className="font-semibold">
        Ver la cotización {numero}
        {version > 1 && `, versión ${version}`}
      </span>
    </FilaEnlace>
  );
}
