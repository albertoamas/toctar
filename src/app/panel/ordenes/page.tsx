import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Cargando } from "@/componentes/panel/cargando";
import { formatearFecha } from "@/lib/fechas";
import { exigirModulo } from "@/lib/sesion";
import { NOMBRE_ESTADO_TRABAJO } from "@/modulos/agenda/reglas";
import { ordenesAbiertas } from "@/modulos/ordenes/consultas";

export const metadata: Metadata = { title: "Órdenes" };

// HU-33: las órdenes abiertas (recibidas, en proceso y listas). El técnico ve solo las suyas (RN-12, S-1); el dueño y el
// encargado con "Órdenes", todas. La HU-34 le suma las pestañas por estado y el diseño para el celular del técnico.
export default function PaginaOrdenes() {
  return (
    <section className="flex flex-col gap-6">
      <Suspense fallback={<Cargando />}>
        <Lista />
      </Suspense>
    </section>
  );
}

async function Lista() {
  const usuario = await exigirModulo("ordenes");
  const tecnico = usuario.rol === "tecnico";
  const ordenes = await ordenesAbiertas(tecnico ? Number(usuario.id) : undefined);

  return (
    <>
      <h1 className="font-heading text-4xl font-extrabold italic">{tecnico ? "Mis órdenes" : "Órdenes"}</h1>
      {ordenes.length === 0 ? (
        <p className="text-tinta-suave">{tecnico ? "No tienes órdenes asignadas." : "No hay órdenes abiertas. Se abren al recibir un vehículo desde la agenda."}</p>
      ) : (
        <ul aria-label="Órdenes abiertas" className="grid max-w-5xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ordenes.map((o) => (
            <li key={o.id}>
              <Link href={`/panel/ordenes/${o.id}`} className="flex h-full flex-col gap-2 rounded-sm border border-border p-4 hover:bg-superficie focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foco)]">
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-heading text-2xl font-extrabold italic">{o.placa}</span>
                  <span className="tt-insignia">{NOMBRE_ESTADO_TRABAJO[o.estado]}</span>
                </span>
                <span className="text-sm">{o.servicios.join(", ")}</span>
                <span className="text-sm text-tinta-suave">
                  {o.cliente}
                  {!tecnico && `, ${o.tecnico ?? "sin técnico"}`}
                </span>
                <span className="text-sm">Entrega aproximada: {formatearFecha(o.fechaFin)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
