import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { cn } from "cn";
import { CalendarIcon } from "lucide-react";
import { Cargando } from "@/componentes/panel/cargando";
import { Seccion } from "@/componentes/panel/cabecera-seccion";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { ListaFilas } from "@/componentes/panel/fila-lista";
import { Insignia } from "@/componentes/panel/insignia";
import { ListaDatos } from "@/componentes/panel/lista-datos";
import { PaginaPanel } from "@/componentes/panel/pagina-panel";
import { SeccionConEditar } from "@/componentes/panel/seccion-con-editar";
import { buttonVariants } from "@/componentes/ui/button";
import { fechaEnBolivia } from "@/lib/fechas";
import { puedeVerModulo } from "@/lib/permisos";
import { exigirModulo } from "@/lib/sesion";
import { aqui, conDesde, volverDesde } from "@/lib/volver";
import { formatearWhatsApp } from "@/lib/whatsapp";
import { reservasDelVehiculo } from "@/modulos/agenda/consultas/listas";
import { MasVehiculo } from "@/modulos/clientes/componentes/mas-vehiculo";
import { FormularioVehiculo } from "@/modulos/clientes/componentes/vehiculos-cliente";
import { fichaVehiculo } from "@/modulos/clientes/consultas";
import { detalleVehiculo, rutaVehiculo } from "@/modulos/clientes/reglas";
import { obtenerParametros, tamanosActivos } from "@/modulos/configuracion/consultas";
import { cotizacionesDelVehiculo } from "@/modulos/cotizaciones/consultas/lista";
import { ListaMantenimientos } from "@/modulos/mantenimientos/componentes/lista-mantenimientos";
import { mantenimientosDelVehiculo } from "@/modulos/mantenimientos/consultas";
import { LineaDeTiempo } from "@/componentes/panel/linea-de-tiempo";
import { HISTORIA_CORTA, historia } from "@/modulos/clientes/componentes/historia";

export const metadata: Metadata = { title: "Vehículo" };

// Pedido 51: la ficha de un vehículo, dentro de Clientes (opción B, aprobada el 16/11; especificación
// docs/08-desarrollo/etapas/P51-ficha-del-vehiculo.md). Todo lo de UN auto en un lugar: sus datos, su dueño, su
// mantenimiento y su historial, también lo hecho con un dueño anterior (P37: al cambiar de dueño el vehículo es el mismo;
// su historial sigue a nombre de quien era dueño). En la ficha del cliente, sus reservas y cotizaciones van mezcladas
// entre todos sus autos. Los montos, solo para quien los ve (RN-12): las mismas listas que la ficha del cliente.

/** Un id de la dirección: solo dígitos y dentro de lo que guarda la base (uno mayor, no existe), como en "Cambiar de dueño". */
const numero = (texto: unknown) => (typeof texto === "string" && /^\d{1,10}$/.test(texto) && Number(texto) <= 2147483647 ? Number(texto) : null);

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
  const clienteId = numero(id);
  const vehiculoId = numero(vehiculoTexto);
  if (!clienteId || !vehiculoId) notFound();
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
    verCotizaciones ? obtenerParametros() : null,
  ]);

  const fichaCliente = `/panel/clientes/${v.dueno.id}`;
  // Pedido 43: "Volver" a la pantalla de la que se vino; sin ella, a la ficha de su dueño
  const volver = volverDesde(busqueda.volver, { href: fichaCliente as Route, texto: v.dueno.nombre }, usuario);
  const desdeAqui = aqui(rutaVehiculo(v.dueno.id, v.id), busqueda);
  const detalle = detalleVehiculo(v);
  // La historia: las reservas con la Agenda, las cotizaciones con Cotizaciones; cada una dice con qué dueño fue, si no
  // es el de ahora (P37: lo de antes de un cambio de dueño sigue a nombre del anterior)
  const conHistoria = verAgenda || verCotizaciones;
  const todaLaHistoria = busqueda.historia === "todo";
  const hitos = historia({
    reservas: verAgenda ? reservas : null,
    cotizaciones: verCotizaciones ? cotizaciones : null,
    verOrdenes,
    conSaldo: verPagos,
    umbral: parametros?.dias_cotizacion_sin_respuesta ?? 0,
    desde: desdeAqui,
    duenoActual: v.dueno.id,
  });
  // La reserva directa lleva precios: la arma quien ve pagos, con el cliente y el vehículo ya elegidos
  const reservar = v.activo && v.dueno.activo && verAgenda && verPagos;

  return (
    <>
      <EncabezadoPagina
        volver={volver}
        titulo={v.placa}
        // Qué vehículo es y de quién (C7, 18/11), como en el prototipo
        subtitulo={[detalle.join(" "), `de ${v.dueno.nombre}`].filter(Boolean).join(" · ")}
        estado={!v.activo && <Insignia>Desactivado</Insignia>}
        accion={
          <div className="flex flex-wrap gap-2">
            {reservar && (
              <Link href={conDesde(`/panel/agenda/nueva?cliente=${v.dueno.id}&vehiculo=${v.id}`, desdeAqui)} className={cn(buttonVariants())}>
                <CalendarIcon />
                Nueva reserva
              </Link>
            )}
            {/* También con el dueño desactivado: el vehículo se reactiva o se pasa a otro */}
            <MasVehiculo
              clienteId={v.dueno.id}
              vehiculoId={v.id}
              placa={v.placa}
              activo={v.activo}
              cambiarDueno={conDesde(`${rutaVehiculo(v.dueno.id, v.id)}/dueno`, desdeAqui)}
            />
          </div>
        }
      >
        {!v.activo && "No se ofrece para reservar ni cotizar."}
      </EncabezadoPagina>

      {/* C7 §5.6 (18/11): la historia del vehículo (reservas, órdenes y cotizaciones, también las de un dueño anterior) y
          al costado su mantenimiento, los datos y el dueño (en el celular, en ese orden, debajo de la historia) */}
      <div className="grid items-start gap-8 gap-x-4 @4xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {conHistoria && (
          <Seccion id="historia" titulo="Historia" sinRelleno className="@4xl:col-start-1 @4xl:row-start-1">
            <LineaDeTiempo
              hitos={hitos}
              hoy={fechaEnBolivia()}
              corta={todaLaHistoria ? undefined : HISTORIA_CORTA}
              verTodo={conDesde(`${rutaVehiculo(v.dueno.id, v.id)}?historia=todo`, typeof busqueda.volver === "string" ? busqueda.volver : null)}
              vacio="Todavía no tiene trabajos ni cotizaciones."
            />
          </Seccion>
        )}

        {/* Al costado, como en el prototipo v3: el mantenimiento, los datos y el dueño */}
        <div className="flex min-w-0 flex-col gap-8 @4xl:col-start-2 @4xl:row-start-1">
          {verMantenimientos && (
            <Seccion id="mantenimiento" titulo="Mantenimiento" sinRelleno>
              {mantenimientos.length === 0 ? (
                <p className="px-4 py-3 text-tinta-suave">No tiene mantenimiento programado.</p>
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
            </Seccion>
          )}
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

          <Seccion id="dueno" titulo="Dueño" sinRelleno>
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
          </Seccion>
        </div>
      </div>
    </>
  );
}
