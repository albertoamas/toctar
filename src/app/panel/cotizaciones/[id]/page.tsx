import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { cn } from "cn";
import { CalendarIcon } from "lucide-react";
import { AvisoFlotante } from "@/componentes/panel/aviso-flotante";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { Insignia } from "@/componentes/panel/insignia";
import { PasosTrabajo } from "@/componentes/panel/pasos-trabajo";
import { ENLACE_TEXTO } from "@/componentes/panel/enlace-texto";
import { ListaFilas } from "@/componentes/panel/fila-lista";
import { CabeceraSeccion } from "@/componentes/panel/seccion-con-editar";
import { IconoWhatsApp } from "@/componentes/sitio/iconos-marca";
import { buttonVariants } from "@/componentes/ui/button";
import { formatearFecha, formatearFechaHora } from "@/lib/fechas";
import { puede, puedeVerModulo } from "@/lib/permisos";
import { exigirModulo } from "@/lib/sesion";
import { enlaceWhatsApp, formatearWhatsApp } from "@/lib/whatsapp";
import { reservasDeConsulta } from "@/modulos/agenda/consultas";
import { pasoDelTrabajo } from "@/modulos/agenda/pasos";
import { NOMBRE_ESTADO_TRABAJO, TONO_ESTADO_TRABAJO } from "@/modulos/agenda/reglas";
import { DatosVehiculo } from "@/modulos/clientes/componentes/datos-vehiculo";
import { BotonAcepto, MasCotizacion } from "@/modulos/cotizaciones/componentes/estado-cotizacion";
import { VersionesCotizacion } from "@/modulos/cotizaciones/componentes/versiones-cotizacion";
import { obtenerCotizacion } from "@/modulos/cotizaciones/consultas";
import { NOMBRE_ESTADO, NOMBRE_MOTIVO, TONO_ESTADO } from "@/modulos/cotizaciones/reglas";
import { rutaTrabajo } from "@/modulos/ordenes/reglas";

export const metadata: Metadata = { title: "Cotización" };

// Pedido 23 (P23-cotizacion-directa.md §5): una cotización con sus versiones y su PDF. Dueño o encargado con
// "Cotizaciones" (pedido 24, RN-12). Pedido 31 (P31-flujo-de-un-trabajo.md §5): arriba, los pasos del trabajo; el paso
// siguiente de una pendiente es "Aceptó"; el de una aceptada sin fecha, "Reservar en Agenda" (Cotizaciones cotiza y la
// Agenda reserva; el botón es un atajo a su formulario, solo para quien ve la Agenda). "Nueva versión", "Rechazar" y
// "Volver a pendiente" van en "Más".
export default function PaginaCotizacion({ params, searchParams }: PageProps<"/panel/cotizaciones/[id]">) {
  return (
    <section className="flex flex-col gap-6">
      <Suspense fallback={<Cargando volver={{ href: "/panel/cotizaciones", texto: "Cotizaciones" }} />}>
        <Detalle params={params} searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function Detalle({ params, searchParams }: Pick<PageProps<"/panel/cotizaciones/[id]">, "params" | "searchParams">) {
  const usuario = await exigirModulo("cotizaciones");
  const [{ id }, { creada, version, sinpdf }] = await Promise.all([params, searchParams]);
  const numero = Number(id);
  if (!Number.isInteger(numero) || numero <= 0) notFound();
  const puedeAgendar = puedeVerModulo(usuario, "agenda");
  const [c, reservas] = await Promise.all([obtenerCotizacion(numero), puedeAgendar ? reservasDeConsulta(numero) : []]);
  if (!c) notFound();

  const vigente = c.versiones.find((v) => v.estado === "enviada") ?? null;
  const pendiente = c.estado === "cotizado";
  // La versión que se reserva: la aceptada de una sin fecha
  const aReservar = c.sinFecha ? (c.versiones.find((v) => v.estado === "aceptada") ?? null) : null;
  const activa = reservas.find((r) => r.estado !== "cancelado");
  // Sin ver la Agenda no se sabe en qué va su reserva: se queda en "Reservada"
  const paso = pasoDelTrabajo({ cotizacion: c.estado, trabajo: activa?.estado ?? (c.estado === "confirmado" && !c.sinFecha ? "agendado" : null) });
  const cotiza = puede(usuario, "cotizar");
  const recienGuardada = typeof version === "string" ? c.versiones.find((v) => String(v.id) === version) : undefined;
  const sinPdf = sinpdf && !c.versiones[0].tienePdf;

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <EncabezadoPagina
        volver={{ href: "/panel/cotizaciones", texto: "Cotizaciones" }}
        titulo={`Cotización ${c.numero}`}
        estado={
          <span className="flex flex-wrap gap-1.5">
            <Insignia tono={TONO_ESTADO[c.estado]}>{NOMBRE_ESTADO[c.estado]}</Insignia>
            {c.sinFecha && <Insignia tono="aviso">Sin fecha</Insignia>}
          </span>
        }
        accion={
          <div className="flex flex-wrap gap-2">
            {/* El paso siguiente, uno solo: en una pendiente, "Aceptó"; en una aceptada sin fecha, el atajo a la Agenda */}
            {aReservar && puedeAgendar && (
              <Link href={`/panel/agenda/nueva?cotizacion=${aReservar.id}`} className={cn(buttonVariants())}>
                <CalendarIcon />
                Reservar en Agenda
              </Link>
            )}
            {pendiente && vigente && <BotonAcepto id={c.id} />}
            {/* Como en las demás fichas: escribirle al cliente, al lado del paso siguiente */}
            <a href={enlaceWhatsApp(c.telefono)} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: "outline" }))}>
              <IconoWhatsApp />
              Escribir por WhatsApp
            </a>
            <MasCotizacion
              id={c.id}
              nuevaVersion={pendiente && vigente && cotiza ? `/panel/cotizaciones/${c.id}/nueva-version?desde=${vigente.id}` : null}
              cambios={pendiente ? ["rechazar"] : c.sinFecha ? ["rechazar", "reabrir"] : c.estado === "perdido" ? ["reabrir"] : []}
            />
          </div>
        }
      >
        {/* "Rechazada: Precio. Le pareció caro." */}
        {c.estado === "perdido" && c.motivoPerdida && `Rechazada: ${NOMBRE_MOTIVO[c.motivoPerdida]}.${c.detallePerdida ? ` ${c.detallePerdida}` : ""}`}
      </EncabezadoPagina>
      {paso !== null && <PasosTrabajo paso={paso} />}
      {(creada || recienGuardada) && (
        <AvisoFlotante mensaje={`${creada ? "Cotización creada." : `Versión ${recienGuardada!.version} guardada.`}${sinPdf ? "" : " Comparte el PDF con el cliente."}`} />
      )}
      {/* Lo que pide hacer algo no es temporal: queda a la vista hasta generarlo (con el PDF ya generado, se va solo) */}
      {(creada || recienGuardada) && sinPdf && (
        <p role="status" className="rounded-sm border border-aviso p-3 text-sm">
          El PDF no se pudo generar: usa «Generar PDF».
        </p>
      )}

      {/* En el celular, primero para quién es; en la computadora, el precio a la izquierda (es lo que decide) y el
          cliente a la derecha (pedido 26) */}
      <div className="grid items-start gap-6 @4xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-labelledby="cliente-titulo" className="flex flex-col gap-3">
          <CabeceraSeccion id="cliente" titulo="Cliente y vehículo" />
          <div className="tt-tarjeta-panel flex flex-col gap-3 p-4">
            <p className="flex flex-col">
              <span className="font-semibold">{c.cliente}</span>
              <span className="text-tinta-suave">{formatearWhatsApp(c.telefono)}</span>
            </p>
            <p className="flex flex-col">
              <DatosVehiculo placa={c.placa} detalle={c.detalle} tamano={c.tamano} />
            </p>
            <p className="text-sm text-tinta-suave">
              Registrada el {formatearFechaHora(c.createdAt)} por {c.registradaPor}
            </p>
            {/* El encargado puede tener Cotizaciones sin Clientes: entonces no enlaza a una ficha que no puede abrir */}
            {puedeVerModulo(usuario, "clientes") && (
              <Link href={`/panel/clientes/${c.clienteId}`} className={ENLACE_TEXTO}>
                Ver ficha del cliente
              </Link>
            )}
          </div>
        </section>

        <section aria-labelledby="versiones-titulo" className="flex flex-col gap-3 @4xl:order-first">
          <CabeceraSeccion id="versiones" titulo={c.versiones.length > 1 ? "Versiones" : "Precio"} />
          <VersionesCotizacion consultaId={c.id} versiones={c.versiones} />
        </section>
      </div>

      {reservas.length > 0 && (
        <section aria-labelledby="reservas-titulo" className="flex flex-col gap-3">
          <CabeceraSeccion id="reservas" titulo="Reservas" />
          <ListaFilas
            etiqueta="Reservas"
            filas={reservas.map((r) => ({
              href: rutaTrabajo(r.id, r.estado, puedeVerModulo(usuario, "ordenes")),
              titulo: `Reserva del ${formatearFecha(r.fechaInicio).slice(0, 5)} en ${r.espacio}`,
              estado: NOMBRE_ESTADO_TRABAJO[r.estado],
              tonoEstado: TONO_ESTADO_TRABAJO[r.estado],
            }))}
          />
        </section>
      )}
    </div>
  );
}
