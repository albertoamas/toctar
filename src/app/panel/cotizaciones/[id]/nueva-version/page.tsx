import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { EstadoVacio } from "@/componentes/panel/estado-vacio";
import { PaginaPanel } from "@/componentes/panel/pagina-panel";
import { fechaEnBolivia } from "@/lib/fechas";
import { exigirAccion } from "@/lib/sesion";
import { FormularioNuevaVersion } from "@/modulos/cotizaciones/componentes/formulario-cotizacion";
import { datosNuevaVersion } from "@/modulos/cotizaciones/consultas";
import { NOMBRE_ESTADO } from "@/modulos/cotizaciones/reglas";
import { formatearWhatsApp } from "@/lib/whatsapp";
import { ResumenClienteVehiculo } from "@/modulos/clientes/componentes/resumen-cliente-vehiculo";

export const metadata: Metadata = { title: "Nueva versión" };

// Versión nueva de una cotización pendiente (RN-02): `?desde=<id>` es la vigente, que se reemplaza; arranca con sus
// servicios, precios y condiciones. Un `desde` que ya no es la vigente lleva a la vigente. El dueño o el encargado con
// "Cotizaciones" (pedido 24).
export default function PaginaNuevaVersion({ params, searchParams }: PageProps<"/panel/cotizaciones/[id]/nueva-version">) {
  return (
    <PaginaPanel tipo="formulario">
      <Suspense fallback={<Cargando />}>
        <Contenido params={params} searchParams={searchParams} />
      </Suspense>
    </PaginaPanel>
  );
}

async function Contenido({ params, searchParams }: Pick<PageProps<"/panel/cotizaciones/[id]/nueva-version">, "params" | "searchParams">) {
  await exigirAccion("cotizar");
  const [{ id }, { desde }] = await Promise.all([params, searchParams]);
  const consultaId = Number(id);
  if (!Number.isInteger(consultaId) || consultaId <= 0) notFound();
  const desdeId = typeof desde === "string" && /^\d+$/.test(desde) ? Number(desde) : null;
  const datos = await datosNuevaVersion(consultaId, desdeId);
  // Una consulta de antes sin cotizar no tiene versiones: no es una cotización
  if (!datos || datos.estado === "consulto") notFound();
  // Sin `desde` (o con uno de otra cotización), a la vigente
  if (!datos.desde && !datos.desdeReemplazado && datos.vigenteId) redirect(`/panel/cotizaciones/${consultaId}/nueva-version?desde=${datos.vigenteId}`);

  const volver = `/panel/cotizaciones/${consultaId}` as const;
  const enlace = "font-semibold underline";

  return (
    <>
      <div className="flex flex-col gap-2">
        <EncabezadoPagina titulo={datos.desde ? `Versión ${datos.desde.version + 1}` : "Nueva versión"} volver={{ href: volver, texto: datos.desde ? `Cotización ${datos.desde.numero}` : "Cotización" }} />
        {datos.desde && <p className="text-sm text-tinta-suave">La versión {datos.desde.version} queda como estaba, con su PDF.</p>}
      </div>

      {datos.estado !== "cotizado" ? (
        <EstadoVacio>
          La cotización está {NOMBRE_ESTADO[datos.estado].toLowerCase()}: {datos.estado === "perdido" ? "vuelve a ponerla pendiente para cambiarla" : "ya no se cambia"}.{" "}
          <Link href={volver} className={enlace}>Volver a la cotización</Link>
        </EstadoVacio>
      ) : !datos.desde ? (
        <EstadoVacio>
          Esa versión ya fue reemplazada.{" "}
          <Link href={volver} className={enlace}>Ver la vigente</Link>
        </EstadoVacio>
      ) : datos.opciones.length === 0 ? (
        <EstadoVacio>No hay servicios activos para cotizar: se activan en Catálogo y precios.</EstadoVacio>
      ) : (
        <>
          {/* Para quién, en su tarjeta como en Nueva cotización (pulido final, 10/11: era una línea suelta bajo el título);
              sin "Cambiar": una versión es de la misma cotización */}
          <ResumenClienteVehiculo
            id="version-para"
            titulo="Cotización para"
            cliente={{ nombre: datos.cliente, detalle: formatearWhatsApp(datos.telefono) }}
            vehiculo={{ placa: datos.placa, detalle: datos.detalle, tamano: datos.tamano }}
          />
          {/* La key lo vuelve a montar al cambiar de versión: Next conserva la página anterior y el formulario guardaba
              las líneas de la visita de antes */}
          <FormularioNuevaVersion key={datos.desde.id} datos={{ ...datos, desde: datos.desde }} hoy={fechaEnBolivia()} />
        </>
      )}
    </>
  );
}
