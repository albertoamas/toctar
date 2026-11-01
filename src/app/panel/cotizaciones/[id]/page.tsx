import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { cn } from "cn";
import { CalendarIcon } from "lucide-react";
import { EnlaceVolver } from "@/componentes/enlace-volver";
import { AvisoEnPagina } from "@/componentes/panel/aviso-en-pagina";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
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
import { NOMBRE_ESTADO_TRABAJO } from "@/modulos/agenda/reglas";
import { DatosVehiculo } from "@/modulos/clientes/componentes/datos-vehiculo";
import { MasCotizacion } from "@/modulos/cotizaciones/componentes/estado-cotizacion";
import { VersionesCotizacion } from "@/modulos/cotizaciones/componentes/versiones-cotizacion";
import { obtenerCotizacion } from "@/modulos/cotizaciones/consultas";
import { NOMBRE_ESTADO, NOMBRE_MOTIVO, TONO_ESTADO } from "@/modulos/cotizaciones/reglas";
import { rutaTrabajo } from "@/modulos/ordenes/reglas";

export const metadata: Metadata = { title: "Cotización" };

// Pedido 23 (P23-cotizacion-directa.md §5): una cotización con sus versiones y su PDF. El paso siguiente de una
// pendiente es "Agendar" (el cliente aceptó: queda aceptada, RF-36); "Nueva versión", "Rechazar" y "Volver a pendiente"
// van en "Más". Dueño o encargado con "Cotizaciones" (pedido 24); el técnico nunca (RN-12).
export default function PaginaCotizacion({ params, searchParams }: PageProps<"/panel/cotizaciones/[id]">) {
  return (
    <section className="flex flex-col gap-6">
      <EnlaceVolver href="/panel/cotizaciones">Cotizaciones</EnlaceVolver>
      <Suspense fallback={<Cargando />}>
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
  const cotiza = puede(usuario, "cotizar");
  const recienGuardada = typeof version === "string" ? c.versiones.find((v) => String(v.id) === version) : undefined;
  const sinPdf = sinpdf && !c.versiones[0].tienePdf;

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <EncabezadoPagina
        titulo={`Cotización ${c.numero}`}
        estado={<span className={cn("tt-insignia", TONO_ESTADO[c.estado] && `tt-insignia--${TONO_ESTADO[c.estado]}`)}>{NOMBRE_ESTADO[c.estado]}</span>}
        accion={
          <div className="flex flex-wrap gap-2">
            {/* El paso siguiente, uno solo: agendar la pendiente (el cliente aceptó) */}
            {pendiente && vigente && puedeAgendar && (
              <Link href={`/panel/agenda/nueva?cotizacion=${vigente.id}`} className={cn(buttonVariants())}>
                <CalendarIcon />
                Agendar
              </Link>
            )}
            <MasCotizacion
              id={c.id}
              nuevaVersion={pendiente && vigente && cotiza ? `/panel/cotizaciones/${c.id}/nueva-version?desde=${vigente.id}` : null}
              cambio={pendiente ? "rechazar" : c.estado === "perdido" ? "reabrir" : null}
            />
          </div>
        }
      >
        {/* "Rechazada: Precio. Le pareció caro." */}
        {c.estado === "perdido" && c.motivoPerdida && `Rechazada: ${NOMBRE_MOTIVO[c.motivoPerdida]}.${c.detallePerdida ? ` ${c.detallePerdida}` : ""}`}
      </EncabezadoPagina>
      {(creada || recienGuardada) && (
        <AvisoEnPagina>
          {creada ? "Cotización creada." : `Versión ${recienGuardada!.version} guardada.`}
          {/* Con el PDF ya generado (por «Generar PDF»), el aviso deja de tener sentido aunque siga en la dirección */}
          {sinPdf ? " El PDF no se pudo generar: usa «Generar PDF»." : " Comparte el PDF con el cliente."}
        </AvisoEnPagina>
      )}

      <section aria-labelledby="cliente-titulo" className="flex flex-col gap-3">
        <CabeceraSeccion id="cliente" titulo="Cliente y vehículo" />
        <div className="flex flex-col gap-3 rounded-sm border border-border p-4">
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
          <div className="flex flex-wrap gap-x-6">
            <a href={enlaceWhatsApp(c.telefono)} target="_blank" rel="noreferrer" className={cn(ENLACE_TEXTO, "gap-2")}>
              <IconoWhatsApp />
              Escribir por WhatsApp
            </a>
            {/* El encargado puede tener Cotizaciones sin Clientes: entonces no enlaza a una ficha que no puede abrir */}
            {puedeVerModulo(usuario, "clientes") && (
              <Link href={`/panel/clientes/${c.clienteId}`} className={ENLACE_TEXTO}>
                Ver ficha del cliente
              </Link>
            )}
          </div>
        </div>
      </section>

      <section aria-labelledby="versiones-titulo" className="flex flex-col gap-3">
        <CabeceraSeccion id="versiones" titulo={c.versiones.length > 1 ? "Versiones" : "Precio"} />
        <VersionesCotizacion consultaId={c.id} versiones={c.versiones} />
      </section>

      {reservas.length > 0 && (
        <section aria-labelledby="reservas-titulo" className="flex flex-col gap-3">
          <CabeceraSeccion id="reservas" titulo="Reservas" />
          <ListaFilas
            etiqueta="Reservas"
            filas={reservas.map((r) => ({
              href: rutaTrabajo(r.id, r.estado, puedeVerModulo(usuario, "ordenes")),
              titulo: `Reserva del ${formatearFecha(r.fechaInicio).slice(0, 5)} en ${r.espacio}`,
              estado: NOMBRE_ESTADO_TRABAJO[r.estado],
              tonoEstado: r.estado === "cancelado" ? "aviso" : undefined,
            }))}
          />
        </section>
      )}
    </div>
  );
}
