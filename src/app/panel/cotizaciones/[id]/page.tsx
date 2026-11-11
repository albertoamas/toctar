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
import { ListaFilas } from "@/componentes/panel/fila-lista";
import { CabeceraSeccion, Seccion } from "@/componentes/panel/cabecera-seccion";
import { FilaCliente, FilaDato } from "@/componentes/panel/datos-en-bloques";
import { PaginaPanel } from "@/componentes/panel/pagina-panel";
import { BOTON_PASO, PasoSiguiente } from "@/componentes/panel/paso-siguiente";
import { IconoWhatsApp } from "@/componentes/sitio/iconos-marca";
import { buttonVariants } from "@/componentes/ui/button";
import { fechaEnBolivia, formatearFecha } from "@/lib/fechas";
import { puede, puedeVerModulo } from "@/lib/permisos";
import { exigirModulo } from "@/lib/sesion";
import { enlaceWhatsApp } from "@/lib/whatsapp";
import { reservasDeConsulta } from "@/modulos/agenda/consultas";
import { pasoDelTrabajo } from "@/modulos/agenda/pasos";
import { NOMBRE_ESTADO_TRABAJO, TONO_ESTADO_TRABAJO } from "@/modulos/agenda/reglas";
import { BotonAcepto, MasCotizacion } from "@/modulos/cotizaciones/componentes/estado-cotizacion";
import { VersionesCotizacion } from "@/modulos/cotizaciones/componentes/versiones-cotizacion";
import { obtenerCotizacion } from "@/modulos/cotizaciones/consultas";
import { estadoEnlace, NOMBRE_ESTADO, NOMBRE_MOTIVO, rutaEnlace, TONO_ESTADO } from "@/modulos/cotizaciones/reglas";
import { rutaTrabajo } from "@/modulos/ordenes/reglas";
import { aqui, conDesde, volverDesde } from "@/lib/volver";
import { urlSitio } from "@/lib/sitio";
import { obtenerDatosPublicos, obtenerPlantillas } from "@/modulos/configuracion/consultas";
import { mensajeCotizacion } from "@/modulos/ordenes/mensajes";

export const metadata: Metadata = { title: "Cotización" };

// Pedido 23 (P23-cotizacion-directa.md §5): una cotización con sus versiones y su PDF. Dueño o encargado con
// "Cotizaciones" (pedido 24, RN-12). Pedido 31 (P31-flujo-de-un-trabajo.md §5): arriba, los pasos del trabajo; el paso
// siguiente de una pendiente es "Aceptó"; el de una aceptada sin fecha, "Reservar en Agenda" (Cotizaciones cotiza y la
// Agenda reserva; el botón es un atajo a su formulario, solo para quien ve la Agenda). "Nueva versión", "Rechazar" y
// "Volver a pendiente" van en "Más". C6: una ficha de 1024 px; el paso siguiente, grande debajo de los pasos (como en
// Reserva y Orden, PasoSiguiente) y los datos en bloques (`datos-en-bloques.tsx`), como en la orden.
export default function PaginaCotizacion({ params, searchParams }: PageProps<"/panel/cotizaciones/[id]">) {
  return (
    <PaginaPanel tipo="ficha">
      <Suspense fallback={<Cargando volver={{ href: "/panel/cotizaciones", texto: "Cotizaciones" }} />}>
        <Detalle params={params} searchParams={searchParams} />
      </Suspense>
    </PaginaPanel>
  );
}

async function Detalle({ params, searchParams }: Pick<PageProps<"/panel/cotizaciones/[id]">, "params" | "searchParams">) {
  const usuario = await exigirModulo("cotizaciones");
  const [{ id }, parametros] = await Promise.all([params, searchParams]);
  const { creada, version, sinpdf } = parametros;
  const numero = Number(id);
  if (!Number.isInteger(numero) || numero <= 0) notFound();
  const puedeAgendar = puedeVerModulo(usuario, "agenda");
  // Las plantillas y el negocio, para "Enviar por WhatsApp" (pedido 47), junto con la cotización: están en caché
  const conEnvio = puede(usuario, "cotizar");
  const [c, reservas, plantillas, negocio] = await Promise.all([
    obtenerCotizacion(numero),
    puedeAgendar ? reservasDeConsulta(numero) : [],
    conEnvio ? obtenerPlantillas() : null,
    conEnvio ? obtenerDatosPublicos() : null,
  ]);
  if (!c) notFound();
  // Pedido 43: "Volver" a la pantalla de la que se vino; los enlaces que salen de aquí dicen que vienen de esta cotización
  const volver = volverDesde(parametros.volver, { href: "/panel/cotizaciones", texto: "Cotizaciones" }, usuario);
  const desdeAqui = aqui(`/panel/cotizaciones/${c.id}`, parametros);
  const verFicha = puedeVerModulo(usuario, "clientes");

  const vigente = c.versiones.find((v) => v.estado === "enviada") ?? null;
  const pendiente = c.estado === "cotizado";
  // La versión que se reserva: la aceptada de una sin fecha
  const aReservar = c.sinFecha ? (c.versiones.find((v) => v.estado === "aceptada") ?? null) : null;
  const activa = reservas.find((r) => r.estado !== "cancelado");
  // Sin ver la Agenda no se sabe en qué va su reserva: se queda en "Reservada"
  const pasoActual = pasoDelTrabajo({ cotizacion: c.estado, trabajo: activa?.estado ?? (c.estado === "confirmado" && !c.sinFecha ? "agendado" : null) });
  const cotiza = puede(usuario, "cotizar");
  const recienGuardada = typeof version === "string" ? c.versiones.find((v) => String(v.id) === version) : undefined;
  const sinPdf = sinpdf && !c.versiones[0].tienePdf;
  // Pedido 47: "Enviar por WhatsApp" en cada versión que se puede mandar (vale y tiene su PDF), con la plantilla de
  // Configuración > Mensajes y el enlace para el cliente
  const hoy = fechaEnBolivia();
  const rechazada = c.estado === "perdido";
  const aEnviar = cotiza ? c.versiones.filter((v) => v.tienePdf && estadoEnlace({ ...v, rechazada }, hoy) === "vale") : [];
  const enviar = new Map(
    plantillas && negocio
      ? aEnviar.map((v) => [
          v.id,
          enlaceWhatsApp(
            c.telefono,
            mensajeCotizacion({
              plantilla: plantillas.cotizacion,
              negocio: negocio.nombre,
              cliente: c.cliente,
              vehiculo: { marca: c.marca, modelo: c.modelo, placa: c.placa },
              numero: v.numero,
              enlace: `${urlSitio()}${rutaEnlace(v.enlace)}`,
            }),
          ),
        ])
      : [],
  );
  // Un solo WhatsApp a la vista (C6): con "Enviar por WhatsApp" en una versión, escribir sin el mensaje queda en "Más"
  const escribir = enlaceWhatsApp(c.telefono);

  // El paso siguiente, uno solo: en una pendiente, "Aceptó"; en una aceptada sin fecha, el atajo a la Agenda
  const paso =
    aReservar && puedeAgendar ? (
      <Link href={conDesde(`/panel/agenda/nueva?cotizacion=${aReservar.id}`, desdeAqui)} className={cn(buttonVariants({ size: "paso" }), BOTON_PASO)}>
        <CalendarIcon />
        Reservar en Agenda
      </Link>
    ) : pendiente && vigente ? (
      <BotonAcepto id={c.id} />
    ) : null;

  return (
    <>
      <EncabezadoPagina
        volver={volver}
        titulo={`Cotización ${c.numero}`}
        estado={
          <span className="flex flex-wrap gap-1.5">
            <Insignia tono={TONO_ESTADO[c.estado]}>{NOMBRE_ESTADO[c.estado]}</Insignia>
            {c.sinFecha && <Insignia tono="aviso">Sin fecha</Insignia>}
          </span>
        }
        accion={
          <div className="flex flex-wrap gap-2">
            {enviar.size === 0 && (
              <a href={escribir} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: "outline" }))}>
                <IconoWhatsApp />
                Escribir por WhatsApp
              </a>
            )}
            <MasCotizacion
              id={c.id}
              escribir={enviar.size > 0 ? escribir : null}
              nuevaVersion={pendiente && vigente && cotiza ? conDesde(`/panel/cotizaciones/${c.id}/nueva-version?desde=${vigente.id}`, desdeAqui) : null}
              cambios={pendiente ? ["rechazar"] : c.sinFecha ? ["rechazar", "reabrir"] : c.estado === "perdido" ? ["reabrir"] : []}
            />
          </div>
        }
      >
        {/* "Rechazada: Precio. Le pareció caro." */}
        {c.estado === "perdido" && c.motivoPerdida && `Rechazada: ${NOMBRE_MOTIVO[c.motivoPerdida]}.${c.detallePerdida ? ` ${c.detallePerdida}` : ""}`}
      </EncabezadoPagina>
      {pasoActual !== null && <PasosTrabajo paso={pasoActual} />}
      {paso && <PasoSiguiente>{paso}</PasoSiguiente>}
      {(creada || recienGuardada) && (
        <AvisoFlotante mensaje={`${creada ? "Cotización creada." : `Versión ${recienGuardada!.version} guardada.`}${sinPdf ? "" : " Envíasela al cliente por WhatsApp."}`} />
      )}
      {/* Lo que pide hacer algo no es temporal: queda a la vista hasta generarlo (con el PDF ya generado, se va solo) */}
      {(creada || recienGuardada) && sinPdf && (
        <p role="status" className="rounded-sm border border-aviso p-3 text-sm">
          El PDF no se pudo generar: usa «Generar PDF».
        </p>
      )}

      {/* En el celular, primero los datos (para quién es); en la computadora, el precio a la izquierda (es lo que decide)
          y los datos a la derecha (pedido 26). Título y tarjeta, a la misma distancia que en Seccion */}
      <div className="grid items-start gap-8 @4xl:grid-cols-[minmax(0,1fr)_24rem]">
        {/* Pulido 13.50, como en la orden: en bloques, el cliente como una fila que lleva a su ficha. Cuándo y quién la
            cotizó lo dice cada versión (la primera es la de cuando se registró) */}
        <Seccion id="datos" titulo="Datos" sinRelleno>
          <div role="group" aria-label="Datos de la cotización" className="flex flex-col divide-y divide-border">
            {/* El encargado puede tener Cotizaciones sin Clientes: entonces no enlaza a una ficha que no puede abrir */}
            <FilaCliente href={verFicha ? conDesde(`/panel/clientes/${c.clienteId}`, desdeAqui) : null} nombre={c.cliente} telefono={c.telefono} />
            {/* Como en Reserva y Orden, con la placa: aquí el título es el número de la cotización */}
            <dl className="px-4 py-3">
              <FilaDato etiqueta="Vehículo">
                <span className="font-semibold">{c.placa}</span>
                {c.detalle.length > 0 && <span>{c.detalle.join(" ")}</span>}
                <span className="text-sm text-tinta-suave">Tamaño: {c.tamano}</span>
              </FilaDato>
            </dl>
          </div>
        </Seccion>

        <section aria-labelledby="versiones-titulo" className="flex flex-col gap-2 @4xl:order-first">
          <CabeceraSeccion id="versiones" titulo={c.versiones.length > 1 ? "Versiones" : "Precio"} />
          <VersionesCotizacion consultaId={c.id} versiones={c.versiones} enviar={enviar} />
        </section>
      </div>

      {reservas.length > 0 && (
        <section aria-labelledby="reservas-titulo" className="flex flex-col gap-2">
          <CabeceraSeccion id="reservas" titulo="Reservas" />
          <ListaFilas
            etiqueta="Reservas"
            filas={reservas.map((r) => ({
              href: conDesde(rutaTrabajo(r.id, r.estado, puedeVerModulo(usuario, "ordenes")), desdeAqui),
              titulo: `Reserva del ${formatearFecha(r.fechaInicio).slice(0, 5)} en ${r.espacio}`,
              estado: NOMBRE_ESTADO_TRABAJO[r.estado],
              tonoEstado: TONO_ESTADO_TRABAJO[r.estado],
            }))}
          />
        </section>
      )}
    </>
  );
}
