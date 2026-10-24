import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { cn } from "cn";
import { CalendarIcon, InboxIcon } from "lucide-react";
import { EnlaceVolver } from "@/componentes/enlace-volver";
import { AvisoEnPagina } from "@/componentes/panel/aviso-en-pagina";
import { Cargando } from "@/componentes/panel/cargando";
import { IconoWhatsApp } from "@/componentes/sitio/iconos-marca";
import { buttonVariants } from "@/componentes/ui/button";
import { puedeVerModulo } from "@/lib/permisos";
import { formatearFecha } from "@/lib/fechas";
import { exigirModulo } from "@/lib/sesion";
import { enlaceWhatsApp, whatsAppLocal } from "@/lib/whatsapp";
import { reservasDelCliente } from "@/modulos/agenda/consultas";
import { NOMBRE_ESTADO_TRABAJO } from "@/modulos/agenda/reglas";
import { mostrarMonto } from "@/modulos/catalogo/reglas";
import { estaPagada } from "@/modulos/pagos/reglas";
import { AccesoCliente } from "@/modulos/clientes/componentes/acceso-cliente";
import { FormularioDatosCliente } from "@/modulos/clientes/componentes/formulario-datos-cliente";
import { VehiculosCliente } from "@/modulos/clientes/componentes/vehiculos-cliente";
import { obtenerCliente } from "@/modulos/clientes/consultas";
import { obtenerParametros, tamanosActivos } from "@/modulos/configuracion/consultas";
import { ListaConsultas } from "@/modulos/consultas/componentes/lista-consultas";
import { consultasDelCliente } from "@/modulos/consultas/consultas";
import { mantenimientosDelCliente } from "@/modulos/mantenimientos/consultas";
import { NOMBRE_ESTADO_RECORDATORIO } from "@/modulos/mantenimientos/reglas";
import { enlaceTrabajo, rutaTrabajo } from "@/modulos/ordenes/reglas";

export const metadata: Metadata = { title: "Cliente" };

// HU-23: ficha del cliente: datos, vehículos, WhatsApp y desactivar. HU-24: sus consultas y "Nueva consulta", si quien
// entra tiene el módulo. HU-32: sus reservas, con el saldo de cada una para quien ve pagos; desde C4 son también sus
// órdenes, con su estado. HU-38: sus mantenimientos programados, para quien tiene "Mantenimientos".
export default function PaginaCliente({ params, searchParams }: PageProps<"/panel/clientes/[id]">) {
  return (
    <section className="flex flex-col gap-6">
      <EnlaceVolver href="/panel/clientes">Clientes</EnlaceVolver>
      <Suspense fallback={<Cargando />}>
        <Ficha params={params} searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function Ficha({ params, searchParams }: Pick<PageProps<"/panel/clientes/[id]">, "params" | "searchParams">) {
  const usuario = await exigirModulo("clientes");
  const [{ id }, { creado }] = await Promise.all([params, searchParams]);
  const numero = Number(id);
  if (!Number.isInteger(numero) || numero <= 0) notFound();
  const verConsultas = puedeVerModulo(usuario, "consultas");
  const verAgenda = puedeVerModulo(usuario, "agenda");
  const verPagos = puedeVerModulo(usuario, "pagos");
  const verMantenimientos = puedeVerModulo(usuario, "mantenimientos");
  // Una reserva ya recibida se abre en su orden, si quien mira ve órdenes
  const verOrdenes = puedeVerModulo(usuario, "ordenes");
  const [c, tamanos, consultas, parametros, reservas, mantenimientos] = await Promise.all([
    obtenerCliente(numero),
    tamanosActivos(),
    verConsultas ? consultasDelCliente(numero) : [],
    obtenerParametros(),
    verAgenda ? reservasDelCliente(numero, verPagos) : [],
    verMantenimientos ? mantenimientosDelCliente(numero) : [],
  ]);
  if (!c) notFound();

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-4">
        <h1 className="font-heading text-4xl font-extrabold italic">{c.nombre}</h1>
        {!c.activo && <span className="tt-insignia">Desactivado</span>}
        {/* Enlace con forma de botón: abre el chat (cn: sin él, el borde del contorno no se ve) */}
        <a href={enlaceWhatsApp(c.telefono)} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: "outline" }), "sm:ml-auto")}>
          <IconoWhatsApp />
          Escribir por WhatsApp
        </a>
      </div>
      {creado && <AvisoEnPagina>Cliente {c.nombre} creado.</AvisoEnPagina>}

      {/* En el celular, primero los vehículos (lo que más se consulta en el taller), después los datos y al final
          desactivar; en la computadora, los datos a la izquierda */}
      <div className="grid max-w-5xl gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:grid-rows-[auto_1fr] lg:items-start">
        <div className="lg:col-start-2 lg:row-start-1">
          <VehiculosCliente clienteId={c.id} vehiculos={c.vehiculos} tamanos={tamanos} />
        </div>
        <div className="lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <FormularioDatosCliente
            id={c.id}
            iniciales={{
              nombre: c.nombre,
              telefono: whatsAppLocal(c.telefono),
              correo: c.correo ?? "",
              nit: c.nit ?? "",
              razonSocial: c.razonSocial ?? "",
              notas: c.notas ?? "",
            }}
          />
        </div>
        <div className="lg:col-start-2 lg:row-start-2">
          <AccesoCliente id={c.id} nombre={c.nombre} activo={c.activo} />
        </div>
      </div>

      {verConsultas && (
        <section aria-labelledby="consultas-titulo" className="flex max-w-5xl flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 id="consultas-titulo" className="font-heading text-2xl font-bold italic">Consultas</h2>
            {/* Un cliente desactivado no consulta: se reactiva primero */}
            {c.activo && (
              <Link href={`/panel/consultas/nueva?cliente=${c.id}`} className={cn(buttonVariants({ variant: "outline" }))}>
                <InboxIcon />
                Nueva consulta
              </Link>
            )}
          </div>
          {consultas.length > 0 ? <ListaConsultas consultas={consultas} umbral={parametros.dias_consulta_fria} sinCliente /> : <p className="text-tinta-suave">Todavía no tiene consultas.</p>}
        </section>
      )}

      {verAgenda && (
        <section aria-labelledby="reservas-titulo" className="flex max-w-5xl flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 id="reservas-titulo" className="font-heading text-2xl font-bold italic">Reservas</h2>
            {/* La reserva directa lleva precios: la arma quien ve pagos (las demás salen de una consulta) */}
            {c.activo && verPagos && (
              <Link href={`/panel/agenda/nueva?cliente=${c.id}`} className={cn(buttonVariants({ variant: "outline" }))}>
                <CalendarIcon />
                Nueva reserva
              </Link>
            )}
          </div>
          {reservas.length === 0 ? (
            <p className="text-tinta-suave">Todavía no tiene reservas.</p>
          ) : (
            <ul aria-label="Reservas" className="flex flex-col divide-y divide-border rounded-sm border border-border">
              {reservas.map((r) => (
                <li key={r.id}>
                  <Link href={rutaTrabajo(r.id, r.estado, verOrdenes)} className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-1 p-3 hover:bg-superficie">
                    <span className="flex flex-col">
                      <span className="font-semibold">
                        {formatearFecha(r.fechaInicio)} en {r.espacio}
                      </span>
                      <span className="text-sm text-tinta-suave">{r.placa}</span>
                    </span>
                    <span className="flex flex-wrap items-center gap-3">
                      {/* El saldo de una cancelada no se cobra: no se muestra */}
                      {r.saldo && r.estado !== "cancelado" && (
                        <span className={cn("tabular-nums", estaPagada(r.saldo.saldo) ? "text-exito" : "font-semibold")}>
                          {estaPagada(r.saldo.saldo) ? "Pagado" : `Saldo: ${mostrarMonto(r.saldo.saldo)} Bs`}
                        </span>
                      )}
                      <span className={cn("tt-insignia", r.estado === "cancelado" && "tt-insignia--aviso")}>{NOMBRE_ESTADO_TRABAJO[r.estado]}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {verMantenimientos && (
        <section aria-labelledby="mantenimientos-titulo" className="flex max-w-5xl flex-col gap-4">
          <h2 id="mantenimientos-titulo" className="font-heading text-2xl font-bold italic">Mantenimientos</h2>
          {mantenimientos.length === 0 ? (
            <p className="text-tinta-suave">No tiene mantenimientos programados.</p>
          ) : (
            <ul aria-label="Mantenimientos" className="flex flex-col divide-y divide-border rounded-sm border border-border">
              {mantenimientos.map((m) => {
                // Agendado: a su reserva, o a su orden si ya se recibió, si quien mira puede abrirla
                const agendado = m.agendado && enlaceTrabajo(m.agendado.id, m.agendado.estado, { ordenes: verOrdenes, agenda: verAgenda });
                return (
                  <li key={m.id} className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-1 p-3">
                    <span className="flex flex-col">
                      <span className="font-semibold">
                        {formatearFecha(m.fechaProgramada)}: {m.servicio}
                      </span>
                      <span className="text-sm text-tinta-suave">
                        {m.placa}
                        {!m.vehiculoActivo && ", vehículo desactivado: no se avisa"}
                      </span>
                    </span>
                    <span className="flex flex-wrap items-center gap-3">
                      {agendado && (
                        <Link href={agendado.href} className="inline-flex min-h-11 items-center text-sm font-semibold underline">
                          {agendado.texto}
                        </Link>
                      )}
                      <span className="tt-insignia">{NOMBRE_ESTADO_RECORDATORIO[m.estado]}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </>
  );
}
