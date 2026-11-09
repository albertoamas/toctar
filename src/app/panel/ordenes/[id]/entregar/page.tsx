import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { cn } from "cn";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { PaginaPanel } from "@/componentes/panel/pagina-panel";
import { Seccion } from "@/componentes/panel/cabecera-seccion";
import { ListaDatos } from "@/componentes/panel/lista-datos";
import { fechaEnBolivia, formatearFecha } from "@/lib/fechas";
import { puede, puedeVerModulo } from "@/lib/permisos";
import { exigirModulo } from "@/lib/sesion";
import { mostrarMonto } from "@/modulos/catalogo/reglas";
import { detalleVehiculo } from "@/modulos/clientes/reglas";
import { FormularioEntrega } from "@/modulos/ordenes/componentes/formulario-entrega";
import { vistaPreviaPlanes } from "@/modulos/mantenimientos/planes";
import { obtenerOrden } from "@/modulos/ordenes/consultas";
import { MontosTrabajo } from "@/modulos/pagos/componentes/montos-trabajo";
import { estaPagada } from "@/modulos/pagos/reglas";
import { filaVehiculo } from "@/modulos/clientes/componentes/datos-vehiculo";

export const metadata: Metadata = { title: "Entregar vehículo" };

// HU-36: entregar el vehículo (RF-43, RF-49, CU-19). El dueño o el encargado con "Órdenes", desde una orden lista: el
// precio final, lo pagado y el saldo (con "Pagos"; sin ellos, solo si queda saldo), cobrar ahí mismo y confirmar. Con
// saldo, solo quien puede autorizarlo (RN-13). Se anticipa lo que pasa con los planes de mantenimiento del vehículo (RN-08, pedido 21).
// Pulido 11.4: con saldo, "Falta cobrar" y "Registrar pago" van antes de la casilla de entregar con saldo, que es la
// excepción; el botón, fijo abajo en el celular.
export default function PaginaEntregar({ params }: PageProps<"/panel/ordenes/[id]/entregar">) {
  return (
    <PaginaPanel tipo="formulario">
      <Suspense fallback={<Cargando />}>
        <Entrega params={params} />
      </Suspense>
    </PaginaPanel>
  );
}

async function Entrega({ params }: Pick<PageProps<"/panel/ordenes/[id]/entregar">, "params">) {
  const usuario = await exigirModulo("ordenes");
  if (!puede(usuario, "entregar_vehiculo")) redirect("/panel/sin-acceso");
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const conPagos = puedeVerModulo(usuario, "pagos");
  // Con los montos siempre, para saber si queda saldo; se muestran solo a quien ve pagos
  const o = await obtenerOrden(Number(id), true);
  if (!o || !o.montos) notFound();
  if (o.estado !== "listo") redirect(`/panel/ordenes/${o.id}`);
  const hoy = fechaEnBolivia();
  // Lo que la entrega va a hacer con los planes de mantenimiento del vehículo: la misma regla que la acción (pedido 21)
  const planes = await vistaPreviaPlanes(o.id, o.vehiculoId, hoy);
  const saldo = o.montos.saldo.saldo;
  const conDeuda = !estaPagada(saldo);
  const detalle = detalleVehiculo(o);

  return (
    <>
      <EncabezadoPagina titulo={`Entregar ${o.placa}`} volver={{ href: `/panel/ordenes/${o.id}`, texto: "Orden" }} />
      {/* Lo que se entrega, como en Recibir (pulido de Entregar, 09/11) */}
      <div className="tt-tarjeta-panel p-4">
        <ListaDatos
          nombre="Lo que se entrega"
          filas={[
            ["Cliente", <span key="cliente" className="font-semibold">{o.cliente}</span>],
            filaVehiculo(detalle, o.tamano),
          ]}
        />
      </div>

      {conPagos ? (
        <MontosTrabajo trabajoId={o.id} montos={o.montos} cerrado={false} hoy={hoy} cobrar />
      ) : conDeuda && !puede(usuario, "entrega_con_saldo") ? null : (
        // Sin Pagos: el saldo no se muestra, pero se sabe si queda, con los colores de MontosTrabajo (ámbar si queda, verde
        // si está pagado). Si además no puede entregar con saldo, lo dice una vez el formulario, con por qué
        <p className={cn("rounded-sm border p-3 font-semibold", conDeuda ? "border-aviso bg-aviso-fondo text-aviso" : "border-transparent bg-exito-fondo text-exito")}>
          {conDeuda ? "Queda saldo pendiente." : "Pagado por completo."}
        </p>
      )}

      {/* Lo que la entrega hace con los planes de mantenimiento: una sección con su título, para que se vea */}
      {(planes.programa.length > 0 || planes.hechos.length > 0) && (
        <Seccion id="mantenimiento" titulo="Mantenimiento">
          <ul className="flex flex-col gap-1">
            {/* Por posición: dos planes pueden decir lo mismo (dos servicios con el mismo mantenimiento) */}
            {planes.hechos.map((servicio, i) => (
              <li key={`hecho-${i}`}>Queda hecho el mantenimiento de {servicio}.</li>
            ))}
            {planes.programa.map((p, i) => (
              <li key={`programa-${i}`}>
                Se programará: {p.servicio}, el {formatearFecha(p.fecha)}.
              </li>
            ))}
          </ul>
        </Seccion>
      )}

      <FormularioEntrega id={o.id} conDeuda={conDeuda} saldo={conPagos ? `${mostrarMonto(saldo)} Bs` : null} puedeAutorizar={puede(usuario, "entrega_con_saldo")} cliente={o.cliente} />
    </>
  );
}
