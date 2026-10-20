import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EnlaceVolver } from "@/componentes/enlace-volver";
import { Cargando } from "@/componentes/panel/cargando";
import { exigirModulo } from "@/lib/sesion";
import { FormularioDatosCatalogo } from "@/modulos/catalogo/componentes/formulario-datos-catalogo";
import { FormularioPrecios } from "@/modulos/catalogo/componentes/formulario-precios";
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
      <div className="flex max-w-4xl flex-col gap-12">
        <div className="max-w-2xl">
          <FormularioDatosCatalogo servicio={s} />
        </div>
        <section aria-labelledby="precios-titulo" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 id="precios-titulo" className="font-heading text-2xl font-bold italic">Precios por tamaño</h2>
            <p className="text-sm text-tinta-suave">
              Deja vacío el precio que depende de ver el vehículo: sale como «Según evaluación». Cada cambio queda en el historial con la
              fecha y quién lo hizo; las cotizaciones ya enviadas no cambian.
            </p>
          </div>
          {/* Los modelos de ejemplo, una sola vez y no en cada variante (antes se repetían y alargaban la página) */}
          {s.tamanos.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer py-3 font-semibold">Ver los modelos de cada tamaño</summary>
              <dl className="flex flex-col gap-2 pb-2">
                {s.tamanos.map((t) => (
                  <div key={t.id}>
                    <dt className="font-semibold">{t.nombre}</dt>
                    <dd className="text-tinta-suave">{t.descripcion ?? "Sin modelos de ejemplo."}</dd>
                  </div>
                ))}
              </dl>
            </details>
          )}
          {s.tamanos.length === 0 ? (
            <p className="text-sm text-tinta-suave">
              No hay tamaños de vehículo activos.{" "}
              <Link href="/panel/configuracion/taller" className="font-semibold text-tinta underline">Agrégalos en Configuración</Link>.
            </p>
          ) : (
            s.variantes.map((v) => <FormularioPrecios key={v.id} variante={v} tamanos={s.tamanos} duracionServicio={s.duracionDias} />)
          )}
        </section>
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
