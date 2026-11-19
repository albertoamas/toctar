import Link from "next/link";
import type { Route } from "next";
import { ChevronRightIcon, type LucideIcon } from "lucide-react";
import { cn } from "cn";
import { Seccion } from "@/componentes/panel/cabecera-seccion";
import { Insignia } from "@/componentes/panel/insignia";

// Las listas del inicio (recorrido visual del 19/11, a pedido del dueño): "Urgente", "Hoy" y "Pendientes", con el mismo
// renglón. Toda la fila (menos su acción) lleva a la pantalla de lo que muestra; la acción, si la hay, hace la tarea ahí
// mismo o va directo a hacerla (recibir, avisar por WhatsApp, cobrar). Sin acción, una flecha. El color, solo en lo
// urgente: así lo que se atrasó no compite con lo que solo espera.
// Angosta la fila (el celular), la acción baja debajo del texto en lugar de apretarlo.

export type FilaInicio = {
  clave: string;
  href: Route;
  /** Una placa (con el cliente al lado) o el título de lo pendiente. */
  titulo: string;
  /** El cliente, junto a la placa. */
  cliente?: string;
  detalle: string;
  /** Lo que pide atención: el atraso en rojo, "Sin avisar" en ámbar. */
  insignia?: { texto: string; tono: "peligro" | "aviso" };
  icono?: LucideIcon;
  /** La acción de la fila (un botón o un enlace con estilo de botón). */
  accion?: React.ReactNode;
};

export function ListaInicio({
  id,
  titulo,
  filas,
  vacio,
  urgente,
  className,
}: {
  id: string;
  titulo: string;
  filas: FilaInicio[];
  /** Lo que dice la lista vacía. */
  vacio: string;
  /** Lo atrasado: sus íconos en rojo. */
  urgente?: boolean;
  className?: string;
}) {
  return (
    <Seccion id={id} titulo={titulo} sinRelleno className={cn("min-w-0", className)}>
      {filas.length === 0 ? (
        <p className="px-4 py-5 text-tinta-suave">{vacio}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border" aria-label={titulo}>
          {filas.map((f) => (
            <li key={f.clave} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
              <Link href={f.href} className="flex min-w-[min(100%,14rem)] flex-1 items-center gap-3 rounded-md focus-visible:outline-offset-4">
                {f.icono && (
                  <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", urgente ? "bg-peligro-fondo text-peligro" : "bg-superficie text-tinta-suave")}>
                    <f.icono className="size-4" aria-hidden />
                  </span>
                )}
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className={f.cliente ? "tt-placa" : "font-semibold"}>{f.titulo}</span>
                    {f.cliente && <span className="min-w-0 truncate text-tinta-suave">{f.cliente}</span>}
                  </span>
                  {f.insignia && (
                    <Insignia tono={f.insignia.tono} className="self-start">
                      {f.insignia.texto}
                    </Insignia>
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
    </Seccion>
  );
}
