import type { Metadata } from "next";
import { Alerta } from "@/componentes/panel/alerta";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { cn } from "cn";
import { CalendarIcon, FileTextIcon } from "lucide-react";
import { AvisoFlotante } from "@/componentes/panel/aviso-flotante";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { TextoAccion } from "@/componentes/panel/texto-accion";
import { ListaDatos } from "@/componentes/panel/lista-datos";
import { SeccionConEditar } from "@/componentes/panel/seccion-con-editar";
import { IconoWhatsApp } from "@/componentes/sitio/iconos-marca";
import { buttonVariants } from "@/componentes/ui/button";
import { puede, puedeVerModulo } from "@/lib/permisos";
import { fechaEnBolivia } from "@/lib/fechas";
import { exigirModulo } from "@/lib/sesion";
import { enlaceWhatsApp, formatearWhatsApp, whatsAppLocal } from "@/lib/whatsapp";
import { reservasDelCliente } from "@/modulos/agenda/consultas/listas";
import { mostrarMonto } from "@/modulos/catalogo/reglas";
import { saldoPendiente } from "@/modulos/pagos/reglas";
import { MasCliente, ReactivarCliente } from "@/modulos/clientes/componentes/acceso-cliente";
import { FormularioDatosCliente } from "@/modulos/clientes/componentes/formulario-datos-cliente";
import { VehiculosCliente } from "@/modulos/clientes/componentes/vehiculos-cliente";
import { catalogoVehiculos, obtenerCliente } from "@/modulos/clientes/consultas";
import { obtenerParametros, tamanosActivos } from "@/modulos/configuracion/consultas";
import { cotizacionesDelCliente } from "@/modulos/cotizaciones/consultas/lista";
import { mantenimientosDelCliente } from "@/modulos/mantenimientos/consultas";
import { Insignia } from "@/componentes/panel/insignia";
import { PaginaPanel } from "@/componentes/panel/pagina-panel";
import { aqui, conDesde, volverDesde } from "@/lib/volver";
import { resumenDeVehiculo } from "@/modulos/clientes/resumen-vehiculos";

export const metadata: Metadata = { title: "Cliente" };

// HU-23: ficha del cliente: datos, vehículos, WhatsApp y desactivar. Pedido 23: sus cotizaciones y "Nueva cotización",
// si quien entra tiene el módulo. HU-32: sus reservas, con el saldo de cada una para quien ve pagos; desde C4 son también sus
// órdenes, con su estado. HU-38: sus mantenimientos programados, para quien tiene "Mantenimientos". Pedido 21: sus planes
// (cada cuántos meses), agregar uno hecho antes del sistema y, en el menú "Más" de cada uno, editarlo o terminarlo.
// 26/11 (recorrido visual): la persona y sus autos; la historia y los mantenimientos, en la ficha de cada vehículo.
// Pulido 8.3 (skill pantallas-panel): una ficha en lectura. Arriba, quién es, lo que debe y cómo escribirle (desactivar,
// en "Más"); vehículos y datos lado a lado, cada uno editado en un modal; después reservas, cotizaciones y mantenimientos.
export default function PaginaCliente({ params, searchParams }: PageProps<"/panel/clientes/[id]">) {
  return (
    <PaginaPanel tipo="ficha">
      <Suspense fallback={<Cargando volver={{ href: "/panel/clientes", texto: "Clientes" }} />}>
        <Ficha params={params} searchParams={searchParams} />
      </Suspense>
    </PaginaPanel>
  );
}

async function Ficha({ params, searchParams }: Pick<PageProps<"/panel/clientes/[id]">, "params" | "searchParams">) {
  const usuario = await exigirModulo("clientes");
  const [{ id }, busqueda] = await Promise.all([params, searchParams]);
  const { creado, recibido } = busqueda;
  const numero = Number(id);
  if (!Number.isInteger(numero) || numero <= 0) notFound();
  const verCotizaciones = puedeVerModulo(usuario, "cotizaciones");
  // Con "Cotizaciones" se cotiza (pedido 24): la acción es aparte por si algún día no van juntas
  const cotiza = puede(usuario, "cotizar");
  const verAgenda = puedeVerModulo(usuario, "agenda");
  const verPagos = puedeVerModulo(usuario, "pagos");
  const verMantenimientos = puedeVerModulo(usuario, "mantenimientos");
  const [c, tamanos, catalogo, cotizaciones, parametros, reservas, mantenimientos] = await Promise.all([
    obtenerCliente(numero),
    tamanosActivos(),
    catalogoVehiculos(),
    verCotizaciones ? cotizacionesDelCliente(numero) : [],
    obtenerParametros(),
    // Con Pagos también sin Agenda: de ahí sale lo que debe (la lista de reservas es de Agenda)
    verAgenda || verPagos ? reservasDelCliente(numero, verPagos) : [],
    verMantenimientos ? mantenimientosDelCliente(numero) : [],
  ]);
  if (!c) notFound();
  // Pedido 43: "Volver" a la pantalla de la que se vino; los enlaces que salen de aquí dicen que vienen de este cliente
  const volver = volverDesde(busqueda.volver, { href: "/panel/clientes", texto: "Clientes" }, usuario);
  const desdeAqui = aqui(`/panel/clientes/${c.id}`, busqueda);

  const debe = saldoPendiente(reservas);
  // Cada vehículo con su último trabajo, su próximo mantenimiento y lo que pide atención (26/11): la historia y los
  // mantenimientos viven en la ficha de cada vehículo. Cada parte, solo para quien ve su módulo
  const hoy = fechaEnBolivia();
  const resumen = Object.fromEntries(
    c.vehiculos.map((v) => [
      v.id,
      resumenDeVehiculo(v.placa, {
        reservas: verAgenda ? reservas : null,
        mantenimientos: verMantenimientos ? mantenimientos : null,
        cotizaciones: verCotizaciones ? cotizaciones : null,
        umbral: parametros.dias_cotizacion_sin_respuesta,
        hoy,
      }),
    ]),
  );
  // Sin el WhatsApp (26/11): ya está debajo del nombre y en "Escribir por WhatsApp" (se edita en "Editar")
  const datos: [string, string | null][] = [
    ["Correo", c.correo],
    ["NIT", c.nit],
    ["Razón social", c.razonSocial],
    ["Notas", c.notas],
  ];
  const conValores = datos.filter(([, valor]) => valor?.trim());

  return (
    <>
      <EncabezadoPagina
        volver={volver}
        titulo={c.nombre}
        // Su WhatsApp debajo del nombre (C7, 18/11), con el botón para escribirle al lado (26/11, como en la reserva: el
        // encabezado queda para cotizar y reservar)
        subtitulo={
          <span className="inline-flex items-center gap-1.5">
            <span className="tabular-nums">{formatearWhatsApp(c.telefono)}</span>
            <a
              href={enlaceWhatsApp(c.telefono)}
              target="_blank"
              rel="noreferrer"
              aria-label={`Escribir por WhatsApp a ${c.nombre}`}
              title="Escribir por WhatsApp"
              className={cn(buttonVariants({ variant: "accion", size: "icon-sm" }), "text-tinta")}
            >
              <IconoWhatsApp />
            </a>
          </span>
        }
        estado={
          (!c.activo || debe) && (
            <span className="flex flex-wrap gap-2">
              {!c.activo && <Insignia>Desactivado</Insignia>}
              {/* Solo para quien ve pagos: sin el permiso, reservas no trae saldos */}
              {debe && <Alerta tipo="dinero">Debe {mostrarMonto(debe)} Bs</Alerta>}
            </span>
          )
        }
        // Cotizar y reservar en el encabezado (26/11, como la ficha del vehículo): cotizar en rojo, que es donde empieza un
        // trabajo (el menú va Cotizaciones, Agenda, Taller); la mayoría de las reservas salen de una cotización
        accion={
          <div className="flex flex-wrap gap-2">
            {!c.activo && <ReactivarCliente id={c.id} />}
            {/* A un cliente desactivado no se le cotiza: se reactiva primero */}
            {c.activo && cotiza && (
              <Link href={conDesde(`/panel/cotizaciones/nueva?cliente=${c.id}`, desdeAqui)} className={cn(buttonVariants())}>
                <FileTextIcon />
                <TextoAccion corto="Cotizar">Nueva cotización</TextoAccion>
              </Link>
            )}
            {/* La reserva directa lleva precios: la arma quien ve pagos (las demás salen de una cotización) */}
            {verAgenda && c.activo && verPagos && (
              <Link href={conDesde(`/panel/agenda/nueva?cliente=${c.id}`, desdeAqui)} className={cn(buttonVariants({ variant: "outline" }))}>
                <CalendarIcon />
                <TextoAccion corto="Reservar">Nueva reserva</TextoAccion>
              </Link>
            )}
            {c.activo && <MasCliente id={c.id} nombre={c.nombre} />}
          </div>
        }
      >
        {!c.activo && "No sale en la lista ni en las búsquedas."}
      </EncabezadoPagina>
      {creado && <AvisoFlotante mensaje={`Cliente ${c.nombre} creado.`} />}
      {/* Pedido 37: un vehículo que pasó a este cliente, solo si de verdad es suyo */}
      {typeof recibido === "string" && c.vehiculos.some((v) => v.activo && v.placa === recibido) && (
        <AvisoFlotante mensaje={`${recibido} ahora es de ${c.nombre}, con su plan de mantenimiento.`} />
      )}

      {/* La persona y sus autos (26/11, recorrido visual): los vehículos, con lo de cada uno, y al costado sus datos. La
          historia y los mantenimientos, en la ficha de cada vehículo (antes, repetidos aquí y allá) */}
      <div className="grid items-start gap-8 gap-x-4 @4xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <VehiculosCliente clienteId={c.id} vehiculos={c.vehiculos} tamanos={tamanos} catalogo={catalogo} desde={desdeAqui} resumen={resumen} />
        <SeccionConEditar
          id="datos"
          titulo="Datos"
          etiquetaEditar="Editar datos del cliente"
          tituloModal="Datos del cliente"
          lectura={
            // Solo lo que tiene valor: un dato vacío no ocupa una fila (se carga desde "Editar")
            conValores.length === 0 ? (
              <p className="text-tinta-suave">Sin correo, NIT ni notas.</p>
            ) : (
              // La lista de datos de todo el panel (26/11; antes, una armada aquí, sin las líneas entre dato y dato)
              <ListaDatos nombre="Datos del cliente" filas={conValores.map(([etiqueta, valor]) => [etiqueta, <span key={etiqueta} className="whitespace-pre-line">{valor}</span>])} />
            )
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
    </>
  );
}
