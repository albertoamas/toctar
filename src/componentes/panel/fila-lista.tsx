import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { cn } from "cn";
import { ChevronRightIcon, ImageOffIcon } from "lucide-react";
import { Insignia } from "@/componentes/panel/insignia";
import type { TonoEstado } from "@/lib/tonos";

// Listas de un toque del panel (skill pantallas-panel, §2 "Lista"): una tarjeta con una fila por elemento, y cada fila
// abre su pantalla. Lo que identifica va arriba (un nombre, o una placa o una cuenta, más marcada), lo que decide en
// negrita debajo ("Desde 700 Bs"), los datos secundarios en tinta suave, y el estado y lo que pide atención en
// insignias de color (pedido 26). La flecha dice que se toca.
// La usan el inicio (lo del día) y las listas de cada módulo, así todas se ven y se leen igual.

export type DatosFila = {
  href: string;
  titulo: string;
  /** Marcado: una placa o una cuenta ("3 pendientes"), que es como el taller las nombra. */
  tituloGrande?: boolean;
  /** Lo que decide, en negrita debajo del título: "Desde 700 Bs". */
  dato?: string | null;
  /** Datos secundarios, en una línea que se parte si no cabe: ["5 variantes", "1 día"]. */
  detalles?: string[];
  /** Lo que pide atención ("Faltan 3 precios", "Debía ingresar el 21/10"): insignia de aviso junto al título. */
  aviso?: string | null;
  /** El estado escrito ("En proceso", "Inactivo"), en una insignia antes del aviso: primero qué es, después lo que pide
   * atención ("En proceso", "Atrasada"; pedido 26). Los dos se ven (pulido 9.1). */
  estado?: string;
  /** El color del estado, si dice algo por sí mismo: "Confirmado" en verde, "Perdido" o "Cancelada" en ámbar. */
  tonoEstado?: TonoEstado;
  /** Inactiva o desactivada: atenuada. */
  atenuada?: boolean;
  /** Una foto a la izquierda (los servicios del sitio, pulido 13.21): null es "sin foto"; sin la clave, no va el lugar. */
  miniatura?: string | null;
};

export function ListaFilas({ etiqueta, filas }: { etiqueta: string; filas: DatosFila[] }) {
  return (
    <ul aria-label={etiqueta} className="tt-tarjeta-panel flex flex-col divide-y divide-border overflow-hidden">
      {filas.map((f) => (
        <li key={f.href}>
          <FilaLista {...f} />
        </li>
      ))}
    </ul>
  );
}

/** La tarjeta de una lista con filas propias, que no son un enlace (Saldos, Mantenimientos). */
export function ListaEnTarjeta({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <ul aria-label={etiqueta} className="flex flex-col divide-y divide-border tt-tarjeta-panel">
      {children}
    </ul>
  );
}

/**
 * Una fila con su acción de todos los días (escribir por WhatsApp, reservar): la excepción a "toda la fila abre su ficha"
 * (sistema-del-panel.md §3). Lo que identifica a la izquierda y las acciones a la derecha; en el celular, debajo.
 */
export function FilaConAcciones({ children }: { children: React.ReactNode }) {
  return <li className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:gap-6">{children}</li>;
}

function FilaLista({ href, titulo, tituloGrande, dato, detalles = [], aviso, estado, tonoEstado, atenuada, miniatura }: DatosFila) {
  return (
    <Link href={href} className={cn("flex min-h-11 items-center gap-3 px-4 py-3 hover:bg-superficie/60 focus-visible:-outline-offset-2", atenuada && "text-tinta-suave")}>
      {miniatura !== undefined && (
        <span className="flex aspect-[4/3] w-16 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-superficie">
          {miniatura ? (
            <Image src={miniatura} alt="" width={64} height={48} unoptimized className="size-full object-cover" />
          ) : (
            <ImageOffIcon className="size-5 text-tinta-suave" aria-hidden />
          )}
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className={tituloGrande ? "tt-placa text-base" : "font-semibold"}>{titulo}</span>
          {estado && <Insignia tono={tonoEstado}>{estado}</Insignia>}
          {aviso && <Insignia tono="aviso">{aviso}</Insignia>}
        </span>
        {dato && <span className="text-sm font-semibold tabular-nums">{dato}</span>}
        {detalles.length > 0 && (
          <span className="flex flex-wrap gap-x-3 text-sm text-tinta-suave">
            {/* Por posición: dos datos pueden decir lo mismo (un cliente y un espacio con el mismo nombre) */}
            {detalles.map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </span>
        )}
      </span>
      <ChevronRightIcon className="size-5 shrink-0 text-tinta-suave" aria-hidden />
    </Link>
  );
}

/**
 * Lo que identifica a una fila y abre su orden o reserva (pulido final, 10/11: era un "Ver la orden" suelto debajo, en
 * Saldos y en Mantenimientos): un enlace con su nombre corto (`etiqueta`, "Ver la orden: Valeria, 120 Bs"), o solo los
 * datos si quien mira no puede abrirla (sin `href`). Lo usan las filas con acciones y las de solo consulta.
 */
export function DatosDeFila({ href, etiqueta, children }: { href?: string; etiqueta?: string; children: React.ReactNode }) {
  const clase = "flex min-w-0 flex-1 flex-col gap-1";
  if (!href) return <div className={clase}>{children}</div>;
  return (
    <Link href={href as Route} aria-label={etiqueta} className={cn(clase, "min-h-11 rounded-lg hover:bg-superficie/60 focus-visible:outline-offset-4")}>
      {children}
    </Link>
  );
}
