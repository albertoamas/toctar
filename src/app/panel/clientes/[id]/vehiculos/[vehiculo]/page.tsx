import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { cn } from "cn";
import { CalendarIcon } from "lucide-react";
import { Cargando } from "@/componentes/panel/cargando";
import { CabeceraSeccion } from "@/componentes/panel/cabecera-seccion";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { ListaFilas } from "@/componentes/panel/fila-lista";
import { Insignia } from "@/componentes/panel/insignia";
import { ListaDatos } from "@/componentes/panel/lista-datos";
import { PaginaPanel, PartesIguales } from "@/componentes/panel/pagina-panel";
import { SeccionConEditar } from "@/componentes/panel/seccion-con-editar";
import { buttonVariants } from "@/componentes/ui/button";
import { fechaEnBolivia } from "@/lib/fechas";
import { puedeVerModulo } from "@/lib/permisos";
import { exigirModulo } from "@/lib/sesion";
import { aqui, conDesde, volverDesde } from "@/lib/volver";
import { formatearWhatsApp } from "@/lib/whatsapp";
import { reservasDelVehiculo } from "@/modulos/agenda/consultas";
import { ReservasCliente } from "@/modulos/agenda/componentes/reservas-cliente";
import { MasVehiculo } from "@/modulos/clientes/componentes/mas-vehiculo";
import { FormularioVehiculo } from "@/modulos/clientes/componentes/vehiculos-cliente";
import { fichaVehiculo } from "@/modulos/clientes/consultas";
import { detalleVehiculo, rutaVehiculo } from "@/modulos/clientes/reglas";
import { obtenerParametros, tamanosActivos } from "@/modulos/configuracion/consultas";
import { ListaCotizaciones } from "@/modulos/cotizaciones/componentes/lista-cotizaciones";
import { cotizacionesDelVehiculo } from "@/modulos/cotizaciones/consultas";
import { ListaMantenimientos } from "@/modulos/mantenimientos/componentes/lista-mantenimientos";
import { mantenimientosDelVehiculo } from "@/modulos/mantenimientos/consultas";

export const metadata: Metadata = { title: "Vehículo" };

// Pedido 51: la ficha de un vehículo, dentro de Clientes (opción B, aprobada el 16/11; especificación
// docs/08-desarrollo/etapas/P51-ficha-del-vehiculo.md). Todo lo de UN auto en un lugar: sus datos, su dueño, su
// mantenimiento y su historial, también lo hecho con un dueño anterior (P37: al cambiar de dueño el vehículo es el mismo;
// su historial sigue a nombre de quien era dueño). En la ficha del cliente, sus reservas y cotizaciones van mezcladas
// entre todos sus autos. Los montos, solo para quien los ve (RN-12): las mismas listas que la ficha del cliente.

/** Cuántos trabajos se ven antes de "Ver todo el historial". */
const HISTORIAL_CORTO = 5;

export default function PaginaVehiculo({ params, searchParams }: PageProps<"/panel/clientes/[id]/vehiculos/[vehiculo]">) {
  return (
    <PaginaPanel tipo="ficha">
      <Suspense fallback={<Cargando volver={{ href: "/panel/clientes", texto: "Clientes" }} />}>
        <Ficha params={params} searchParams={searchParams} />
      </Suspense>
    </PaginaPanel>
  );
}

async function Ficha({ params, searchParams }: Pick<PageProps<"/panel/clientes/[id]/vehiculos/[vehiculo]">, "params" | "searchParams">) {
  const usuario = await exigirModulo("clientes");
  const [{ id, vehiculo: vehiculoTexto }, busqueda] = await Promise.all([params, searchParams]);
  const clienteId = Number(id);
  const vehiculoId = Number(vehiculoTexto);
  if (![clienteId, vehiculoId].every((n) => Number.isInteger(n) && n > 0)) notFound();
  const v = await fichaVehiculo(vehiculoId);
  if (!v) notFound();
  // La dirección es la del dueño de ahora: un enlace de antes de un cambio de dueño lleva a la de hoy, con lo que traía
  if (v.dueno.id !== clienteId) {
    const resto = new URLSearchParams(Object.entries(busqueda).flatMap(([k, valor]) => (typeof valor === "string" ? [[k, valor]] : []))).toString();
    redirect(`${rutaVehiculo(v.dueno.id, v.id)}${resto ? `?${resto}` : ""}` as Route);
  }

  const verAgenda = puedeVerModulo(usuario, "agenda");
  const verPagos = puedeVerModulo(usuario, "pagos");
  const verOrdenes = puedeVerModulo(usuario, "ordenes");
  const verCotizaciones = puedeVerModulo(usuario, "cotizaciones");
  const verMantenimientos = puedeVerModulo(usuario, "mantenimientos");
  const [tamanos, reservas, cotizaciones, mantenimientos, parametros] = await Promise.all([
    tamanosActivos(),
    verAgenda ? reservasDelVehiculo(v.id, verPagos) : [],
    verCotizaciones ? cotizacionesDelVehiculo(v.id) : [],
    verMantenimientos ? mantenimientosDelVehiculo(v.id) : [],
    obtenerParametros(),
  ]);

  const fichaCliente = `/panel/clientes/${v.dueno.id}`;
  // Pedido 43: "Volver" a la pantalla de la que se vino; sin ella, a la ficha de su dueño
  const volver = volverDesde(busqueda.volver, { href: fichaCliente as Route, texto: v.dueno.nombre }, usuario);
  const desdeAqui = aqui(rutaVehiculo(v.dueno.id, v.id), busqueda);
  const detalle = detalleVehiculo(v);
  const todoElHistorial = busqueda.historial === "todo";
  const historial = todoElHistorial ? reservas : reservas.slice(0, HISTORIAL_CORTO);
  // La reserva directa lleva precios: la arma quien ve pagos, con el cliente y el vehículo ya elegidos
  const reservar = v.activo && v.dueno.activo && verAgenda && verPagos;

  return (
    <>
      <EncabezadoPagina
        volver={volver}
        titulo={v.placa}
        estado={!v.activo && <Insignia>Desactivado</Insignia>}
        accion={
          <div className="flex flex-wrap gap-2">
            {reservar && (
              <Link href={conDesde(`/panel/agenda/nueva?cliente=${v.dueno.id}&vehiculo=${v.id}`, desdeAqui)} className={cn(buttonVariants())}>
                <CalendarIcon />
                Nueva reserva
              </Link>
            )}
            {v.dueno.activo && (
              <MasVehiculo
                clienteId={v.dueno.id}
                vehiculoId={v.id}
                placa={v.placa}
                activo={v.activo}
                cambiarDueno={conDesde(`${rutaVehiculo(v.dueno.id, v.id)}/dueno`, desdeAqui)}
              />
            )}
          </div>
        }
      >
        {!v.activo && "No se ofrece para reservar ni cotizar."}
      </EncabezadoPagina>

      <PartesIguales>
        <SeccionConEditar
          id="datos"
          titulo="Datos"
          etiquetaEditar={`Editar ${v.placa}`}
          tituloModal={`Editar ${v.placa}`}
          lectura={
            <ListaDatos
              nombre="Datos del vehículo"
              // La placa ya es el título
              filas={[detalle.length > 0 && ["Vehículo", detalle.join(" ")], ["Tamaño", v.tamano]]}
            />
          }
        >
          <FormularioVehiculo clienteId={v.dueno.id} vehiculo={v} tamanos={tamanos} />
        </SeccionConEditar>

        <section aria-labelledby="dueno-titulo" className="flex flex-col gap-3">
          <CabeceraSeccion id="dueno" titulo="Dueño" />
          <ListaFilas
            etiqueta="Dueño"
            filas={[
              {
                href: conDesde(fichaCliente, desdeAqui),
                titulo: v.dueno.nombre,
                detalles: [formatearWhatsApp(v.dueno.telefono)],
                ...(v.dueno.activo ? {} : { estado: "Desactivado", atenuada: true }),
              },
            ]}
          />
        </section>
      </PartesIguales>

      {verMantenimientos && (
        <section aria-labelledby="mantenimiento-titulo" className="flex flex-col gap-4">
          <CabeceraSeccion id="mantenimiento" titulo="Mantenimiento" />
          {mantenimientos.length === 0 ? (
            <p className="text-tinta-suave">No tiene mantenimiento programado.</p>
          ) : (
            <ListaMantenimientos
              mantenimientos={mantenimientos}
              editables={v.dueno.activo}
              ve={{ ordenes: verOrdenes, agenda: verAgenda }}
              desde={desdeAqui}
              hoy={fechaEnBolivia()}
              conPlaca={false}
            />
          )}
        </section>
      )}

      {verAgenda && (
        <section aria-labelledby="historial-titulo" className="flex flex-col gap-4">
          <CabeceraSeccion id="historial" titulo="Historial" />
          {reservas.length === 0 ? (
            <p className="text-tinta-suave">Todavía no tiene trabajos.</p>
          ) : (
            <>
              {/* El dueño de cada trabajo en ese momento: lo de antes de un cambio de dueño sigue a nombre del anterior */}
              <ReservasCliente reservas={historial} verOrdenes={verOrdenes} conSaldo={verPagos} desde={desdeAqui} duenoActual={v.dueno.id} />
              {!todoElHistorial && reservas.length > HISTORIAL_CORTO && (
                <Link href={conDesde(`${rutaVehiculo(v.dueno.id, v.id)}?historial=todo`, typeof busqueda.volver === "string" ? busqueda.volver : null)} className={cn(buttonVariants({ variant: "outline" }), "self-start")}>
                  Ver todo el historial ({reservas.length})
                </Link>
              )}
            </>
          )}
        </section>
      )}

      {verCotizaciones && cotizaciones.length > 0 && (
        <section aria-labelledby="cotizaciones-titulo" className="flex flex-col gap-4">
          <CabeceraSeccion id="cotizaciones" titulo="Cotizaciones" />
          <ListaCotizaciones cotizaciones={cotizaciones} umbral={parametros.dias_cotizacion_sin_respuesta} desde={desdeAqui} />
        </section>
      )}
    </>
  );
}
