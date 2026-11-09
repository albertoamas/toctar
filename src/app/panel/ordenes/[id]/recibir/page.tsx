import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { PaginaPanel } from "@/componentes/panel/pagina-panel";
import { ListaDatos } from "@/componentes/panel/lista-datos";
import { fechaEnBolivia, formatearFecha } from "@/lib/fechas";
import { puede, puedeVerModulo } from "@/lib/permisos";
import { exigirModulo } from "@/lib/sesion";
import { detalleVehiculo } from "@/modulos/clientes/reglas";
import { AvanceRecepcion, ChecklistRecepcion } from "@/modulos/ordenes/componentes/checklist-recepcion";
import { FormularioRecepcion } from "@/modulos/ordenes/componentes/formulario-recepcion";
import { obtenerOrden, partesDelChecklist, revisionDeTrabajo } from "@/modulos/ordenes/consultas";
import { esOrden, puedeRecibirse } from "@/modulos/ordenes/reglas";

export const metadata: Metadata = { title: "Recibir vehículo" };

// HU-33: recibir el vehículo (RF-40, CU-15). Dueño o encargado con "Órdenes", desde el día de ingreso de la reserva:
// el checklist de partes (pedido 12), con la foto de cada detalle (pedido 27: no hay otras fotos al recibir),
// y las observaciones. Al recibirlo, la reserva pasa a orden. Pulido 11.3 y pulido de Recibir (09/11): arriba, en un
// recuadro, quién, qué vehículo (para confirmar que es el auto correcto) y sus servicios; al final, "Recibir vehículo"
// grande (fijo abajo en el celular) con cuántas partes faltan.
export default function PaginaRecibir({ params }: PageProps<"/panel/ordenes/[id]/recibir">) {
  return (
    <PaginaPanel tipo="formulario">
      <Suspense fallback={<Cargando />}>
        <Recepcion params={params} />
      </Suspense>
    </PaginaPanel>
  );
}

async function Recepcion({ params }: Pick<PageProps<"/panel/ordenes/[id]/recibir">, "params">) {
  const usuario = await exigirModulo("ordenes");
  if (!puede(usuario, "recibir_vehiculo")) redirect("/panel/sin-acceso");
  const verAgenda = puedeVerModulo(usuario, "agenda");
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const o = await obtenerOrden(Number(id), false);
  if (!o) notFound();
  if (esOrden(o.estado)) redirect(`/panel/ordenes/${o.id}`);
  // Cancelada: no hay nada que recibir; se ve en la agenda, si quien entra la ve
  if (o.estado !== "agendado") {
    if (!verAgenda) notFound();
    redirect(`/panel/agenda/${o.id}`);
  }
  const hoy = fechaEnBolivia();
  const detalle = detalleVehiculo(o);
  const [partes, revision] = await Promise.all([partesDelChecklist(), revisionDeTrabajo(o.id)]);

  return (
    <>
      <EncabezadoPagina titulo={`Recibir ${o.placa}`} volver={verAgenda ? { href: `/panel/agenda/${o.id}`, texto: "Reserva" } : { href: "/panel/ordenes", texto: "Órdenes" }} />
      {!puedeRecibirse(o, hoy) ? (
        <p className="rounded-sm border border-aviso p-3">
          Esa reserva todavía no llega a su día de ingreso ({formatearFecha(o.fechaInicio)}): reprográmala.{" "}
          {verAgenda && (
            <Link href={`/panel/agenda/${o.id}`} className="font-semibold underline">
              Ir a la reserva
            </Link>
          )}
        </p>
      ) : (
        <>
          {/* Lo que se recibe, como los datos de Reserva y Orden (pulido de Recibir, 09/11). Sin servicios, sin esa fila */}
          <div className="tt-tarjeta-panel p-4">
            <ListaDatos
              nombre="Lo que se recibe"
              filas={[
                ["Cliente", <span key="cliente" className="font-semibold">{o.cliente}</span>],
                [
                  "Vehículo",
                  <span key="vehiculo" className="flex flex-col">
                    {detalle.length > 0 && <span>{detalle.join(" ")}</span>}
                    <span className="text-sm text-tinta-suave">Tamaño: {o.tamano}</span>
                  </span>,
                ],
                o.servicios.length > 0 && [
                  "Servicios",
                  <ul key="servicios" className="flex flex-col">
                    {o.servicios.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>,
                ],
              ]}
            />
          </div>
          <AvanceRecepcion>
            <ChecklistRecepcion trabajoId={o.id} partes={partes} revision={revision} />
            {/* Las que faltan: las activas sin revisar (una desactivada ya revisada no cuenta) */}
            <FormularioRecepcion trabajoId={o.id} faltan={partes.filter((p) => !revision.some((r) => r.parteId === p.id)).length} />
          </AvanceRecepcion>
        </>
      )}
    </>
  );
}
