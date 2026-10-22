import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { cn } from "cn";
import { EnlaceVolver } from "@/componentes/enlace-volver";
import { AvisoEnPagina } from "@/componentes/panel/aviso-en-pagina";
import { Cargando } from "@/componentes/panel/cargando";
import { IconoWhatsApp } from "@/componentes/sitio/iconos-marca";
import { buttonVariants } from "@/componentes/ui/button";
import { fechaEnBolivia, formatearFecha, formatearFechaHora } from "@/lib/fechas";
import { puedeVerModulo } from "@/lib/permisos";
import { exigirModulo } from "@/lib/sesion";
import { enlaceWhatsApp, formatearWhatsApp } from "@/lib/whatsapp";
import { NOMBRE_ESTADO_TRABAJO } from "@/modulos/agenda/reglas";
import { FotosOrden } from "@/modulos/ordenes/componentes/fotos-orden";
import { obtenerOrden } from "@/modulos/ordenes/consultas";
import { esOrden, puedeVerOrden } from "@/modulos/ordenes/reglas";
import { MontosTrabajo } from "@/modulos/pagos/componentes/montos-trabajo";

export const metadata: Metadata = { title: "Orden" };

// HU-33: la orden (RF-40, RF-41). El dueño y el encargado con "Órdenes" ven todas; el técnico, solo las suyas y sin
// precios ni pagos ni el teléfono del cliente (RN-12). Los avances, el estado y las demás fotos llegan con la HU-34.
export default function PaginaOrden({ params, searchParams }: PageProps<"/panel/ordenes/[id]">) {
  return (
    <section className="flex flex-col gap-6">
      <EnlaceVolver href="/panel/ordenes">Órdenes</EnlaceVolver>
      <Suspense fallback={<Cargando />}>
        <Detalle params={params} searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function Detalle({ params, searchParams }: Pick<PageProps<"/panel/ordenes/[id]">, "params" | "searchParams">) {
  const usuario = await exigirModulo("ordenes");
  const [{ id }, { recibido }] = await Promise.all([params, searchParams]);
  if (!/^\d+$/.test(id)) notFound();
  const tecnico = usuario.rol === "tecnico";
  const o = await obtenerOrden(Number(id), puedeVerModulo(usuario, "pagos"));
  if (!o) notFound();
  if (!puedeVerOrden(usuario, o.tecnicoId)) redirect("/panel/sin-acceso");
  // Todavía es una reserva (o se canceló): se ve en la agenda; el técnico no tiene nada que ver ahí
  if (!esOrden(o.estado)) {
    if (tecnico) notFound();
    redirect(`/panel/agenda/${o.id}`);
  }
  const verFicha = puedeVerModulo(usuario, "clientes");
  const fotosIngreso = o.fotos.filter((f) => f.etapa === "ingreso").map((f) => ({ ...f, puedeQuitar: false }));

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-4">
        <h1 className="font-heading text-4xl font-extrabold italic">{o.placa}</h1>
        <span className="tt-insignia">{NOMBRE_ESTADO_TRABAJO[o.estado]}</span>
        {!tecnico && (
          <a href={enlaceWhatsApp(o.telefono)} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: "outline" }), "sm:ml-auto")}>
            <IconoWhatsApp />
            Escribir por WhatsApp
          </a>
        )}
      </div>
      {recibido && o.estado === "recibido" && <AvisoEnPagina>Vehículo recibido. La orden está en «Recibidas».</AvisoEnPagina>}

      <div className="grid max-w-5xl gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start">
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-3 rounded-sm border border-border p-4 text-sm lg:col-start-2 lg:row-start-1">
          <dt className="text-tinta-suave">Vehículo</dt>
          <dd className="flex flex-col">
            <span className="font-semibold">{o.placa}</span>
            <span className="text-tinta-suave">{o.tamano}</span>
          </dd>
          <dt className="text-tinta-suave">Cliente</dt>
          <dd className="flex flex-col">
            {verFicha ? (
              <Link href={`/panel/clientes/${o.clienteId}`} className="font-semibold underline">{o.cliente}</Link>
            ) : (
              <span className="font-semibold">{o.cliente}</span>
            )}
            {!tecnico && <span className="text-tinta-suave">{formatearWhatsApp(o.telefono)}</span>}
          </dd>
          <dt className="text-tinta-suave">Técnico</dt>
          <dd>{o.tecnico ?? <span className="text-tinta-suave">Sin asignar</span>}</dd>
          <dt className="text-tinta-suave">Espacio</dt>
          <dd className="font-semibold">{o.espacio}</dd>
          <dt className="text-tinta-suave">Ingresó</dt>
          <dd className="flex flex-col">
            {o.recibidoAt && <span>{formatearFechaHora(o.recibidoAt)}</span>}
            {o.recibidoPor && <span className="text-tinta-suave">recibió {o.recibidoPor}</span>}
          </dd>
          <dt className="text-tinta-suave">Entrega</dt>
          <dd>{formatearFecha(o.fechaFin)}, aproximada</dd>
          {!tecnico && (
            <>
              <dt className="text-tinta-suave">Reserva</dt>
              <dd>
                <Link href={`/panel/agenda/${o.id}`} className="underline">Ver la reserva</Link>
              </dd>
            </>
          )}
        </dl>

        <div className="flex flex-col gap-10 lg:col-start-1 lg:row-start-1">
          <section aria-labelledby="observaciones-titulo" className="flex flex-col gap-2">
            <h2 id="observaciones-titulo" className="font-heading text-2xl font-bold italic">Cómo llegó</h2>
            {o.observacionesIngreso ? <p className="whitespace-pre-line">{o.observacionesIngreso}</p> : <p className="text-tinta-suave">Sin observaciones de ingreso.</p>}
          </section>
          {/* Con "Pagos", los servicios van con sus precios en el bloque de montos; si no, solo los nombres */}
          {!o.montos && (
            <section aria-labelledby="servicios-titulo" className="flex flex-col gap-2">
              <h2 id="servicios-titulo" className="font-heading text-2xl font-bold italic">Servicios</h2>
              <ul className="list-disc pl-5">
                {o.servicios.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </section>
          )}
          <section aria-labelledby="fotos-titulo" className="flex flex-col gap-4">
            <h2 id="fotos-titulo" className="font-heading text-2xl font-bold italic">Fotos</h2>
            <FotosOrden trabajoId={o.id} etapa="ingreso" fotos={fotosIngreso} editable={false} textoVacio="Se recibió sin fotos de ingreso." />
          </section>
          {o.montos && <MontosTrabajo trabajoId={o.id} montos={o.montos} cerrado={o.estado === "entregado"} hoy={fechaEnBolivia()} />}
        </div>
      </div>
    </>
  );
}
