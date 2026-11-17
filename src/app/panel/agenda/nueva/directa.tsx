import Link from "next/link";
import { cn } from "cn";
import { EstadoVacio } from "@/componentes/panel/estado-vacio";
import { ListaFilas } from "@/componentes/panel/fila-lista";
import { CabeceraSeccion } from "@/componentes/panel/cabecera-seccion";
import { fechaCorta } from "@/lib/fechas";
import { puedeVerModulo } from "@/lib/permisos";
import { cotizacionesParaReservar, datosDirecta } from "@/modulos/agenda/consultas/reservar";
import { PASO_SERVICIOS, PASO_VEHICULO, pasoInicialReserva } from "@/modulos/agenda/pasos-reserva";
import { recordatorioParaAgendar } from "@/modulos/mantenimientos/consultas";
import { lineaDelMantenimiento } from "@/modulos/mantenimientos/reglas";
import { conDesde } from "@/lib/volver";
import { ClienteYVehiculo, CotizacionesDelCliente, Encabezado, enlace, Formulario, type Contexto } from "./partes";

// La reserva nueva directa o desde un mantenimiento (HU-30, HU-38; pedidos 21 y 41).

/**
 * Una reserva sin cotización (la arma quien ve pagos) o desde un mantenimiento (`?recordatorio=`): los avisos, el
 * vehículo si tiene varios, sus cotizaciones para reservar y el formulario de servicios, fecha y adelanto.
 */
export async function ReservaDirecta({ ctx, clienteId }: { ctx: Contexto; clienteId: number }) {
  const { usuario, conPagos, volver, origen, hoy, fechaInicial, numero, direccion, indicador, clave } = ctx;
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

  // Con un solo vehículo, ya va elegido (datosDirecta)
  const d = await datosDirecta(clienteId, numero("vehiculo"));
  if (!d) {
    return (
      <>
        <Encabezado volver={volver} />
        <EstadoVacio>Ese cliente ya no está activo. <Link href={conDesde("/panel/agenda/nueva", origen)} className={enlace}>Elegir otro</Link></EstadoVacio>
      </>
    );
  }
  if (d.vehiculos.length === 0) {
    return (
      <>
        <Encabezado volver={volver} />
        <EstadoVacio>
          {d.cliente.nombre} no tiene vehículos activos. <Link href={`/panel/clientes/${d.cliente.id}`} className={enlace}>Agregar uno en su ficha</Link>
        </EstadoVacio>
      </>
    );
  }
  // Desde un mantenimiento no se cambia el cliente ni el vehículo: el recordatorio es de ellos
  const cambiarCliente = recordatorio ? undefined : direccion({});
  const cambiarVehiculo = recordatorio || d.vehiculos.length < 2 ? undefined : direccion({ cliente: d.cliente.id });

  // Paso 2: el vehículo, si tiene varios
  if (!d.vehiculo) {
    return (
      <>
        <Encabezado volver={volver} />
        {indicador(PASO_VEHICULO)}
        <ClienteYVehiculo nombre={d.cliente.nombre} vehiculo={null} cambiarCliente={cambiarCliente} />
        <section aria-labelledby="vehiculo-titulo" className="flex flex-col gap-3">
          <CabeceraSeccion id="vehiculo" titulo="Vehículo" />
          {/* La fila de un toque, con la placa grande y el tamaño con su etiqueta, como en el resto del panel */}
          <ListaFilas
            etiqueta="Elegir vehículo"
            filas={d.vehiculos.map((v) => ({
              href: direccion({ cliente: d.cliente.id, vehiculo: v.id }),
              titulo: v.placa,
              tituloGrande: true,
              detalles: [...(v.detalle.length > 0 ? [v.detalle.join(" ")] : []), `Tamaño: ${v.tamano}`],
            }))}
          />
        </section>
      </>
    );
  }

  const vehiculo = d.vehiculo;
  const arriba = (
    <>
      <ClienteYVehiculo
        nombre={d.cliente.nombre}
        vehiculo={vehiculo}
        cambiarCliente={cambiarCliente}
        cambiarVehiculo={cambiarVehiculo}
        // El mantenimiento que se agenda, dentro de la tarjeta (hallazgo 10: iba suelto entre tarjetas); vencido, en aviso
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
  // Paso 3: los servicios. Primero sus cotizaciones para reservar; un mantenimiento no las ofrece (se agenda su servicio)
  const cotizaciones = recordatorio ? [] : await cotizacionesParaReservar(d.cliente.id, vehiculo.id);
  const conMontos = conPagos || puedeVerModulo(usuario, "cotizaciones");
  const deCotizacion = (cotizacion: number) => direccion({ cotizacion, cliente: d.cliente.id, vehiculo: vehiculo.id });
  const suyas = cotizaciones.length > 0 ? <CotizacionesDelCliente cotizaciones={cotizaciones} conMontos={conMontos} enlace={deCotizacion} /> : null;
  if (!conPagos) {
    return (
      <>
        <Encabezado volver={volver} />
        {indicador(PASO_SERVICIOS)}
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
        espacio={numero("espacio")}
        arriba={arriba}
        cotizaciones={suyas}
      />
    </>
  );
}
