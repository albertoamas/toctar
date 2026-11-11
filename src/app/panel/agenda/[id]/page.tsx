import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { cn } from "cn";
import { ClipboardCheckIcon } from "lucide-react";
import { AvisoFlotante } from "@/componentes/panel/aviso-flotante";
import { Seccion } from "@/componentes/panel/cabecera-seccion";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { Insignia } from "@/componentes/panel/insignia";
import { FilaCliente, FilaCotizacion, FilaDato } from "@/componentes/panel/datos-en-bloques";
import { PaginaPanel, PartesIguales } from "@/componentes/panel/pagina-panel";
import { BOTON_PASO, PasoSiguiente } from "@/componentes/panel/paso-siguiente";
import { PasosTrabajo } from "@/componentes/panel/pasos-trabajo";
import { IconoWhatsApp } from "@/componentes/sitio/iconos-marca";
import { buttonVariants } from "@/componentes/ui/button";
import { fechaConDia, fechaEnBolivia, formatearFecha, formatearFechaHora } from "@/lib/fechas";
import { puede, puedeVerModulo } from "@/lib/permisos";
import { exigirModulo } from "@/lib/sesion";
import { enlaceWhatsApp } from "@/lib/whatsapp";
import { MasReserva } from "@/modulos/agenda/componentes/acciones-reserva";
import { obtenerReserva } from "@/modulos/agenda/consultas";
import { pasoDelTrabajo } from "@/modulos/agenda/pasos";
import { NOMBRE_ESTADO_TRABAJO, TONO_ESTADO_TRABAJO } from "@/modulos/agenda/reglas";
import { detalleVehiculo } from "@/modulos/clientes/reglas";
import { esOrden, puedeRecibirse } from "@/modulos/ordenes/reglas";
import { MontosTrabajo } from "@/modulos/pagos/componentes/montos-trabajo";
import { valorVehiculo } from "@/modulos/clientes/componentes/datos-vehiculo";
import { aqui, conDesde, sinElTrabajo, volverDesde } from "@/lib/volver";

export const metadata: Metadata = { title: "Reserva" };

// HU-30: una reserva. Con "Pagos" (o el dueño), sus servicios, el total, lo pagado y el saldo. HU-31: reprogramarla o
// cancelarla mientras está agendada. HU-32: registrar y anular pagos, con el comprobante; una cancelada, sin acciones.
// HU-33: desde su día de ingreso, "Recibir vehículo" (con "Órdenes"). Recibida, es una orden: quien ve las órdenes va a
// ella (una pantalla por trabajo, pulido 13.52); quien no, sigue viendo la reserva para cobrar.
// Pulido 10.3 (skill pantallas-panel): el paso siguiente en el encabezado (recibir), reprogramar y cancelar en "Más" con
// sus modales, y "Registrar pago" sin fondo en la cabecera de Pagos.
// C6 (sistema-del-panel.md §2, "Principal y datos"): los montos en la columna ancha; los datos y la nota, cada uno con su
// título arriba de su tarjeta, en la angosta. Sin Pagos no hay montos: los datos toman el lugar y no queda un hueco.
export default function PaginaReserva({ params, searchParams }: PageProps<"/panel/agenda/[id]">) {
  return (
    <PaginaPanel tipo="ficha">
      <Suspense fallback={<Cargando volver={{ href: "/panel/agenda", texto: "Agenda" }} />}>
        <Detalle params={params} searchParams={searchParams} />
      </Suspense>
    </PaginaPanel>
  );
}

async function Detalle({ params, searchParams }: Pick<PageProps<"/panel/agenda/[id]">, "params" | "searchParams">) {
  const usuario = await exigirModulo("agenda");
  const [{ id }, parametros] = await Promise.all([params, searchParams]);
  const { agendada } = parametros;
  if (!/^\d+$/.test(id)) notFound();
  const conPagos = puedeVerModulo(usuario, "pagos");
  const r = await obtenerReserva(Number(id), conPagos);
  if (!r) notFound();
  const verFicha = puedeVerModulo(usuario, "clientes");
  const verCotizacion = puedeVerModulo(usuario, "cotizaciones");
  const unDia = r.fechaInicio === r.fechaFin;
  const hoy = fechaEnBolivia();
  const cancelada = r.estado === "cancelado";
  const verOrdenes = puedeVerModulo(usuario, "ordenes");
  const orden = esOrden(r.estado);
  // Pedido 43: "Volver" a la pantalla de la que se vino; los enlaces que salen de aquí dicen que vienen de esta reserva
  const volver = volverDesde(parametros.volver, { href: "/panel/agenda", texto: "Agenda" }, usuario);
  const desdeAqui = aqui(`/panel/agenda/${r.id}`, parametros);

  const detalle = detalleVehiculo(r);
  // Una pantalla por trabajo: recibido, quien ve las órdenes trabaja en la orden (lo que solo tenía la reserva, también
  // está ahí). Quien no las ve (agenda y cobra) sigue aquí, para ver su saldo y cobrarlo
  if (orden && verOrdenes) redirect(conDesde(`/panel/ordenes/${r.id}`, sinElTrabajo(String(parametros.volver ?? ""), r.id)));
  // El paso siguiente, uno solo, en el encabezado: recibir el vehículo desde su día de ingreso. Reprogramar y cancelar, en
  // "Más", mientras siga agendada
  const principal = puede(usuario, "recibir_vehiculo") && puedeRecibirse(r, hoy) && (
    // Enlace con forma de botón: lleva a la recepción, con el checklist
    <Link href={conDesde(`/panel/ordenes/${r.id}/recibir`, desdeAqui)} className={cn(buttonVariants({ size: "paso" }), BOTON_PASO)}>
      <ClipboardCheckIcon />
      Recibir vehículo
    </Link>
  );

  // Pulido 13.51, como en la orden y la cotización: en bloques, de lo que se mira primero (cuándo y dónde) al cliente, una
  // fila que lleva a su ficha, y el vehículo; al pie y en chico, cuándo y quién la reservó (una reserva no tiene historial)
  // y su cotización como otra fila
  // Sin Cotizaciones, ni se nombra la cotización
  const cotizacion = verCotizacion && r.consultaId !== null ? r.cotizacion : null;
  const datos = (
    <Seccion id="datos" titulo="Datos" sinRelleno>
      <div role="group" aria-label="Datos de la reserva" className="flex flex-col divide-y divide-border">
        <dl className="flex flex-col gap-2 px-4 py-3">
          <FilaDato etiqueta="Ingresa">
            <span className="font-semibold">{formatearFecha(r.fechaInicio)}</span>
            {r.horaIngreso && <span className="text-sm text-tinta-suave">{r.horaIngreso}</span>}
          </FilaDato>
          {/* Entregada, la entrega aproximada ya no sirve (como en la orden) */}
          {r.estado !== "entregado" && (
            <FilaDato etiqueta="Entrega">
              {unDia ? (
                <span className="font-semibold">El mismo día</span>
              ) : (
                <>
                  <span className="font-semibold">{formatearFecha(r.fechaFin)}</span>
                  <span className="text-sm text-tinta-suave">aproximada</span>
                </>
              )}
            </FilaDato>
          )}
          <FilaDato etiqueta="Espacio">
            <span className="font-semibold">{r.espacio}</span>
          </FilaDato>
        </dl>
        <FilaCliente href={verFicha ? conDesde(`/panel/clientes/${r.clienteId}`, desdeAqui) : null} nombre={r.cliente} telefono={r.telefono} />
        {/* La placa ya está en el título: el vehículo dice su modelo y su tamaño */}
        <dl className="px-4 py-3">
          <FilaDato etiqueta="Vehículo">{valorVehiculo(detalle, r.tamano)}</FilaDato>
        </dl>
        <p className="px-4 py-3 text-sm text-tinta-suave">
          Reservada por {r.agendadaPor} el {formatearFechaHora(r.createdAt)}
        </p>
        {cotizacion && <FilaCotizacion href={conDesde(`/panel/cotizaciones/${r.consultaId}`, desdeAqui)} numero={cotizacion.numero} version={cotizacion.version} />}
      </div>
    </Seccion>
  );
  const nota = r.nota && (
    <Seccion id="nota" titulo="Nota">
      <p className="whitespace-pre-line">{r.nota}</p>
    </Seccion>
  );

  return (
    <>
      <EncabezadoPagina
        volver={volver}
        titulo={r.placa}
        estado={<Insignia tono={TONO_ESTADO_TRABAJO[r.estado]}>{NOMBRE_ESTADO_TRABAJO[r.estado]}</Insignia>}
        accion={
          <div className="flex flex-wrap gap-2">
            <a href={enlaceWhatsApp(r.telefono)} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: "outline" }))}>
              <IconoWhatsApp />
              Escribir por WhatsApp
            </a>
            {r.estado === "agendado" && (
              <MasReserva id={r.id} fechaInicio={r.fechaInicio} fechaFin={r.fechaFin} espacioId={r.espacioId} hoy={hoy} pagado={r.montos?.saldo.pagado ?? null} />
            )}
          </div>
        }
      >
        {cancelada && r.motivoCancelacion ? `Cancelada: ${r.motivoCancelacion}` : orden && !verOrdenes ? "Ya se recibió: es una orden del taller." : null}
      </EncabezadoPagina>
      {/* Los pasos del trabajo (pedido 31): una reserva sin cotización empieza en "Reservada"; una cancelada no avanza */}
      {!cancelada && <PasosTrabajo paso={pasoDelTrabajo({ trabajo: r.estado }) ?? 0} conCotizacion={r.consultaId !== null} />}
      {/* El paso siguiente, grande debajo del encabezado (§3): recibir el vehículo */}
      {principal && <PasoSiguiente>{principal}</PasoSiguiente>}
      {/* Solo mientras siga agendada: tras cancelarla (o en un enlace viejo) ya no corresponde */}
      {agendada && r.estado === "agendado" && (
        <AvisoFlotante mensaje={`Reservada para el ${fechaConDia(r.fechaInicio).toLowerCase()} en el ${r.espacio}.`} />
      )}

      {r.montos ? (
        // Principal y datos (§2), según el ancho del área de trabajo como Cotización. En el celular, primero cuándo, dónde y
        // quién: es lo que el taller mira al abrir una reserva; los montos los ve solo quien tiene Pagos
        <div className="grid items-start gap-8 @4xl:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="flex flex-col gap-8 @4xl:col-start-2 @4xl:row-start-1">
            {datos}
            {nota}
          </div>
          <div className="flex flex-col gap-8 @4xl:col-start-1 @4xl:row-start-1">
            {/* Solo una cancelada queda sin acciones: una entregada con saldo se sigue cobrando (RN-13) */}
            <MontosTrabajo trabajoId={r.id} montos={r.montos} cerrado={cancelada} hoy={hoy} />
          </div>
        </div>
      ) : (
        // Sin Pagos: los datos y la nota de a dos, sin una tarjeta de 1000 px ni un hueco al lado
        <PartesIguales>
          {datos}
          {nota}
        </PartesIguales>
      )}
    </>
  );
}
