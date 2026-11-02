import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { EnlaceVolver } from "@/componentes/enlace-volver";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
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

export const metadata: Metadata = { title: "Entregar vehículo" };

// HU-36: entregar el vehículo (RF-43, RF-49, CU-19). El dueño o el encargado con "Órdenes", desde una orden lista: el
// precio final, lo pagado y el saldo (con "Pagos"; sin ellos, solo si queda saldo), cobrar ahí mismo y confirmar. Con
// saldo, solo quien puede autorizarlo (RN-13). Se anticipa lo que pasa con los planes de mantenimiento del vehículo (RN-08, pedido 21).
// Pulido 11.4: con saldo, "Falta cobrar" y "Registrar pago" van antes de la casilla de entregar con saldo, que es la
// excepción; el botón, fijo abajo en el celular.
export default function PaginaEntregar({ params }: PageProps<"/panel/ordenes/[id]/entregar">) {
  return (
    <section className="flex max-w-3xl flex-col gap-6">
      <Suspense fallback={<Cargando />}>
        <Entrega params={params} />
      </Suspense>
    </section>
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

  return (
    <>
      <EnlaceVolver href={`/panel/ordenes/${o.id}`}>Orden</EnlaceVolver>
      <EncabezadoPagina titulo={`Entregar ${o.placa}`}>{[o.cliente, detalleVehiculo(o).join(" ")].filter(Boolean).join(", ")}</EncabezadoPagina>

      {conPagos ? (
        <MontosTrabajo trabajoId={o.id} montos={o.montos} cerrado={false} hoy={hoy} cobrar />
      ) : (
        <p className="text-lg font-semibold">{conDeuda ? "Queda saldo pendiente." : "Pagado."}</p>
      )}

      {(planes.programa.length > 0 || planes.hechos.length > 0) && (
        <div className="flex flex-col gap-1 tt-tarjeta-panel p-3 text-sm">
          {/* Por posición: dos planes pueden decir lo mismo (dos servicios con el mismo mantenimiento) */}
          {planes.hechos.map((servicio, i) => (
            <p key={`hecho-${i}`}>Queda hecho el mantenimiento de {servicio}.</p>
          ))}
          {planes.programa.map((p, i) => (
            <p key={`programa-${i}`}>
              Se programará: {p.servicio}, el {formatearFecha(p.fecha)}.
            </p>
          ))}
        </div>
      )}

      <FormularioEntrega id={o.id} conDeuda={conDeuda} saldo={conPagos ? `${mostrarMonto(saldo)} Bs` : null} puedeAutorizar={puede(usuario, "entrega_con_saldo")} cliente={o.cliente} />
    </>
  );
}
