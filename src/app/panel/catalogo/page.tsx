import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Cargando } from "@/componentes/panel/cargando";
import { exigirModulo } from "@/lib/sesion";
import { listarCatalogo } from "@/modulos/catalogo/consultas";

export const metadata: Metadata = { title: "Catálogo y precios" };

// HU-19 y HU-20: servicios del catálogo con su duración, mantenimiento y precios. Solo el dueño (RN-01).
export default function PaginaCatalogo() {
  return (
    <section className="flex max-w-3xl flex-col gap-6">
      <h1 className="font-heading text-4xl font-extrabold italic">Catálogo y precios</h1>
      <Suspense fallback={<Cargando />}>
        <Lista />
      </Suspense>
    </section>
  );
}

async function Lista() {
  await exigirModulo("catalogo");
  const servicios = await listarCatalogo();
  return (
    <>
      <p className="text-tinta-suave">Los precios que cargas aquí no salen en el sitio. Toca un servicio para editarlo.</p>
      <ol aria-label="Servicios del catálogo" className="flex flex-col divide-y divide-border rounded-sm border border-border">
        {servicios.map((s) => (
          <li key={s.id}>
            <Link href={`/panel/catalogo/${s.id}`} className={`group flex flex-col gap-1 p-3 hover:bg-superficie ${s.activo ? "" : "text-tinta-suave"}`}>
              <span className="flex flex-wrap items-center gap-2 font-semibold group-hover:underline">
                {s.nombre}
                {!s.activo && <span className="tt-insignia">Inactivo</span>}
                {s.generaMantenimiento && <span className="tt-insignia">Genera mantenimiento</span>}
              </span>
              <span className="flex flex-wrap gap-x-3 text-sm text-tinta-suave">
                <span className="whitespace-nowrap">{s.variantes === 1 ? "1 variante" : `${s.variantes} variantes`}</span>
                <span className="whitespace-nowrap">{s.duracionDias === 1 ? "1 día" : `${s.duracionDias} días`}</span>
                {/* Los que faltan, en tinta: es lo que hay que cargar */}
                {!s.activo ? null : s.preciosFaltantes === 0 ? (
                  <span className="whitespace-nowrap">Precios completos</span>
                ) : (
                  <span className="font-semibold whitespace-nowrap text-tinta">{s.preciosFaltantes === 1 ? "Falta 1 precio" : `Faltan ${s.preciosFaltantes} precios`}</span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </>
  );
}
