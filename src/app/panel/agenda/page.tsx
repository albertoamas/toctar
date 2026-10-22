import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { cn } from "cn";
import { PlusIcon } from "lucide-react";
import { Cargando } from "@/componentes/panel/cargando";
import { EstadoVacio } from "@/componentes/panel/estado-vacio";
import { buttonVariants } from "@/componentes/ui/button";
import { fechaEnBolivia, formatearFecha } from "@/lib/fechas";
import { exigirModulo } from "@/lib/sesion";
import { proximasReservas } from "@/modulos/agenda/consultas";

export const metadata: Metadata = { title: "Agenda" };

// HU-30: las próximas reservas, por fecha. HU-29 la reemplaza por el tablero de la semana. Dueño o encargado con
// "Agenda"; el técnico nunca (sus órdenes llegan en C4).
export default function PaginaAgenda() {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading text-4xl font-extrabold italic">Agenda</h1>
        {/* Enlace con forma de botón: lleva a otra pantalla */}
        <Link href="/panel/agenda/nueva" className={cn(buttonVariants())}>
          <PlusIcon />
          Nueva reserva
        </Link>
      </div>
      <Suspense fallback={<Cargando />}>
        <Lista />
      </Suspense>
    </section>
  );
}

async function Lista() {
  await exigirModulo("agenda");
  const reservas = await proximasReservas(fechaEnBolivia());
  if (reservas.length === 0) return <EstadoVacio>No hay reservas desde hoy. Agenda una con «Nueva reserva».</EstadoVacio>;
  return (
    <ul aria-label="Próximas reservas" className="flex flex-col gap-2">
      {reservas.map((r) => (
        <li key={r.id}>
          <Link href={`/panel/agenda/${r.id}`} className="flex flex-col gap-0.5 rounded-sm border border-border p-4 hover:bg-superficie">
            <span className="flex flex-wrap gap-x-3">
              <span className="font-semibold">{r.placa}</span>
              <span>{r.cliente}</span>
            </span>
            <span className="flex flex-wrap gap-x-3 text-sm text-tinta-suave">
              <span>{r.fechaInicio === r.fechaFin ? formatearFecha(r.fechaInicio) : `${formatearFecha(r.fechaInicio)} al ${formatearFecha(r.fechaFin)}`}</span>
              <span>{r.espacio}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
