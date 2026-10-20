import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EnlaceVolver } from "@/componentes/enlace-volver";
import { Cargando } from "@/componentes/panel/cargando";
import { exigirModulo } from "@/lib/sesion";
import { FormularioDatosCatalogo } from "@/modulos/catalogo/componentes/formulario-datos-catalogo";
import { obtenerServicioCatalogo } from "@/modulos/catalogo/consultas";

export const metadata: Metadata = { title: "Servicio del catálogo" };

// HU-19 y HU-20: duración, mantenimiento, estado y precios de un servicio. Solo el dueño (RN-01).
export default function PaginaServicioCatalogo({ params }: PageProps<"/panel/catalogo/[id]">) {
  return (
    <section className="flex flex-col gap-6">
      <EnlaceVolver href="/panel/catalogo">Catálogo y precios</EnlaceVolver>
      <Suspense fallback={<Cargando />}>
        <Detalle params={params} />
      </Suspense>
    </section>
  );
}

async function Detalle({ params }: Pick<PageProps<"/panel/catalogo/[id]">, "params">) {
  await exigirModulo("catalogo");
  const { id } = await params;
  const numero = Number(id);
  if (!Number.isInteger(numero) || numero <= 0) notFound();
  const s = await obtenerServicioCatalogo(numero);
  if (!s) notFound();

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-heading text-4xl font-extrabold italic">{s.nombre}</h1>
        {!s.activo && <span className="tt-insignia">Inactivo</span>}
      </div>
      <div className="flex max-w-2xl flex-col gap-12">
        <FormularioDatosCatalogo servicio={s} />
        <section aria-labelledby="variantes-titulo" className="flex flex-col gap-3">
          <h2 id="variantes-titulo" className="font-heading text-2xl font-bold italic">Variantes</h2>
          {/* Sin borde: no se tocan (se editan en el sitio web) */}
          <ul className="flex flex-wrap gap-2">
            {s.variantes.map((v) => (
              <li key={v.id} className="rounded-sm bg-superficie px-3 py-1.5 text-sm">{v.nombre}</li>
            ))}
          </ul>
          <p className="text-sm text-tinta-suave">Las variantes se agregan, ordenan y desactivan en el sitio web.</p>
          <Link href={`/panel/sitio/servicios/${s.id}`} className="inline-flex min-h-11 items-center self-start font-semibold underline">
            Editar variantes
          </Link>
        </section>
      </div>
    </>
  );
}
