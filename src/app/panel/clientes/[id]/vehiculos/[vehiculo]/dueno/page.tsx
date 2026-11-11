import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { cn } from "cn";
import { Seccion } from "@/componentes/panel/cabecera-seccion";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { PaginaPanel } from "@/componentes/panel/pagina-panel";
import { buttonVariants } from "@/componentes/ui/button";
import { cantidad } from "@/lib/cantidad";
import { puedeVerModulo } from "@/lib/permisos";
import { exigirModulo } from "@/lib/sesion";
import { ConfirmarCambioDueno } from "@/modulos/clientes/componentes/cambiar-dueno";
import { DatosVehiculo } from "@/modulos/clientes/componentes/datos-vehiculo";
import { ElegirCliente } from "@/modulos/clientes/componentes/elegir-cliente";
import { datosCambioDueno, obtenerCliente } from "@/modulos/clientes/consultas";
import { detalleVehiculo } from "@/modulos/clientes/reglas";
import { enlaceTrabajo } from "@/modulos/ordenes/reglas";

export const metadata: Metadata = { title: "Cambiar de dueño" };

// Pedido 37 (etapas/P37-cambio-de-dueno.md §5): un vehículo pasa a otro cliente. Un flujo de un paso (skill
// pantallas-panel): sin `?nuevo=`, se elige al nuevo dueño con el buscador de Clientes; con él, qué pasa, qué se cierra y
// qué queda, y "Cambiar de dueño" al pie. Con el permiso de Clientes. Arriba, el vehículo en su tarjeta; lo que frena el
// cambio, en un aviso con su botón para resolverlo (inventario-pantallas.md, cambio 4c: el dueño se leía dos veces en el
// encabezado y el bloqueo iba en el recuadro de "no hay nada", sin camino para seguir).
export default function PaginaCambioDueno({ params, searchParams }: PageProps<"/panel/clientes/[id]/vehiculos/[vehiculo]/dueno">) {
  return (
    <PaginaPanel tipo="formulario">
      <Suspense fallback={<Cargando />}>
        <Contenido params={params} searchParams={searchParams} />
      </Suspense>
    </PaginaPanel>
  );
}

/** Un id de la dirección: solo dígitos y dentro de lo que guarda la base (uno mayor, no existe). */
const numero = (texto: unknown) => (typeof texto === "string" && /^\d{1,10}$/.test(texto) && Number(texto) <= 2147483647 ? Number(texto) : null);

async function Contenido({ params, searchParams }: Pick<PageProps<"/panel/clientes/[id]/vehiculos/[vehiculo]/dueno">, "params" | "searchParams">) {
  const usuario = await exigirModulo("clientes");
  const [{ id, vehiculo }, parametros] = await Promise.all([params, searchParams]);
  const clienteId = numero(id);
  const vehiculoId = numero(vehiculo);
  if (!clienteId || !vehiculoId) notFound();
  const v = await datosCambioDueno(vehiculoId, clienteId);
  if (!v) notFound();
  const base = `/panel/clientes/${clienteId}/vehiculos/${vehiculoId}/dueno`;
  const nuevoId = numero(parametros.nuevo);
  const nuevo = nuevoId && nuevoId !== clienteId ? await obtenerCliente(nuevoId) : null;
  // "Volver" y "Cancelar", a donde se vino: la ficha del comprador si se llegó desde su placa repetida (`?desde=comprador`)
  const desdeComprador = parametros.desde === "comprador" && !!nuevo;
  const volver = desdeComprador && nuevo ? { href: `/panel/clientes/${nuevo.id}` as Route, texto: nuevo.nombre } : { href: `/panel/clientes/${clienteId}` as Route, texto: v.dueno };
  const encabezado = (
    <>
      <EncabezadoPagina titulo={`Cambiar de dueño ${v.placa}`} volver={volver} />
      <Seccion id="vehiculo" titulo="Vehículo">
        <span className="flex flex-col">
          <DatosVehiculo placa={v.placa} detalle={detalleVehiculo(v)} tamano={v.tamano} />
          {/* El dueño ya está debajo del título cuando se vuelve a su ficha; si se vino del comprador, aquí */}
          {desdeComprador && <span className="text-sm text-tinta-suave">Ahora es de {v.dueno}</span>}
        </span>
      </Seccion>
    </>
  );
  const ve = { ordenes: puedeVerModulo(usuario, "ordenes"), agenda: puedeVerModulo(usuario, "agenda") };

  if (!v.activo) {
    return (
      <>
        {encabezado}
        {/* "Volver" ya lleva a su ficha, salvo si se vino del comprador */}
        <Bloqueo accion={desdeComprador ? { href: `/panel/clientes/${clienteId}` as Route, texto: `Ir a la ficha de ${v.dueno}` } : null}>{v.placa} está desactivado: reactívalo en la ficha antes de cambiarle el dueño.</Bloqueo>
      </>
    );
  }
  if (v.reservaActiva) {
    // A su reserva o a su orden, si quien mira puede abrirla
    const trabajo = enlaceTrabajo(v.reservaActiva.id, v.reservaActiva.estado, ve);
    return (
      <>
        {encabezado}
        <Bloqueo accion={trabajo}>{v.placa} tiene una reserva o está en el taller: entrégalo o cancela la reserva antes de cambiarle el dueño.</Bloqueo>
      </>
    );
  }

  // Cerrar sus cotizaciones es rechazarlas: se dice antes de ofrecer un botón que la acción no va a aceptar (pedido 24)
  if (v.cotizacionesAbiertas > 0 && !puedeVerModulo(usuario, "cotizaciones")) {
    return (
      <>
        {encabezado}
        <Bloqueo>{v.placa} tiene cotizaciones abiertas que se cierran al cambiarle el dueño: lo hace el dueño o quien tiene «Cotizaciones».</Bloqueo>
      </>
    );
  }
  if (!nuevo || !nuevo.activo) {
    return (
      <>
        {encabezado}
        {/* Un ?nuevo= que no sirve (el mismo dueño, uno desactivado o que no existe) dice por qué se vuelve a elegir */}
        {nuevoId !== null && <p role="status">{nuevoId === clienteId ? "Ya es su dueño: elige a otro cliente." : "Ese cliente ya no está activo: elige a otro."}</p>}
        <ElegirCliente titulo="Nuevo dueño" q={typeof parametros.q === "string" ? parametros.q : ""} excepto={clienteId} hrefCliente={(otro) => `${base}?nuevo=${otro}` as Route} />
      </>
    );
  }

  const filas: [string, string][] = [
    ["Nuevo dueño", nuevo.nombre],
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
      {encabezado}
      <dl aria-label="Qué pasa al cambiar de dueño" className="tt-tarjeta-panel grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-3 p-4">
        {filas.map(([etiqueta, texto]) => (
          <div key={etiqueta} className="contents">
            <dt className="text-tinta-suave">{etiqueta}</dt>
            <dd>{texto}</dd>
          </div>
        ))}
      </dl>
      <ConfirmarCambioDueno vehiculoId={vehiculoId} clienteActualId={clienteId} clienteNuevoId={nuevo.id} cancelar={volver.href} />
    </>
  );
}

/** Lo que frena el cambio, en un aviso (no en el recuadro de "no hay nada") y, si hay, el botón para resolverlo. */
function Bloqueo({ accion, children }: { accion?: { href: Route; texto: string } | null; children: React.ReactNode }) {
  return (
    <div role="status" className="flex flex-col items-start gap-3 rounded-sm border border-aviso bg-aviso-fondo p-4">
      <p>{children}</p>
      {accion && (
        <Link href={accion.href} className={cn(buttonVariants({ variant: "outline" }), "bg-fondo")}>
          {accion.texto}
        </Link>
      )}
    </div>
  );
}
