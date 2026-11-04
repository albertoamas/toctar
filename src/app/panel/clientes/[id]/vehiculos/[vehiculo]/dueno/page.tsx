import type { Metadata, Route } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EnlaceVolver } from "@/componentes/enlace-volver";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { EstadoVacio } from "@/componentes/panel/estado-vacio";
import { cantidad } from "@/lib/cantidad";
import { exigirModulo } from "@/lib/sesion";
import { ConfirmarCambioDueno } from "@/modulos/clientes/componentes/cambiar-dueno";
import { ElegirCliente } from "@/modulos/clientes/componentes/elegir-cliente";
import { datosCambioDueno, obtenerCliente } from "@/modulos/clientes/consultas";
import { detalleVehiculo } from "@/modulos/clientes/reglas";

export const metadata: Metadata = { title: "Cambiar de dueño" };

// Pedido 37 (etapas/P37-cambio-de-dueno.md §5): un vehículo pasa a otro cliente. Un flujo de un paso (skill
// pantallas-panel): sin `?nuevo=`, se elige al nuevo dueño con el buscador de Clientes; con él, qué pasa, qué se cierra y
// qué queda, y "Cambiar de dueño" al pie. Con el permiso de Clientes.
export default function PaginaCambioDueno({ params, searchParams }: PageProps<"/panel/clientes/[id]/vehiculos/[vehiculo]/dueno">) {
  return (
    <section className="flex max-w-3xl flex-col gap-6">
      <Suspense fallback={<Cargando />}>
        <Contenido params={params} searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

const numero = (texto: unknown) => (typeof texto === "string" && /^\d+$/.test(texto) ? Number(texto) : null);

async function Contenido({ params, searchParams }: Pick<PageProps<"/panel/clientes/[id]/vehiculos/[vehiculo]/dueno">, "params" | "searchParams">) {
  await exigirModulo("clientes");
  const [{ id, vehiculo }, parametros] = await Promise.all([params, searchParams]);
  const clienteId = numero(id);
  const vehiculoId = numero(vehiculo);
  if (!clienteId || !vehiculoId) notFound();
  const v = await datosCambioDueno(vehiculoId, clienteId);
  if (!v) notFound();
  const base = `/panel/clientes/${clienteId}/vehiculos/${vehiculoId}/dueno`;
  const detalle = detalleVehiculo(v).join(" ");
  const encabezado = (contexto: string) => (
    <>
      <EnlaceVolver href={`/panel/clientes/${clienteId}` as Route}>{v.dueno}</EnlaceVolver>
      <EncabezadoPagina titulo={`Cambiar de dueño ${v.placa}`}>{[detalle && `${detalle}.`, contexto].filter(Boolean).join(" ")}</EncabezadoPagina>
    </>
  );
  const ahora = `Ahora es de ${v.dueno}.`;

  if (!v.activo) {
    return (
      <>
        {encabezado(ahora)}
        <EstadoVacio>{v.placa} está desactivado: reactívalo en la ficha antes de cambiarle el dueño.</EstadoVacio>
      </>
    );
  }
  if (v.reservaActiva) {
    return (
      <>
        {encabezado(ahora)}
        <EstadoVacio>{v.placa} tiene una reserva o está en el taller: entrégalo o cancela la reserva antes de cambiarle el dueño.</EstadoVacio>
      </>
    );
  }

  const nuevoId = numero(parametros.nuevo);
  const nuevo = nuevoId && nuevoId !== clienteId ? await obtenerCliente(nuevoId) : null;
  if (!nuevo || !nuevo.activo) {
    return (
      <>
        {encabezado(ahora)}
        {/* Un ?nuevo= que no sirve (el mismo dueño, uno desactivado o que no existe) dice por qué se vuelve a elegir */}
        {nuevoId !== null && <p role="status">{nuevoId === clienteId ? "Ya es su dueño: elige a otro cliente." : "Ese cliente ya no está activo: elige a otro."}</p>}
        <ElegirCliente titulo="Nuevo dueño" q={typeof parametros.q === "string" ? parametros.q : ""} excepto={clienteId} hrefCliente={(otro) => `${base}?nuevo=${otro}` as Route} />
      </>
    );
  }

  const filas: [string, string][] = [
    [
      "Pasa",
      [
        "El vehículo y su plan de mantenimiento.",
        v.mantenimientosAbiertos > 0 && `${cantidad(v.mantenimientosAbiertos, "mantenimiento por avisar", "mantenimientos por avisar")}: el aviso le llega a ${nuevo.nombre}.`,
      ]
        .filter(Boolean)
        .join(" "),
    ],
    ...(v.cotizacionesAbiertas > 0
      ? ([["Se cierra", `${cantidad(v.cotizacionesAbiertas, "cotización abierta", "cotizaciones abiertas")}: pasa a rechazada, con el motivo «El vehículo cambió de dueño».`]] as [string, string][])
      : []),
    ["Queda", `Las reservas, órdenes y pagos de ${v.dueno} siguen a su nombre.`],
  ];
  return (
    <>
      {encabezado(`De ${v.dueno} a ${nuevo.nombre}.`)}
      <dl aria-label="Qué pasa al cambiar de dueño" className="tt-tarjeta-panel grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-3 p-4">
        {filas.map(([etiqueta, texto]) => (
          <div key={etiqueta} className="contents">
            <dt className="text-tinta-suave">{etiqueta}</dt>
            <dd>{texto}</dd>
          </div>
        ))}
      </dl>
      <ConfirmarCambioDueno vehiculoId={vehiculoId} clienteActualId={clienteId} clienteNuevoId={nuevo.id} />
    </>
  );
}
