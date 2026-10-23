import type { Metadata, Route } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Cargando } from "@/componentes/panel/cargando";
import { Pestanas } from "@/componentes/panel/pestanas";
import { fechaEnBolivia, formatearFecha } from "@/lib/fechas";
import { exigirModulo } from "@/lib/sesion";
import { NOMBRE_ESTADO_TRABAJO } from "@/modulos/agenda/reglas";
import { ordenesAbiertas, type OrdenEnLista } from "@/modulos/ordenes/consultas";
import { ESTADOS_ORDEN_ABIERTA, estaAtrasada } from "@/modulos/ordenes/reglas";

export const metadata: Metadata = { title: "Órdenes" };

// HU-33 y HU-34: las órdenes abiertas (recibidas, en proceso y listas), la entrega más cercana primero: así las
// atrasadas y las de hoy quedan arriba. El técnico ve solo las suyas (RN-12, S-1), sin pestañas; el dueño y el
// encargado con "Órdenes", todas, con una pestaña por estado (`?estado=`).
export default function PaginaOrdenes({ searchParams }: PageProps<"/panel/ordenes">) {
  return (
    <section className="flex flex-col gap-6">
      <Suspense fallback={<Cargando />}>
        <Lista searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

const PESTANAS: { estado: (typeof ESTADOS_ORDEN_ABIERTA)[number]; texto: string }[] = [
  { estado: "recibido", texto: "Recibidas" },
  { estado: "en_proceso", texto: "En proceso" },
  { estado: "listo", texto: "Listas" },
];

async function Lista({ searchParams }: Pick<PageProps<"/panel/ordenes">, "searchParams">) {
  const usuario = await exigirModulo("ordenes");
  const tecnico = usuario.rol === "tecnico";
  const [ordenes, { estado: pedido }] = await Promise.all([ordenesAbiertas(tecnico ? Number(usuario.id) : undefined), searchParams]);
  const hoy = fechaEnBolivia();
  const elegido = PESTANAS.find((p) => p.estado === pedido)?.estado;
  const visibles = tecnico || !elegido ? ordenes : ordenes.filter((o) => o.estado === elegido);
  const cuantas = (estado?: string) => ordenes.filter((o) => !estado || o.estado === estado).length;

  return (
    <>
      <h1 className="font-heading text-4xl font-extrabold italic">{tecnico ? "Mis órdenes" : "Órdenes"}</h1>
      {!tecnico && (
        <Pestanas
          etiqueta="Órdenes por estado"
          activa={elegido ? `/panel/ordenes?estado=${elegido}` : "/panel/ordenes"}
          pestanas={[{ href: "/panel/ordenes", texto: `Todas (${cuantas()})` }, ...PESTANAS.map((p) => ({ href: `/panel/ordenes?estado=${p.estado}`, texto: `${p.texto} (${cuantas(p.estado)})` }))]}
        />
      )}
      {visibles.length === 0 ? (
        <p className="text-tinta-suave">
          {tecnico ? "No tienes órdenes asignadas." : ordenes.length === 0 ? "No hay órdenes abiertas. Se abren al recibir un vehículo desde la agenda." : "No hay órdenes en este estado."}
        </p>
      ) : (
        <ul aria-label="Órdenes abiertas" className="grid max-w-5xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibles.map((o) => (
            <li key={o.id}>
              <TarjetaOrden orden={o} hoy={hoy} conTecnico={!tecnico} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/** Una orden en la lista: grande, para tocarla con el pulgar en el taller. */
function TarjetaOrden({ orden: o, hoy, conTecnico }: { orden: OrdenEnLista; hoy: string; conTecnico: boolean }) {
  const atrasada = estaAtrasada(o, hoy);
  return (
    <Link
      href={`/panel/ordenes/${o.id}` as Route}
      className="flex h-full flex-col gap-2 rounded-sm border border-border p-4 hover:bg-superficie focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foco)]"
    >
      <span className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-heading text-2xl font-extrabold italic">{o.placa}</span>
        <span className="flex flex-wrap gap-1.5">
          <span className="tt-insignia">{NOMBRE_ESTADO_TRABAJO[o.estado]}</span>
          {atrasada && <span className="tt-insignia tt-insignia--aviso">Atrasada</span>}
          {o.sinAvisar && <span className="tt-insignia tt-insignia--aviso">Sin avisar</span>}
        </span>
      </span>
      <span className="text-sm">{o.servicios.join(", ")}</span>
      <span className="text-sm text-tinta-suave">
        {o.cliente}
        {conTecnico && `, ${o.tecnico ?? "sin técnico"}`}
      </span>
      <span className="text-sm">{o.fechaFin === hoy ? "Entrega hoy" : `Entrega aproximada: ${formatearFecha(o.fechaFin)}`}</span>
    </Link>
  );
}
