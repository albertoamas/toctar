import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChevronLeftIcon } from "lucide-react";
import { AvisoEnPagina } from "@/componentes/panel/aviso-en-pagina";
import { Cargando } from "@/componentes/panel/cargando";
import { exigirModulo } from "@/lib/sesion";
import { FormularioServicio } from "@/modulos/sitio/componentes/formulario-servicio";
import { FotoYVariantes } from "@/modulos/sitio/componentes/foto-y-variantes";
import { obtenerServicio } from "@/modulos/sitio/consultas";

export const metadata: Metadata = { title: "Servicio" };

// HU-07: edición completa de un servicio: datos, beneficios, pasos, foto y variantes.
export default function PaginaServicio({ params, searchParams }: PageProps<"/panel/sitio/servicios/[id]">) {
  return (
    <div className="flex flex-col gap-6">
      <Link href="/panel/sitio" className="flex items-center gap-1 text-sm text-tinta-suave hover:text-tinta">
        <ChevronLeftIcon className="size-4" aria-hidden />
        Servicios
      </Link>
      <Suspense fallback={<Cargando />}>
        <Detalle params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Detalle({ params, searchParams }: Pick<PageProps<"/panel/sitio/servicios/[id]">, "params" | "searchParams">) {
  await exigirModulo("sitio");
  const [{ id }, { creado }] = await Promise.all([params, searchParams]);
  const numero = Number(id);
  if (!Number.isInteger(numero) || numero <= 0) notFound();
  const s = await obtenerServicio(numero);
  if (!s) notFound();

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-heading text-3xl font-bold italic">{s.nombre}</h2>
        {!s.visible && <span className="tt-insignia">Oculto</span>}
      </div>
      {creado && (
        <AvisoEnPagina>Servicio creado. Completa la descripción, los beneficios, los pasos y la foto.</AvisoEnPagina>
      )}
      <div className="grid gap-12 lg:grid-cols-[minmax(0,40rem)_minmax(0,22rem)]">
        <FormularioServicio
          servicio={{
            id: s.id,
            nombre: s.nombre,
            slug: s.slug,
            resumen: s.resumen,
            descripcion: s.descripcion,
            beneficios: s.beneficios,
            pasos: s.pasos,
            visible: s.visible,
          }}
        />
        <aside>
          <FotoYVariantes servicioId={s.id} nombre={s.nombre} foto={s.foto} variantes={s.listaVariantes} />
        </aside>
      </div>
    </>
  );
}
