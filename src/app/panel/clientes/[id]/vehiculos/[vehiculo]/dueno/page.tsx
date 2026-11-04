import type { Metadata, Route } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EnlaceVolver } from "@/componentes/enlace-volver";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { EstadoVacio } from "@/componentes/panel/estado-vacio";
import { CabeceraSeccion } from "@/componentes/panel/seccion-con-editar";
import { cantidad } from "@/lib/cantidad";
import { exigirModulo } from "@/lib/sesion";
import { ConfirmarCambioDueno } from "@/modulos/clientes/componentes/cambiar-dueno";
import { DatosVehiculo } from "@/modulos/clientes/componentes/datos-vehiculo";
import { ElegirCliente } from "@/modulos/clientes/componentes/elegir-cliente";
import { datosCambioDueno, obtenerCliente } from "@/modulos/clientes/consultas";
import { detalleVehiculo } from "@/modulos/clientes/reglas";

export const metadata: Metadata = { title: "Cambiar de dueño" };

// Pedido 37 (etapas/P37-cambio-de-dueno.md §5): un vehículo pasa a otro cliente. Sin `?nuevo=`, se elige al nuevo
// dueño con el buscador de Clientes; con él, el resumen de lo que pasa y "Pasar a {cliente}". Con el permiso de Clientes.
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
  const ficha = `/panel/clientes/${clienteId}` as Route;
  const base = `/panel/clientes/${clienteId}/vehiculos/${vehiculoId}/dueno`;
  const encabezado = (
    <>
      <EnlaceVolver href={ficha}>{v.dueno}</EnlaceVolver>
      <EncabezadoPagina titulo={`Cambiar de dueño ${v.placa}`}>Ahora es de {v.dueno}.</EncabezadoPagina>
    </>
  );

  if (!v.activo) {
    return (
      <>
        {encabezado}
        <EstadoVacio>{v.placa} está desactivado: reactívalo en la ficha antes de pasarlo.</EstadoVacio>
      </>
    );
  }
  if (v.reservaActiva) {
    return (
      <>
        {encabezado}
        <EstadoVacio>{v.placa} tiene una reserva o está en el taller: entrégalo o cancela la reserva antes de pasarlo.</EstadoVacio>
      </>
    );
  }

  const nuevoId = numero(parametros.nuevo);
  const nuevo = nuevoId && nuevoId !== clienteId ? await obtenerCliente(nuevoId) : null;
  if (!nuevo || !nuevo.activo) {
    return (
      <>
        {encabezado}
        {/* Un ?nuevo= que no sirve (el mismo dueño, uno desactivado o que no existe) dice por qué se vuelve a elegir */}
        {nuevoId !== null && <p className="text-tinta-media">{nuevoId === clienteId ? "Ya es su dueño: elige a otro cliente." : "Ese cliente ya no está activo: elige a otro."}</p>}
        <p className="text-tinta-media">¿A quién pasa? Si es un cliente nuevo, regístralo primero en Clientes.</p>
        <ElegirCliente q={typeof parametros.q === "string" ? parametros.q : ""} hrefCliente={(otro) => `${base}?nuevo=${otro}` as Route} />
      </>
    );
  }

  // Lo que pasa, en el orden en que importa: qué se lleva, qué se cierra y qué no se toca
  const pasa = [
    "El vehículo, con sus datos y su plan de mantenimiento.",
    ...(v.mantenimientosAbiertos > 0 ? [`${cantidad(v.mantenimientosAbiertos, "mantenimiento por avisar", "mantenimientos por avisar")}: el aviso le llega a ${nuevo.nombre}.`] : []),
  ];
  return (
    <>
      {encabezado}
      <section aria-labelledby="vehiculo-titulo" className="flex flex-col gap-3">
        <CabeceraSeccion id="vehiculo" titulo="Vehículo" />
        <div className="tt-tarjeta-panel flex flex-col gap-0.5 p-4">
          <DatosVehiculo placa={v.placa} detalle={detalleVehiculo(v)} tamano={v.tamano} />
        </div>
      </section>
      <section aria-labelledby="que-pasa-titulo" className="flex flex-col gap-3">
        <CabeceraSeccion id="que-pasa" titulo={`De ${v.dueno} a ${nuevo.nombre}`} />
        <div className="tt-tarjeta-panel flex flex-col gap-3 p-4">
          <div>
            <p className="font-semibold">Pasa a {nuevo.nombre}</p>
            <ul className="list-disc pl-5 text-tinta-media">
              {pasa.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
          {v.cotizacionesAbiertas > 0 && (
            <div>
              <p className="font-semibold">Se cierra</p>
              <p className="text-tinta-media">
                {cantidad(v.cotizacionesAbiertas, "cotización abierta", "cotizaciones abiertas")} de {v.dueno} para este vehículo: queda
                rechazada, con el motivo «El vehículo cambió de dueño».
              </p>
            </div>
          )}
          <div>
            <p className="font-semibold">Queda como está</p>
            <p className="text-tinta-media">Las reservas, órdenes, pagos y cotizaciones de {v.dueno}: siguen a su nombre.</p>
          </div>
        </div>
      </section>
      <ConfirmarCambioDueno vehiculoId={vehiculoId} clienteActualId={clienteId} clienteNuevoId={nuevo.id} nuevo={nuevo.nombre} />
    </>
  );
}
