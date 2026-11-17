import { EstadoVacio } from "@/componentes/panel/estado-vacio";
import { ResumenPaso } from "@/componentes/panel/resumen-paso";
import { puedeVerModulo } from "@/lib/permisos";
import { mostrarMonto } from "@/modulos/catalogo/reglas";
import { datosDeCotizacion, datosDirecta } from "@/modulos/agenda/consultas/reservar";
import { PASO_FECHA } from "@/modulos/agenda/pasos-reserva";
import { fechaEntregaSugerida } from "@/modulos/agenda/reglas";
import { ClienteYVehiculo, Encabezado, Formulario, type Contexto } from "./partes";

// La reserva nueva desde una cotización (HU-30; pedido 41).

/**
 * Una reserva desde la versión vigente de una cotización (`?cotizacion=`): los avisos si ya no se puede reservar, sus
 * servicios en lectura (para cambiar precios se hace una versión nueva) y la fecha. Elegida en el paso Servicios de la
 * reserva directa, es su último paso y se puede volver.
 */
export async function ReservaDesdeCotizacion({ ctx, cotizacionId }: { ctx: Contexto; cotizacionId: number }) {
  const { usuario, conPagos, volver, origen, hoy, fechaInicial, numero, indicador, direccion, clave } = ctx;
    const c = await datosDeCotizacion(cotizacionId);
    if (!c) {
      return (
        <>
          <Encabezado volver={volver} />
          <EstadoVacio>Esa cotización ya no existe.</EstadoVacio>
        </>
      );
    }
    if (!c.agendable) {
      return (
        <>
          <Encabezado volver={volver} />
          <EstadoVacio>Esa cotización ya tiene una reserva o una versión nueva.</EstadoVacio>
        </>
      );
    }
    // Se dice antes de llenar el formulario, y no recién al guardar
    if (!c.activos) {
      return (
        <>
          <Encabezado volver={volver} />
          <EstadoVacio>El cliente o el vehículo de esa cotización ya no está activo. Reactívalo en su ficha para reservarla.</EstadoVacio>
        </>
      );
    }
    const duraciones = c.lineas.map((l) => l.duracion);
    // Los precios de la cotización, con Pagos o con Cotizaciones (RN-12), como en "Por reservar"
    const verMontos = conPagos || puedeVerModulo(usuario, "cotizaciones");
    // Elegida en el paso Servicios de la reserva (llega con su cliente y vehículo): es el último paso y se puede volver.
    // Desde "Por reservar" o la cotización, arriba van los pasos del trabajo
    const enLosPasos = numero("cliente") === c.cliente.id && numero("vehiculo") === c.vehiculo.id;
    // Con varios vehículos, también se vuelve a elegir el vehículo, como en el paso Servicios
    const conVarios = enLosPasos && ((await datosDirecta(c.cliente.id, c.vehiculo.id))?.vehiculos.length ?? 0) > 1;
    return (
      <>
        <Encabezado volver={volver} />
        {/* El mismo indicador que la directa y el mantenimiento (hallazgo 10): los pasos del trabajo se ven en la
            cotización y en la reserva ya creada */}
        {indicador(PASO_FECHA)}
        <ClienteYVehiculo
          nombre={c.cliente.nombre}
          vehiculo={c.vehiculo}
          cambiarCliente={enLosPasos ? direccion({}) : undefined}
          cambiarVehiculo={conVarios ? direccion({ cliente: c.cliente.id }) : undefined}
        />
        {/* Los servicios de la cotización, en lectura: para cambiar precios se hace una versión nueva */}
        <ResumenPaso
          id="cotizacion"
          titulo="Servicios"
          href={enLosPasos ? direccion({ cliente: c.cliente.id, vehiculo: c.vehiculo.id }) : undefined}
          etiquetaCambiar="Cambiar servicios"
          claseContenido="gap-2"
        >
          {/* De dónde vienen: siempre "Servicios", como en los otros caminos (hallazgo 10) */}
          <p className="text-sm text-tinta-suave">
            De la cotización {c.numero}
            {c.version > 1 ? `, versión ${c.version}` : ""}
          </p>
          <ul className="flex flex-col gap-1">
            {c.lineas.map((l, i) => (
              <li key={i} className="flex justify-between gap-4">
                <span>{l.descripcion}</span>
                {verMontos && <span className="shrink-0 tabular-nums">{mostrarMonto(l.precio)} Bs</span>}
              </li>
            ))}
          </ul>
          {/* El total va en la barra de abajo, como en los otros caminos (hallazgo 10): no dos veces */}
          {!c.aceptada && <p className="text-sm text-tinta-suave">Al reservar, la cotización queda aceptada.</p>}
        </ResumenPaso>
        <Formulario
          key={clave}
          volver={origen}
          // El total, en la barra de abajo como en los otros caminos (hallazgo 10); solo a quien ve montos (RN-12)
          origen={{ tipo: "cotizacion", cotizacionId: c.cotizacionId, duraciones, total: verMontos ? c.saldo.total : null }}
          conPagos={conPagos}
          hoy={hoy}
          fechaInicial={fechaInicial}
          fechaFin={fechaEntregaSugerida(fechaInicial, duraciones)}
          espacio={numero("espacio")}
          atras={enLosPasos ? direccion({ cliente: c.cliente.id, vehiculo: c.vehiculo.id }) : undefined}
        />
      </>
    );
}
