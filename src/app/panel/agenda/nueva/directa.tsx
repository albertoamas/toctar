import Link from "next/link";
import { buttonVariants } from "@/componentes/ui/button";
import { cn } from "cn";
import { EstadoVacio } from "@/componentes/panel/estado-vacio";
import { PieFormulario } from "@/componentes/panel/pie-formulario";
import { Seccion } from "@/componentes/panel/cabecera-seccion";
import { fechaCorta } from "@/lib/fechas";
import { puedeVerModulo } from "@/lib/permisos";
import { cotizacionesParaReservar, datosDirecta } from "@/modulos/agenda/consultas/reservar";
import { opcionesPorTamano } from "@/modulos/cotizaciones/consultas/servicios";
import { ElegirVehiculoReserva } from "@/modulos/agenda/componentes/elegir-vehiculo-reserva";
import { catalogoVehiculos } from "@/modulos/clientes/consultas";
import { tamanosActivos } from "@/modulos/configuracion/consultas";
import { PASO_CLIENTE, PASO_SERVICIOS, PASO_VEHICULO, pasoInicialReserva } from "@/modulos/agenda/pasos-reserva";
import { recordatorioParaAgendar } from "@/modulos/mantenimientos/consultas";
import { lineaDelMantenimiento } from "@/modulos/mantenimientos/reglas";
import { conDesde } from "@/lib/volver";
import { CotizacionesDelCliente, Encabezado, enlace, Formulario, ParaQuien, type Contexto } from "./partes";

// La reserva nueva directa o desde un mantenimiento (HU-30, HU-38; pedidos 21 y 41).

/**
 * Una reserva sin cotización (la arma quien ve pagos) o desde un mantenimiento (`?recordatorio=`): los avisos, el
 * vehículo si tiene varios, sus cotizaciones para reservar y el formulario de servicios, fecha y adelanto.
 */
export async function ReservaDirecta({ ctx, clienteId }: { ctx: Contexto; clienteId: number }) {
  const { usuario, conPagos, volver, origen, hoy, fechaInicial, texto, numero, direccion, indicador, clave } = ctx;
  // El mantenimiento que se agenda: abierto y de este cliente y vehículo (la acción lo vuelve a mirar al guardar)
  const recordatorioId = numero("recordatorio");
  if (recordatorioId && (!puedeVerModulo(usuario, "mantenimientos") || !conPagos)) {
    return (
      <>
        <Encabezado volver={volver} />
        <EstadoVacio>
          {!puedeVerModulo(usuario, "mantenimientos")
            ? "Los mantenimientos los reserva el dueño o quien tiene «Mantenimientos»."
            : "La reserva del mantenimiento lleva precios: la arma el dueño o quien registra pagos."}
        </EstadoVacio>
      </>
    );
  }
  const recordatorio = recordatorioId ? await recordatorioParaAgendar(recordatorioId) : null;
  if (recordatorioId && (!recordatorio || recordatorio.clienteId !== clienteId || recordatorio.vehiculoId !== numero("vehiculo"))) {
    return (
      <>
        <Encabezado volver={volver} />
        <EstadoVacio>
          Ese mantenimiento ya se reservó o se cerró. <Link href="/panel/mantenimientos" className={enlace}>Volver a Mantenimientos</Link>
        </EstadoVacio>
      </>
    );
  }

  const d = await datosDirecta(clienteId, numero("vehiculo"));
  if (!d) {
    return (
      <>
        <Encabezado volver={volver} />
        <EstadoVacio>Ese cliente ya no está activo. <Link href={conDesde("/panel/agenda/nueva", origen)} className={enlace}>Elegir otro</Link></EstadoVacio>
      </>
    );
  }
  // Desde un mantenimiento no se cambia el cliente ni el vehículo: el recordatorio es de ellos
  const cambiarCliente = recordatorio ? undefined : direccion({});
  const cambiarVehiculo = recordatorio ? undefined : direccion({ cliente: d.cliente.id });
  // "Otro vehículo": quien ve Clientes y arma reservas sin cotización (uno nuevo no tiene cotizaciones para reservar)
  const registra = conPagos && puedeVerModulo(usuario, "clientes") && !recordatorio;
  if (!d.vehiculo && registra && texto("vehiculo") === "nuevo") return <ReservaConNuevos ctx={ctx} clienteId={d.cliente.id} nombreCliente={d.cliente.nombre} />;

  // Paso 2: el vehículo, siempre (20/11): en tarjetas, como en Nueva cotización, con "Otro vehículo" para registrarlo
  // en el paso siguiente (quien ve Clientes). Sin vehículos, solo esa tarjeta
  if (!d.vehiculo) {
    return (
      <>
        <Encabezado volver={volver} />
        {indicador(PASO_VEHICULO, [cambiarCliente && { href: cambiarCliente }])}
        <ParaQuien nombre={d.cliente.nombre} vehiculo={null} />
        <Seccion id="vehiculo" titulo="Vehículo" sinRelleno>
          {d.vehiculos.length === 0 && !registra ? (
            <EstadoVacio>
              {d.cliente.nombre} no tiene vehículos activos. Pídele al dueño que le agregue uno en su ficha o que arme la reserva.
            </EstadoVacio>
          ) : (
            <ElegirVehiculoReserva
              vehiculos={d.vehiculos.map((v) => ({
                id: v.id,
                placa: v.placa,
                detalle: [...v.detalle, `Tamaño: ${v.tamano}`].join(" · "),
                href: direccion({ cliente: d.cliente.id, vehiculo: v.id }),
              }))}
              otro={registra ? direccion({ cliente: d.cliente.id, vehiculo: "nuevo" }) : null}
            />
          )}
        </Seccion>
        {/* "Atrás" en todos los pasos (20/11): aquí, a elegir otro cliente. En el mismo pie que los demás pasos (fijo abajo
            en el celular), no suelto bajo la tarjeta */}
        {cambiarCliente && (
          <PieFormulario>
            <Link href={cambiarCliente} className={buttonVariants({ variant: "outline" })}>
              Atrás
            </Link>
          </PieFormulario>
        )}
      </>
    );
  }

  const vehiculo = d.vehiculo;
  const arriba = (
    <>
      <ParaQuien
        nombre={d.cliente.nombre}
        vehiculo={vehiculo}
        // El mantenimiento que se agenda, junto a para quién es (hallazgo 10: iba suelto entre tarjetas); vencido, en aviso
        extra={
          recordatorio && (
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>Mantenimiento de {recordatorio.servicio}</span>
              <span className={cn("tt-estado", recordatorio.fechaProgramada < hoy && "tt-estado--aviso")}>
                {recordatorio.fechaProgramada < hoy ? "Venció" : "Vence"} el {fechaCorta(recordatorio.fechaProgramada, hoy)}
              </span>
            </p>
          )
        }
      />
      {/* Su servicio de mantenimiento ya no se ofrece (inactivo o sin precio para ese tamaño): se dice por qué falta la línea */}
      {recordatorio && !lineaDelMantenimiento(d.opciones, recordatorio.servicioMantenimientoId) && (
        // En ámbar, como los avisos de Entregar y de los montos (pulido final del 09/11)
        <p role="status" className="rounded-sm border border-aviso bg-aviso-fondo p-3 text-sm font-medium text-aviso">
          Su servicio de mantenimiento ya no se ofrece en el catálogo: elige el servicio que se hará.
        </p>
      )}
    </>
  );
  // Tocar el cliente o el vehículo en el indicador vuelve a elegirlos (20/11)
  const pasosHechos = [cambiarCliente && { href: cambiarCliente }, cambiarVehiculo && { href: cambiarVehiculo }];
  // Paso 3: los servicios. Primero sus cotizaciones para reservar; un mantenimiento no las ofrece (se agenda su servicio)
  const cotizaciones = recordatorio ? [] : await cotizacionesParaReservar(d.cliente.id, vehiculo.id);
  const conMontos = conPagos || puedeVerModulo(usuario, "cotizaciones");
  const deCotizacion = (cotizacion: number) => direccion({ cotizacion, cliente: d.cliente.id, vehiculo: vehiculo.id });
  const suyas = cotizaciones.length > 0 ? <CotizacionesDelCliente cotizaciones={cotizaciones} conMontos={conMontos} enlace={deCotizacion} /> : null;
  if (!conPagos) {
    return (
      <>
        <Encabezado volver={volver} />
        {indicador(PASO_SERVICIOS, pasosHechos)}
        {arriba}
        {suyas ?? <EstadoVacio>Este vehículo no tiene cotizaciones para reservar. La reserva sin cotización lleva precios: la arma el dueño o quien registra pagos.</EstadoVacio>}
      </>
    );
  }
  // Un mantenimiento llega con su servicio de mantenimiento ya elegido (pedido 21): con su precio, directo a la fecha
  const lineasIniciales = recordatorio ? [lineaDelMantenimiento(d.opciones, recordatorio.servicioMantenimientoId)].filter((l) => l !== null) : [];
  return (
    <>
      <Encabezado volver={volver} />
      <Formulario
        key={clave}
        volver={origen}
        origen={{
          tipo: "directa",
          clienteId: d.cliente.id,
          vehiculoId: vehiculo.id,
          opciones: d.opciones,
          recordatorioId: recordatorio?.id ?? null,
          lineasIniciales,
          pasoInicial: pasoInicialReserva(lineasIniciales),
        }}
        conPagos={conPagos}
        hoy={hoy}
        fechaInicial={fechaInicial}
        fechaFin={fechaInicial}
        arriba={arriba}
        cotizaciones={suyas}
        pasosHechos={pasosHechos}
      />
    </>
  );
}

/**
 * La reserva con un cliente nuevo (`clienteId` null, desde "Cliente nuevo") o con otro vehículo de un cliente registrado
 * (20/11, como en Nueva cotización): sus datos son los primeros pasos del formulario y se registran con la reserva.
 */
export async function ReservaConNuevos({ ctx, clienteId, nombreCliente }: { ctx: Contexto; clienteId: number | null; nombreCliente?: string }) {
  const { conPagos, volver, origen, hoy, fechaInicial, direccion, clave } = ctx;
  const [tamanos, catalogo] = await Promise.all([tamanosActivos(), catalogoVehiculos()]);
  const opcionesPor = await opcionesPorTamano(tamanos.map((t) => t.id));
  return (
    <>
      <Encabezado volver={volver} />
      <Formulario
        key={clave}
        volver={origen}
        origen={{
          tipo: "directa",
          clienteId,
          vehiculoId: null,
          opciones: [],
          nuevo: {
            clienteNuevo: clienteId === null,
            nombreCliente,
            tamanos,
            catalogo,
            opcionesPorTamano: opcionesPor,
            // "Buscar un cliente registrado" o, con un cliente registrado, "Atrás" a sus vehículos
            volverAElegir: clienteId === null ? direccion({}) : direccion({ cliente: clienteId }),
            conCliente: direccion({ cliente: 0 }),
          },
          pasoInicial: clienteId === null ? PASO_CLIENTE : PASO_VEHICULO,
        }}
        conPagos={conPagos}
        hoy={hoy}
        fechaInicial={fechaInicial}
        fechaFin={fechaInicial}
        // Tocar el cliente en el indicador vuelve a elegirlo (con otro vehículo de un cliente registrado)
        pasosHechos={clienteId === null ? [] : [{ href: direccion({}) }]}
      />
    </>
  );
}

