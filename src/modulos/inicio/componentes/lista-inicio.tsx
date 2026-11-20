import Link from "next/link";
import type { Route } from "next";
import { ChevronRightIcon, CircleAlertIcon, ClockIcon } from "lucide-react";
import { cn } from "cn";

// Las listas del inicio (recorrido visual del 19/11, a pedido del dueño; prototipo 3 aprobado): "Urgente", "Hoy" y
// "Pendientes", livianas: sin íconos ni cajas de color en las filas. Lo que pide atención va en texto con su ícono, en el
// color de su estado (rojo lo atrasado, ámbar lo que falta avisar), sin píldora. Toda la fila (menos su botón) lleva a
// la pantalla de lo que muestra; el botón, solo donde se hace algo (recibir, avisar, entregar, responder). Sin botón,
// una flecha (Pendientes: cada fila abre su lista).
// Angosta la fila (el celular), el botón baja debajo del texto en lugar de apretarlo.

export type FilaInicio = {
  clave: string;
  href: Route;
  /** Una placa (con el cliente al lado) o el título de lo pendiente. */
  titulo: string;
  /** El cliente, junto a la placa. */
  cliente?: string;
  detalle: string;
  /** Lo que pide atención: el atraso en rojo, "Sin avisar" en ámbar. */
  alerta?: { texto: string; tono: "peligro" | "aviso" };
  /** El botón de la fila (un botón o un enlace con estilo de botón). Sin él, una flecha. */
  accion?: React.ReactNode;
};

export function ListaInicio({
  id,
  titulo,
  filas,
  vacio,
  urgente,
  conCuenta = true,
  className,
}: {
  id: string;
  titulo: string;
  filas: FilaInicio[];
  /** Lo que dice la lista vacía. */
  vacio: string;
  /** Lo atrasado: su título en rojo. */
  urgente?: boolean;
  /** La cantidad junto al título (Pendientes no la lleva: cada fila ya resume varios). */
  conCuenta?: boolean;
  className?: string;
}) {
  return (
    <section aria-labelledby={`${id}-titulo`} className={cn("tt-tarjeta-panel min-w-0 overflow-hidden", className)}>
      <div className="flex items-baseline gap-2 px-4 pt-4 pb-1.5 sm:px-5">
        <h2 id={`${id}-titulo`} className={cn("tt-titulo-seccion", urgente && "text-peligro")}>
          {titulo}
        </h2>
        {conCuenta && filas.length > 0 && <span className="text-sm text-tinta-suave tabular-nums">{filas.length}</span>}
      </div>
      {filas.length === 0 ? (
        <p className="px-4 pt-1 pb-5 text-tinta-suave sm:px-5">{vacio}</p>
      ) : (
        <ul className="flex flex-col pb-1.5" aria-label={titulo}>
          {filas.map((f) => (
            <li key={f.clave} className="flex items-center gap-x-3.5 gap-y-2 border-t border-border px-4 py-3 first:border-t-0 sm:px-5 [&:has(>div)]:flex-wrap">
              <Link href={f.href} className="flex min-w-[min(100%,11rem)] flex-1 items-center gap-3 rounded-md focus-visible:outline-offset-4">
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex flex-wrap items-baseline gap-x-2.5">
                    <span className={f.cliente ? "tt-placa" : "font-semibold"}>{f.titulo}</span>
                    {f.cliente && <span className="min-w-0 text-tinta-suave">{f.cliente}</span>}
                  </span>
                  {f.alerta && (
                    <span className={cn("flex items-start gap-1.5 text-sm font-semibold", f.alerta.tono === "peligro" ? "text-peligro" : "text-aviso")}>
                      {f.alerta.tono === "peligro" ? <CircleAlertIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden /> : <ClockIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />}
                      {f.alerta.texto}
                    </span>
                  )}
                  <span className="text-sm text-tinta-suave">{f.detalle}</span>
                </span>
                {!f.accion && <ChevronRightIcon className="size-5 shrink-0 text-tinta-suave" aria-hidden />}
              </Link>
              {f.accion && <div className="ml-auto shrink-0">{f.accion}</div>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
