import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EnlaceVolver } from "@/componentes/enlace-volver";
import { AvisoEnPagina } from "@/componentes/panel/aviso-en-pagina";
import { Cargando } from "@/componentes/panel/cargando";
import { exigirModulo } from "@/lib/sesion";
import { FormularioDatosCatalogo } from "@/modulos/catalogo/componentes/formulario-datos-catalogo";
import { FormularioPrecios } from "@/modulos/catalogo/componentes/formulario-precios";
import { VariantesServicio } from "@/modulos/catalogo/componentes/variantes-servicio";
import { obtenerServicioCatalogo } from "@/modulos/catalogo/consultas";

export const metadata: Metadata = { title: "Servicio del catálogo" };

// HU-19 y HU-20: nombre, duración, mantenimiento, estado, precios y variantes de un servicio. Solo el dueño (RN-01).
// Su página en el sitio (textos y foto) se edita en Sitio web: el enlace lleva ahí.
export default function PaginaServicioCatalogo({ params, searchParams }: PageProps<"/panel/catalogo/[id]">) {
  return (
    <section className="flex flex-col gap-6">
      <EnlaceVolver href="/panel/catalogo">Catálogo y precios</EnlaceVolver>
      <Suspense fallback={<Cargando />}>
        <Detalle params={params} searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function Detalle({ params, searchParams }: Pick<PageProps<"/panel/catalogo/[id]">, "params" | "searchParams">) {
  await exigirModulo("catalogo");
  const [{ id }, { creado }] = await Promise.all([params, searchParams]);
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
      {creado && <AvisoEnPagina>Servicio creado. Carga sus precios; su página en el sitio se completa en Sitio web.</AvisoEnPagina>}
      <p className="flex flex-wrap items-center gap-x-2 text-sm">
        {/* Sale en el sitio si está activo y su página se muestra (publico.ts pide las dos) */}
        <span className="text-tinta-suave">
          {!s.activo ? "Inactivo: no sale en el sitio." : s.visibleSitio ? "Se muestra en el sitio." : "Oculto en el sitio."}
        </span>
        <Link href={`/panel/sitio/servicios/${s.id}`} className="inline-flex min-h-11 items-center font-semibold underline">
          Editar su página en el sitio
        </Link>
      </p>
      <div className="flex max-w-4xl flex-col gap-12">
        <div className="max-w-2xl">
          <FormularioDatosCatalogo servicio={{ id: s.id, nombre: s.nombre, duracionDias: s.duracionDias, generaMantenimiento: s.generaMantenimiento, activo: s.activo }} />
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
        <VariantesServicio servicioId={s.id} variantes={s.listaVariantes} />
      </div>
    </>
  );
}
