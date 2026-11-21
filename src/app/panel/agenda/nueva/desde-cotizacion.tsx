import { EstadoVacio } from "@/componentes/panel/estado-vacio";
import { puedeVerModulo } from "@/lib/permisos";
import { datosDeCotizacion } from "@/modulos/agenda/consultas/reservar";
import { fechaEntregaSugerida } from "@/modulos/agenda/reglas";
import { ParaQuien, Encabezado, Formulario, type Contexto } from "./partes";

// La reserva nueva desde una cotización (HU-30; pedido 41).

/**
 * Una reserva desde la versión vigente de una cotización (`?cotizacion=`): los avisos si ya no se puede reservar, sus
 * servicios en lectura (para cambiar precios se hace una versión nueva) y la fecha. Elegida en el paso Servicios de la
 * reserva directa, es su último paso y se puede volver.
 */
export async function ReservaDesdeCotizacion({ ctx, cotizacionId }: { ctx: Contexto; cotizacionId: number }) {
  const { usuario, conPagos, volver, origen, hoy, fechaInicial, numero, direccion, clave } = ctx;
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
    return (
      <>
        <Encabezado volver={volver} />
        {/* El indicador de pasos lo dibuja el formulario (20/11: sigue al paso del adelanto); debajo, para quién es */}
        <Formulario
          key={clave}
          volver={origen}
          // El total, en la barra de abajo como en los otros caminos (hallazgo 10); solo a quien ve montos (RN-12)
          // Sus servicios van en el resumen del último paso (20/11), con el precio solo para quien ve montos
          origen={{
            tipo: "cotizacion",
            cotizacionId: c.cotizacionId,
            duraciones,
            total: verMontos ? c.saldo.total : null,
            numero: `${c.numero}${c.version > 1 ? `, versión ${c.version}` : ""}`,
            aceptada: c.aceptada,
            lineas: c.lineas.map((l) => ({ descripcion: l.descripcion, precio: verMontos ? l.precio : null })),
          }}
          conPagos={conPagos}
          hoy={hoy}
          fechaInicial={fechaInicial}
          fechaFin={fechaInicial ? fechaEntregaSugerida(fechaInicial, duraciones) : ""}
          atras={enLosPasos ? direccion({ cliente: c.cliente.id, vehiculo: c.vehiculo.id }) : undefined}
          // Elegida en los pasos: tocar el cliente, el vehículo o los servicios en el indicador vuelve a ellos (20/11)
          pasosHechos={
            enLosPasos
              ? [{ href: direccion({}) }, { href: direccion({ cliente: c.cliente.id }) }, { href: direccion({ cliente: c.cliente.id, vehiculo: c.vehiculo.id }) }]
              : undefined
          }
          arriba={<ParaQuien nombre={c.cliente.nombre} vehiculo={c.vehiculo} />}
        />
      </>
    );
}
