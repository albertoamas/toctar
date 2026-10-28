import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment, Suspense } from "react";
import { cn } from "cn";
import { CalendarIcon, InboxIcon } from "lucide-react";
import { EnlaceVolver } from "@/componentes/enlace-volver";
import { AvisoEnPagina } from "@/componentes/panel/aviso-en-pagina";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { ListaFilas } from "@/componentes/panel/fila-lista";
import { CabeceraSeccion, SeccionConEditar } from "@/componentes/panel/seccion-con-editar";
import { IconoWhatsApp } from "@/componentes/sitio/iconos-marca";
import { buttonVariants } from "@/componentes/ui/button";
import { puedeVerModulo } from "@/lib/permisos";
import { fechaEnBolivia, formatearFecha } from "@/lib/fechas";
import { exigirModulo } from "@/lib/sesion";
import { enlaceWhatsApp, formatearWhatsApp, whatsAppLocal } from "@/lib/whatsapp";
import { reservasDelCliente } from "@/modulos/agenda/consultas";
import { NOMBRE_ESTADO_TRABAJO } from "@/modulos/agenda/reglas";
import { mostrarMonto } from "@/modulos/catalogo/reglas";
import { estaPagada, saldoPendiente } from "@/modulos/pagos/reglas";
import { MasCliente, ReactivarCliente } from "@/modulos/clientes/componentes/acceso-cliente";
import { FormularioDatosCliente } from "@/modulos/clientes/componentes/formulario-datos-cliente";
import { VehiculosCliente } from "@/modulos/clientes/componentes/vehiculos-cliente";
import { obtenerCliente } from "@/modulos/clientes/consultas";
import { obtenerParametros, tamanosActivos } from "@/modulos/configuracion/consultas";
import { ListaConsultas } from "@/modulos/consultas/componentes/lista-consultas";
import { consultasDelCliente } from "@/modulos/consultas/consultas";
import { AgregarMantenimiento, MasPlan } from "@/modulos/mantenimientos/componentes/planes";
import { mantenimientosDelCliente, serviciosConMantenimiento } from "@/modulos/mantenimientos/consultas";
import { ESTADOS_RECORDATORIO_ABIERTO, NOMBRE_ESTADO_RECORDATORIO, textoCadaMeses } from "@/modulos/mantenimientos/reglas";
import { enlaceTrabajo, rutaTrabajo } from "@/modulos/ordenes/reglas";

export const metadata: Metadata = { title: "Cliente" };

// HU-23: ficha del cliente: datos, vehículos, WhatsApp y desactivar. HU-24: sus consultas y "Nueva consulta", si quien
// entra tiene el módulo. HU-32: sus reservas, con el saldo de cada una para quien ve pagos; desde C4 son también sus
// órdenes, con su estado. HU-38: sus mantenimientos programados, para quien tiene "Mantenimientos". Pedido 21: sus planes
// (cada cuántos meses), agregar uno hecho antes del sistema y, en el menú "Más" de cada uno, editarlo o terminarlo.
// Pulido 8.3 (skill pantallas-panel): una ficha en lectura. Arriba, quién es, lo que debe y cómo escribirle (desactivar,
// en "Más"); vehículos y datos lado a lado, cada uno editado en un modal; después reservas, consultas y mantenimientos.
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
  const [c, tamanos, consultas, parametros, reservas, mantenimientos, conMantenimiento] = await Promise.all([
    obtenerCliente(numero),
    tamanosActivos(),
    verConsultas ? consultasDelCliente(numero) : [],
    obtenerParametros(),
    // Con Pagos también sin Agenda: de ahí sale lo que debe (la lista de reservas es de Agenda)
    verAgenda || verPagos ? reservasDelCliente(numero, verPagos) : [],
    verMantenimientos ? mantenimientosDelCliente(numero) : [],
    verMantenimientos ? serviciosConMantenimiento() : [],
  ]);
  if (!c) notFound();

  const debe = saldoPendiente(reservas);
  const hoy = fechaEnBolivia();
  const vehiculosActivos = c.vehiculos.filter((v) => v.activo).map((v) => ({ id: v.id, placa: v.placa }));
  const datos: [string, string | null][] = [
    ["WhatsApp", formatearWhatsApp(c.telefono)],
    ["Correo", c.correo],
    ["NIT", c.nit],
    ["Razón social", c.razonSocial],
    ["Notas", c.notas],
  ];

  return (
    <div className="flex max-w-5xl flex-col gap-8">
      <EncabezadoPagina
        titulo={c.nombre}
        estado={
          (!c.activo || debe) && (
            <span className="flex flex-wrap gap-2">
              {!c.activo && <span className="tt-insignia">Desactivado</span>}
              {/* Solo para quien ve pagos: sin el permiso, reservas no trae saldos */}
              {debe && <span className="tt-insignia tt-insignia--aviso">Debe {mostrarMonto(debe)} Bs</span>}
            </span>
          )
        }
        accion={
          <div className="flex flex-wrap gap-2">
            {!c.activo && <ReactivarCliente id={c.id} />}
            {/* Enlace con forma de botón: abre el chat (cn: sin él, el borde del contorno no se ve) */}
            <a href={enlaceWhatsApp(c.telefono)} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: "outline" }))}>
              <IconoWhatsApp />
              Escribir por WhatsApp
            </a>
            {c.activo && <MasCliente id={c.id} nombre={c.nombre} />}
          </div>
        }
      >
        {!c.activo && "No sale en la lista ni en las búsquedas."}
      </EncabezadoPagina>
      {creado && <AvisoEnPagina>Cliente {c.nombre} creado.</AvisoEnPagina>}

      {/* Lado a lado y del mismo alto en la computadora (como en el catálogo); en el celular, primero los vehículos */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 md:grid-cols-2 md:gap-4">
        <VehiculosCliente clienteId={c.id} vehiculos={c.vehiculos} tamanos={tamanos} />
        <SeccionConEditar
          id="datos"
          titulo="Datos"
          etiquetaEditar="Editar datos del cliente"
          tituloModal="Datos del cliente"
          lectura={
            // Solo lo que tiene valor: un dato vacío no ocupa una fila (se carga desde "Editar")
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2">
              {datos
                .filter(([, valor]) => valor?.trim())
                .map(([etiqueta, valor]) => (
                  <Fragment key={etiqueta}>
                    <dt className="text-tinta-suave">{etiqueta}</dt>
                    <dd className="break-words whitespace-pre-line">{valor}</dd>
                  </Fragment>
                ))}
            </dl>
          }
        >
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
        </SeccionConEditar>
      </div>

      {verAgenda && (
        <section aria-labelledby="reservas-titulo" className="flex flex-col gap-4">
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
            <ListaFilas
              etiqueta="Reservas"
              filas={reservas.map((r) => ({
                href: rutaTrabajo(r.id, r.estado, verOrdenes),
                titulo: `${formatearFecha(r.fechaInicio)} en ${r.espacio}`,
                // El saldo de una cancelada no se cobra: no se muestra
                dato: r.saldo && r.estado !== "cancelado" ? (estaPagada(r.saldo.saldo) ? "Pagado" : `Saldo: ${mostrarMonto(r.saldo.saldo)} Bs`) : null,
                detalles: [r.placa],
                estado: NOMBRE_ESTADO_TRABAJO[r.estado],
                tonoEstado: r.estado === "cancelado" ? "aviso" : undefined,
              }))}
            />
          )}
        </section>
      )}

      {verConsultas && (
        <section aria-labelledby="consultas-titulo" className="flex flex-col gap-4">
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

      {verMantenimientos && (
        <section aria-labelledby="mantenimientos-titulo" className="flex flex-col gap-4">
          <CabeceraSeccion id="mantenimientos" titulo="Mantenimientos">
            {/* Un servicio hecho antes del sistema: con un vehículo activo y algún servicio que programe mantenimiento */}
            {c.activo && vehiculosActivos.length > 0 && conMantenimiento.length > 0 && (
              <AgregarMantenimiento clienteId={c.id} vehiculos={vehiculosActivos} servicios={conMantenimiento} hoy={hoy} />
            )}
          </CabeceraSeccion>
          {mantenimientos.length === 0 ? (
            <p className="text-tinta-suave">No tiene mantenimientos programados.</p>
          ) : (
            <ul aria-label="Mantenimientos" className="flex flex-col divide-y divide-border rounded-sm border border-border">
              {mantenimientos.map((m) => {
                const ve = { ordenes: verOrdenes, agenda: verAgenda };
                // Agendado: a su reserva, o a su orden si ya se recibió; hecho: a la orden que lo hizo
                const trabajo = (m.agendado && enlaceTrabajo(m.agendado.id, m.agendado.estado, ve)) || (m.hecho && enlaceTrabajo(m.hecho.id, m.hecho.estado, ve));
                // Sin agendar y de un vehículo activo: se edita o se termina
                const editable = m.vehiculoActivo && c.activo && (ESTADOS_RECORDATORIO_ABIERTO as readonly string[]).includes(m.estado);
                return (
                  <li key={m.id} className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-1 p-3">
                    <span className="flex flex-col">
                      <span className="font-semibold">
                        {formatearFecha(m.fechaProgramada)}: Mantenimiento de {m.servicio}
                      </span>
                      <span className="text-sm text-tinta-suave">
                        {m.placa}, {textoCadaMeses(m.intervaloMeses)}
                        {!m.vehiculoActivo && ", vehículo desactivado: no se avisa"}
                      </span>
                      {m.nota && <span className="text-sm text-tinta-suave">Nota: {m.nota}</span>}
                    </span>
                    <span className="flex flex-wrap items-center gap-3">
                      {trabajo && (
                        <Link href={trabajo.href} className="inline-flex min-h-11 items-center text-sm font-semibold underline">
                          {trabajo.texto}
                        </Link>
                      )}
                      <span className="tt-insignia">{NOMBRE_ESTADO_RECORDATORIO[m.estado]}</span>
                      {editable && <MasPlan plan={{ id: m.id, intervaloMeses: m.intervaloMeses, fechaProgramada: m.fechaProgramada, servicio: m.servicio }} hoy={hoy} />}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
