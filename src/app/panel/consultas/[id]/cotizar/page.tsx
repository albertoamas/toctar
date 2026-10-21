import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { EnlaceVolver } from "@/componentes/enlace-volver";
import { Cargando } from "@/componentes/panel/cargando";
import { EstadoVacio } from "@/componentes/panel/estado-vacio";
import { fechaEnBolivia } from "@/lib/fechas";
import { exigirModulo } from "@/lib/sesion";
import { NOMBRE_ESTADO } from "@/modulos/consultas/reglas";
import { FormularioCotizacion } from "@/modulos/cotizaciones/componentes/formulario-cotizacion";
import { datosParaCotizar } from "@/modulos/cotizaciones/consultas";

export const metadata: Metadata = { title: "Cotizar" };

// HU-25: armar la cotización de una consulta. Solo el dueño (RN-01): exigirModulo("cotizaciones") no tiene permiso de
// encargado. `?desde=<id>` corrige la versión vigente: arranca con sus líneas, descuento y fotos, y guarda la siguiente.
export default function PaginaCotizar({ params, searchParams }: PageProps<"/panel/consultas/[id]/cotizar">) {
  return (
    <Suspense fallback={<Cargando />}>
      <Contenido params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Contenido({ params, searchParams }: Pick<PageProps<"/panel/consultas/[id]/cotizar">, "params" | "searchParams">) {
  await exigirModulo("cotizaciones");
  const [{ id }, { desde }] = await Promise.all([params, searchParams]);
  const consultaId = Number(id);
  if (!Number.isInteger(consultaId) || consultaId <= 0) notFound();
  const desdeId = typeof desde === "string" && /^\d+$/.test(desde) ? Number(desde) : null;
  const datos = await datosParaCotizar(consultaId, desdeId);
  if (!datos) notFound();
  // Con una vigente, cotizar es corregirla; un `desde` que no es la vigente (otra consulta, un enlace viejo) lleva a
  // corregir la vigente, o a la primera cotización si no hay
  if (!datos.desde && !datos.desdeReemplazado) {
    if (datos.vigenteId) redirect(`/panel/consultas/${consultaId}/cotizar?desde=${datos.vigenteId}`);
    if (desdeId) redirect(`/panel/consultas/${consultaId}/cotizar`);
  }

  const volver = `/panel/consultas/${consultaId}` as const;
  const titulo = datos.desde ? `Corregir la cotización ${datos.desde.numero}` : "Cotizar";
  const cerrada = datos.estado === "perdido" || datos.estado === "confirmado";

  return (
    <section className="flex flex-col gap-6">
      <EnlaceVolver href={volver}>{datos.cliente}</EnlaceVolver>
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-4xl font-extrabold italic">{titulo}</h1>
        <p className="flex flex-wrap gap-x-3 text-tinta-suave">
          <span className="font-semibold text-tinta">{datos.cliente}</span>
          <span>{datos.placa}</span>
          <span>{datos.tamano}</span>
        </p>
        {datos.desde && (
          <p className="text-sm text-tinta-suave">
            Se guarda como versión {datos.desde.version + 1}. La versión {datos.desde.version} queda como estaba, con su PDF.
          </p>
        )}
      </div>

      {cerrada ? (
        <EstadoVacio>
          La consulta está {NOMBRE_ESTADO[datos.estado].toLowerCase()}: {datos.estado === "perdido" ? "reábrela para cotizar" : "ya no se cotiza"}.{" "}
          <Link href={volver} className="font-semibold underline">Volver a la consulta</Link>
        </EstadoVacio>
      ) : datos.desdeReemplazado ? (
        <EstadoVacio>
          Esa versión ya fue corregida.{" "}
          <Link href={volver} className="font-semibold underline">Ver la vigente en la consulta</Link>
        </EstadoVacio>
      ) : datos.opciones.length === 0 ? (
        <EstadoVacio>
          No hay servicios activos para cotizar.{" "}
          <Link href="/panel/catalogo" className="font-semibold underline">Revisa el catálogo</Link>
        </EstadoVacio>
      ) : (
        // La key lo vuelve a montar al cambiar de versión: Next conserva la página anterior y el formulario guardaba
        // las líneas de la visita de antes
        <FormularioCotizacion key={datos.desdeId ?? "primera"} datos={datos} hoy={fechaEnBolivia()} />
      )}
    </section>
  );
}
