import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { EnlaceVolver } from "@/componentes/enlace-volver";
import { Cargando } from "@/componentes/panel/cargando";
import { fechaEnBolivia, formatearFecha, sumarMeses } from "@/lib/fechas";
import { puede, puedeVerModulo } from "@/lib/permisos";
import { exigirModulo } from "@/lib/sesion";
import { mostrarMonto } from "@/modulos/catalogo/reglas";
import { obtenerParametros } from "@/modulos/configuracion/consultas";
import { FormularioEntrega } from "@/modulos/ordenes/componentes/formulario-entrega";
import { obtenerOrden, serviciosConMantenimiento } from "@/modulos/ordenes/consultas";
import { MontosTrabajo } from "@/modulos/pagos/componentes/montos-trabajo";
import { estaPagada } from "@/modulos/pagos/reglas";

export const metadata: Metadata = { title: "Entregar vehículo" };

// HU-36: entregar el vehículo (RF-43, RF-49, CU-19). El dueño o el encargado con "Órdenes", desde una orden lista: el
// precio final, lo pagado y el saldo (con "Pagos"; sin ellos, solo si queda saldo), cobrar ahí mismo y confirmar. Con
// saldo, solo quien puede autorizarlo (RN-13). Si un servicio genera mantenimiento, se anticipa la fecha (RN-08).
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
  const [mantenimientos, parametros] = await Promise.all([serviciosConMantenimiento(o.id), obtenerParametros()]);
  const saldo = o.montos.saldo.saldo;
  const conDeuda = !estaPagada(saldo);

  return (
    <>
      <EnlaceVolver href={`/panel/ordenes/${o.id}`}>Orden</EnlaceVolver>
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-4xl font-extrabold italic">Entregar {o.placa}</h1>
        <p>{o.cliente}</p>
      </div>

      {conPagos ? (
        <MontosTrabajo trabajoId={o.id} montos={o.montos} cerrado={false} hoy={hoy} />
      ) : (
        <p className="text-lg font-semibold">{conDeuda ? "Queda saldo pendiente." : "Pagado."}</p>
      )}

      {mantenimientos.length > 0 && (
        <p className="rounded-sm border border-border p-3 text-sm">
          Se programará el mantenimiento de {mantenimientos.map((m) => m.nombre).join(" y ")} para el{" "}
          {formatearFecha(sumarMeses(hoy, parametros.intervalo_mantenimiento_meses))}.
        </p>
      )}

      <FormularioEntrega id={o.id} conDeuda={conDeuda} saldo={conPagos ? `${mostrarMonto(saldo)} Bs` : null} puedeAutorizar={puede(usuario, "entrega_con_saldo")} />
    </>
  );
}
