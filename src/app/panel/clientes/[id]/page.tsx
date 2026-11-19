import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment, Suspense } from "react";
import { cn } from "cn";
import { CalendarIcon, FileTextIcon } from "lucide-react";
import { AvisoFlotante } from "@/componentes/panel/aviso-flotante";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { Seccion } from "@/componentes/panel/cabecera-seccion";
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
import { obtenerCliente } from "@/modulos/clientes/consultas";
import { obtenerParametros, tamanosActivos } from "@/modulos/configuracion/consultas";
import { cotizacionesDelCliente } from "@/modulos/cotizaciones/consultas/lista";
import { ListaMantenimientos } from "@/modulos/mantenimientos/componentes/lista-mantenimientos";
import { AgregarMantenimiento } from "@/modulos/mantenimientos/componentes/planes";
import { mantenimientosDelCliente, serviciosConMantenimiento } from "@/modulos/mantenimientos/consultas";
import { Insignia } from "@/componentes/panel/insignia";
import { PaginaPanel } from "@/componentes/panel/pagina-panel";
import { aqui, conDesde, volverDesde } from "@/lib/volver";
import { LineaDeTiempo } from "@/componentes/panel/linea-de-tiempo";
import { HISTORIA_CORTA, historia } from "@/modulos/clientes/componentes/historia";

export const metadata: Metadata = { title: "Cliente" };

// HU-23: ficha del cliente: datos, vehículos, WhatsApp y desactivar. Pedido 23: sus cotizaciones y "Nueva cotización",
// si quien entra tiene el módulo. HU-32: sus reservas, con el saldo de cada una para quien ve pagos; desde C4 son también sus
// órdenes, con su estado. HU-38: sus mantenimientos programados, para quien tiene "Mantenimientos". Pedido 21: sus planes
// (cada cuántos meses), agregar uno hecho antes del sistema y, en el menú "Más" de cada uno, editarlo o terminarlo.
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
  // Una reserva ya recibida se abre en su orden, si quien mira ve órdenes
  const verOrdenes = puedeVerModulo(usuario, "ordenes");
  const [c, tamanos, cotizaciones, parametros, reservas, mantenimientos, conMantenimiento] = await Promise.all([
    obtenerCliente(numero),
    tamanosActivos(),
    verCotizaciones ? cotizacionesDelCliente(numero) : [],
    obtenerParametros(),
    // Con Pagos también sin Agenda: de ahí sale lo que debe (la lista de reservas es de Agenda)
    verAgenda || verPagos ? reservasDelCliente(numero, verPagos) : [],
    verMantenimientos ? mantenimientosDelCliente(numero) : [],
    verMantenimientos ? serviciosConMantenimiento() : [],
  ]);
  if (!c) notFound();
  // Pedido 43: "Volver" a la pantalla de la que se vino; los enlaces que salen de aquí dicen que vienen de este cliente
  const volver = volverDesde(busqueda.volver, { href: "/panel/clientes", texto: "Clientes" }, usuario);
  const desdeAqui = aqui(`/panel/clientes/${c.id}`, busqueda);

  const debe = saldoPendiente(reservas);
  // La historia: las reservas con la Agenda, las cotizaciones con Cotizaciones (RN-12: los montos, a quien los ve)
  const conHistoria = verAgenda || verCotizaciones;
  const todaLaHistoria = busqueda.historia === "todo";
  const hitos = historia({
    reservas: verAgenda ? reservas : null,
    cotizaciones: verCotizaciones ? cotizaciones : null,
    verOrdenes,
    conSaldo: verPagos,
    umbral: parametros.dias_cotizacion_sin_respuesta,
    desde: desdeAqui,
  });
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
    <>
      <EncabezadoPagina
        volver={volver}
        titulo={c.nombre}
        estado={
          (!c.activo || debe) && (
            <span className="flex flex-wrap gap-2">
              {!c.activo && <Insignia>Desactivado</Insignia>}
              {/* Solo para quien ve pagos: sin el permiso, reservas no trae saldos */}
              {debe && <Insignia tono="aviso">Debe {mostrarMonto(debe)} Bs</Insignia>}
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
      {creado && <AvisoFlotante mensaje={`Cliente ${c.nombre} creado.`} />}
      {/* Pedido 37: un vehículo que pasó a este cliente, solo si de verdad es suyo */}
      {typeof recibido === "string" && c.vehiculos.some((v) => v.activo && v.placa === recibido) && (
        <AvisoFlotante mensaje={`${recibido} ahora es de ${c.nombre}, con su plan de mantenimiento.`} />
      )}

      {/* C7 §5.6 (18/11): la historia (reservas, órdenes y cotizaciones en una sola lista, lo más reciente arriba) y los
          mantenimientos a la izquierda; los vehículos y los datos al costado. En el celular: la historia, los vehículos y
          los datos, y los mantenimientos */}
      <div className="grid items-start gap-8 gap-x-4 @4xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {conHistoria && (
          <Seccion
            id="historia"
            titulo="Historia"
            sinRelleno
            className="@4xl:col-start-1 @4xl:row-start-1"
            accion={
              <div className="flex flex-wrap gap-1">
                {/* La reserva directa lleva precios: la arma quien ve pagos (las demás salen de una cotización) */}
                {verAgenda && c.activo && verPagos && (
                  <Link href={conDesde(`/panel/agenda/nueva?cliente=${c.id}`, desdeAqui)} className={cn(buttonVariants({ variant: "ghost" }))}>
                    <CalendarIcon />
                    Nueva reserva
                  </Link>
                )}
                {/* A un cliente desactivado no se le cotiza: se reactiva primero */}
                {c.activo && cotiza && (
                  <Link href={conDesde(`/panel/cotizaciones/nueva?cliente=${c.id}`, desdeAqui)} className={cn(buttonVariants({ variant: "ghost" }))}>
                    <FileTextIcon />
                    Nueva cotización
                  </Link>
                )}
              </div>
            }
          >
            <LineaDeTiempo
              hitos={hitos}
              corta={todaLaHistoria ? undefined : HISTORIA_CORTA}
              verTodo={conDesde(`/panel/clientes/${c.id}?historia=todo`, typeof busqueda.volver === "string" ? busqueda.volver : null)}
              vacio="Todavía no tiene trabajos ni cotizaciones."
            />
          </Seccion>
        )}

        <div className="flex min-w-0 flex-col gap-8 @4xl:col-start-2 @4xl:row-span-2 @4xl:row-start-1">
          <VehiculosCliente clienteId={c.id} vehiculos={c.vehiculos} tamanos={tamanos} desde={desdeAqui} />
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

        <div className="flex min-w-0 flex-col gap-8 empty:hidden @4xl:col-start-1 @4xl:row-start-2">
          {verMantenimientos && (
            <Seccion
              id="mantenimientos" titulo="Mantenimientos"
              sinRelleno
              accion={
                <>
                  {/* Un servicio hecho antes del sistema: con un vehículo activo y algún servicio que programe mantenimiento */}
                  {c.activo && vehiculosActivos.length > 0 && conMantenimiento.length > 0 && (
                    <AgregarMantenimiento clienteId={c.id} vehiculos={vehiculosActivos} servicios={conMantenimiento} hoy={hoy} />
                  )}
                </>
              }
            >
              {mantenimientos.length === 0 ? (
                <p className="px-4 py-3 text-tinta-suave">No tiene mantenimientos programados.</p>
              ) : (
                <ListaMantenimientos mantenimientos={mantenimientos} editables={c.activo} ve={{ ordenes: verOrdenes, agenda: verAgenda }} desde={desdeAqui} hoy={hoy} />
              )}
            </Seccion>
          )}
        </div>
      </div>
    </>
  );
}
