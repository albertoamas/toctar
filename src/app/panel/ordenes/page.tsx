import type { Metadata } from "next";
import { Suspense } from "react";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { EstadoVacio } from "@/componentes/panel/estado-vacio";
import { ListaFilas, type DatosFila } from "@/componentes/panel/fila-lista";
import { fechaEnBolivia, formatearFecha } from "@/lib/fechas";
import { exigirModulo } from "@/lib/sesion";
import { ordenesAbiertas, type OrdenEnLista } from "@/modulos/ordenes/consultas";
import { ESTADOS_ORDEN_ABIERTA, estaAtrasada } from "@/modulos/ordenes/reglas";

export const metadata: Metadata = { title: "Órdenes" };

// HU-33 y HU-34: las órdenes abiertas, agrupadas en el orden del taller (recibidas, en proceso, listas) y en cada grupo la
// entrega más cercana primero: así las atrasadas y las de hoy quedan arriba. Son pocas a la vez (las que caben en los
// espacios), así que se ven todas, sin pestañas (pulido 11.1); en la computadora, una columna por estado. El técnico
// ve solo las suyas (RN-12, S-1); el dueño y el encargado con "Órdenes", todas.
export default function PaginaOrdenes() {
  return (
    <section className="flex flex-col gap-6">
      <Suspense fallback={<Cargando />}>
        <Lista />
      </Suspense>
    </section>
  );
}

const GRUPOS: Record<(typeof ESTADOS_ORDEN_ABIERTA)[number], string> = { recibido: "Recibidas", en_proceso: "En proceso", listo: "Listas" };

async function Lista() {
  const usuario = await exigirModulo("ordenes");
  const tecnico = usuario.rol === "tecnico";
  const ordenes = await ordenesAbiertas(tecnico ? Number(usuario.id) : undefined);
  const hoy = fechaEnBolivia();

  return (
    <>
      <EncabezadoPagina titulo={tecnico ? "Mis órdenes" : "Órdenes"} />
      {ordenes.length === 0 ? (
        <EstadoVacio>{tecnico ? "No tienes órdenes asignadas." : "No hay órdenes abiertas. Se abren al recibir un vehículo desde la agenda."}</EstadoVacio>
      ) : (
        <div className="grid gap-8 lg:grid-cols-3 lg:gap-6">
          {ESTADOS_ORDEN_ABIERTA.map((estado) => {
            const delGrupo = ordenes.filter((o) => o.estado === estado);
            return (
              <section key={estado} aria-labelledby={`grupo-${estado}`} className="flex flex-col gap-3">
                <h2 id={`grupo-${estado}`} className="font-heading text-2xl font-bold italic">
                  {GRUPOS[estado]} <span className="tabular-nums text-tinta-suave" aria-hidden>({delGrupo.length})</span>
                  <span className="sr-only">, {delGrupo.length === 1 ? "1 orden" : `${delGrupo.length} órdenes`}</span>
                </h2>
                {delGrupo.length === 0 ? (
                  <p className="text-tinta-suave">Ninguna.</p>
                ) : (
                  <ListaFilas etiqueta={`Órdenes ${GRUPOS[estado].toLowerCase()}`} filas={delGrupo.map((o) => filaOrden(o, hoy, !tecnico))} />
                )}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}

/** Una orden en la lista: la placa, lo que pide atención, cuándo se entrega y, en tinta suave, qué se hace y para quién. */
function filaOrden(o: OrdenEnLista, hoy: string, conTecnico: boolean): DatosFila {
  return {
    href: `/panel/ordenes/${o.id}`,
    titulo: o.placa,
    tituloGrande: true,
    aviso: estaAtrasada(o, hoy) ? "Atrasada" : o.sinAvisar ? "Sin avisar" : null,
    dato: o.fechaFin === hoy ? "Entrega hoy" : `Entrega aproximada: ${formatearFecha(o.fechaFin)}`,
    detalles: [o.servicios.join(", "), conTecnico ? `${o.cliente}, ${o.tecnico ?? "sin técnico"}` : o.cliente],
  };
}
