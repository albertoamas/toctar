import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EnlaceVolver } from "@/componentes/enlace-volver";
import { Cargando } from "@/componentes/panel/cargando";
import { puedeVerModulo } from "@/lib/permisos";
import { exigirModulo } from "@/lib/sesion";
import { FormularioServicio } from "@/modulos/sitio/componentes/formulario-servicio";
import { FotoServicio } from "@/modulos/sitio/componentes/foto-servicio";
import { FotosServicio } from "@/modulos/sitio/componentes/fotos-servicio";
import { fotosDeSecciones, obtenerServicio } from "@/modulos/sitio/consultas";

export const metadata: Metadata = { title: "Servicio" };

// HU-07: la página del servicio en el sitio: dirección, textos, beneficios, pasos, fotos y si se muestra. El nombre y
// las variantes son del catálogo: el dueño tiene el enlace.
export default function PaginaServicio({ params }: PageProps<"/panel/sitio/servicios/[id]">) {
  return (
    <div className="flex flex-col gap-6">
      <EnlaceVolver href="/panel/sitio">Servicios</EnlaceVolver>
      <Suspense fallback={<Cargando />}>
        <Detalle params={params} />
      </Suspense>
    </div>
  );
}

async function Detalle({ params }: Pick<PageProps<"/panel/sitio/servicios/[id]">, "params">) {
  const usuario = await exigirModulo("sitio");
  const { id } = await params;
  const numero = Number(id);
  if (!Number.isInteger(numero) || numero <= 0) notFound();
  const [s, fotos] = await Promise.all([obtenerServicio(numero), fotosDeSecciones(numero)]);
  if (!s) notFound();

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-heading text-3xl font-bold italic">{s.nombre}</h2>
        {!s.visible && <span className="tt-insignia">Oculto</span>}
      </div>
      {puedeVerModulo(usuario, "catalogo") && (
        <p className="flex flex-wrap items-center gap-x-2 text-sm">
          <span className="text-tinta-suave">El nombre, las variantes y los precios están en el catálogo.</span>
          <Link href={`/panel/catalogo/${s.id}`} className="inline-flex min-h-11 items-center font-semibold underline">
            Abrir en el catálogo
          </Link>
        </p>
      )}
      <div className="grid gap-12 lg:grid-cols-[minmax(0,40rem)_minmax(0,22rem)]">
        <FormularioServicio
          servicio={{
            id: s.id,
            slug: s.slug,
            resumen: s.resumen,
            descripcion: s.descripcion,
            beneficios: s.beneficios,
            pasos: s.pasos,
            visible: s.visible,
            opcionesEnEscalera: s.opcionesEnEscalera,
          }}
        />
        <aside className="flex flex-col gap-10">
          <FotoServicio servicioId={s.id} nombre={s.nombre} foto={s.foto} />
          <FotosServicio servicioId={s.id} fotos={fotos} />
        </aside>
      </div>
    </>
  );
}
