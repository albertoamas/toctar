import Image from "next/image";
import { AbrirFoto } from "@/componentes/panel/abrir-foto";
import { EstadoVacio } from "@/componentes/panel/estado-vacio";
import { puedeVerModulo } from "@/lib/permisos";
import { formatearWhatsApp } from "@/lib/whatsapp";
import { datosDeCotizacion, type InteresadoDeCotizacion } from "@/modulos/agenda/consultas/reservar";
import { catalogoVehiculos } from "@/modulos/clientes/consultas";
import { PREFIJO_VEHICULO } from "@/modulos/clientes/valores";
import { tamanosActivos } from "@/modulos/configuracion/consultas";
import { fotoDeConsulta } from "@/modulos/cotizaciones/consultas/ficha";
import type { UrlsFoto } from "@/lib/fotos";
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
    // La de un interesado (P31b): se registra en los primeros pasos, con lo que se anotó al cotizar. Es de Clientes,
    // como una reserva directa con un cliente nuevo
    if (c.interesado && !puedeVerModulo(usuario, "clientes")) {
      return (
        <>
          <Encabezado volver={volver} />
          <EstadoVacio>{`${c.interesado.nombre} todavía no está registrado como cliente. Para reservar, lo registra el dueño o quien tiene «Clientes».`}</EstadoVacio>
        </>
      );
    }
    const nuevo = c.interesado ? await pasosDelInteresado(c.interesado, c.consultaId) : undefined;
    const duraciones = c.lineas.map((l) => l.duracion);
    // Los precios de la cotización, con Pagos o con Cotizaciones (RN-12), como en "Por reservar"
    const verMontos = conPagos || puedeVerModulo(usuario, "cotizaciones");
    // Elegida en el paso Servicios de la reserva (llega con su cliente y vehículo): es el último paso y se puede volver.
    // Desde "Por reservar" o la cotización, arriba van los pasos del trabajo
    const enLosPasos = !!c.cliente && !!c.vehiculo && numero("cliente") === c.cliente.id && numero("vehiculo") === c.vehiculo.id;
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
            nuevo,
          }}
          conPagos={conPagos}
          hoy={hoy}
          fechaInicial={fechaInicial}
          fechaFin={fechaInicial ? fechaEntregaSugerida(fechaInicial, duraciones) : ""}
          atras={enLosPasos ? direccion({ cliente: c.cliente!.id, vehiculo: c.vehiculo!.id }) : undefined}
          // Elegida en los pasos: tocar el cliente, el vehículo o los servicios en el indicador vuelve a ellos (20/11)
          pasosHechos={
            enLosPasos
              ? [{ href: direccion({}) }, { href: direccion({ cliente: c.cliente!.id }) }, { href: direccion({ cliente: c.cliente!.id, vehiculo: c.vehiculo!.id }) }]
              : undefined
          }
          arriba={c.cliente && <ParaQuien nombre={c.cliente.nombre} vehiculo={c.vehiculo} />}
        />
      </>
    );
}

/**
 * Los pasos del cliente y el vehículo de un interesado (P31b-cotizacion-rapida.md §5): escritos con lo que se anotó al
 * cotizar (nombre, WhatsApp, placa y tamaño) y, en el del vehículo, la foto. Con su WhatsApp ya de un cliente, la reserva
 * queda con él y empieza en el vehículo.
 */
async function pasosDelInteresado(i: InteresadoDeCotizacion, consultaId: number) {
  const [tamanos, catalogo, foto] = await Promise.all([tamanosActivos(), catalogoVehiculos(), fotoDeConsulta(consultaId)]);
  return {
    clienteNuevo: !i.clienteExistente,
    nombreCliente: i.clienteExistente?.nombre,
    tamanos,
    catalogo,
    opcionesPorTamano: {},
    iniciales: {
      nombre: i.nombre,
      telefono: formatearWhatsApp(i.telefono),
      [`${PREFIJO_VEHICULO}placa`]: i.placa ?? "",
      [`${PREFIJO_VEHICULO}tamanoId`]: String(i.tamanoId),
    },
    ayuda: <AyudaVehiculo foto={foto} existente={i.clienteExistente?.nombre} />,
  };
}

/** Arriba del paso del vehículo: la foto de cuando cotizó y, si su WhatsApp ya es de un cliente, que queda con él. */
function AyudaVehiculo({ foto, existente }: { foto: UrlsFoto | null; existente?: string }) {
  if (!foto && !existente) return null;
  return (
    <div className="flex items-center gap-3">
      {foto && (
        <AbrirFoto fotos={[{ ...foto, alt: "Foto del vehículo al cotizar" }]} indice={0} titulo="Foto del vehículo" etiqueta="Ver la foto del vehículo" className="shrink-0 rounded-sm">
          <Image src={foto.miniatura} alt="" width={96} height={72} unoptimized className="h-18 w-24 rounded-sm object-cover" />
        </AbrirFoto>
      )}
      <p className="text-sm text-tinta-suave">
        {existente ? `Ese WhatsApp ya es de ${existente}: la reserva queda con él.` : "La foto de cuando vino a cotizar."}
      </p>
    </div>
  );
}
