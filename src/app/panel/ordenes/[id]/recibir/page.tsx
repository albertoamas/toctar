import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { EnlaceVolver } from "@/componentes/enlace-volver";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { fechaEnBolivia, formatearFecha } from "@/lib/fechas";
import { puede, puedeVerModulo } from "@/lib/permisos";
import { exigirModulo } from "@/lib/sesion";
import { tecnicosActivos } from "@/modulos/agenda/consultas";
import { detalleVehiculo } from "@/modulos/clientes/reglas";
import { ChecklistRecepcion } from "@/modulos/ordenes/componentes/checklist-recepcion";
import { FormularioRecepcion } from "@/modulos/ordenes/componentes/formulario-recepcion";
import { FotosOrden } from "@/modulos/ordenes/componentes/fotos-orden";
import { revisionDeTrabajo, fotosDeTrabajo, obtenerOrden, partesDelChecklist } from "@/modulos/ordenes/consultas";
import { esOrden, puedeRecibirse } from "@/modulos/ordenes/reglas";

export const metadata: Metadata = { title: "Recibir vehículo" };

// HU-33: recibir el vehículo (RF-40, CU-15). Dueño o encargado con "Órdenes", desde el día de ingreso de la reserva:
// el checklist de partes (pedido 12), fotos de ingreso con la cámara, observaciones y técnico. Al recibirlo, la reserva pasa a orden. Pulido 11.3: arriba,
// quién y qué vehículo (para confirmar que es el auto correcto) y sus servicios en una línea; el botón, fijo abajo en el
// celular.
export default function PaginaRecibir({ params }: PageProps<"/panel/ordenes/[id]/recibir">) {
  return (
    <section className="flex max-w-3xl flex-col gap-6">
      <Suspense fallback={<Cargando />}>
        <Recepcion params={params} />
      </Suspense>
    </section>
  );
}

async function Recepcion({ params }: Pick<PageProps<"/panel/ordenes/[id]/recibir">, "params">) {
  const usuario = await exigirModulo("ordenes");
  // La recepción sale de la agenda, que el técnico no ve (C4 §12)
  if (!puede(usuario, "recibir_vehiculo")) redirect("/panel/sin-acceso");
  const verAgenda = puedeVerModulo(usuario, "agenda");
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const [o, tecnicos] = await Promise.all([obtenerOrden(Number(id), false), tecnicosActivos()]);
  if (!o) notFound();
  if (esOrden(o.estado)) redirect(`/panel/ordenes/${o.id}`);
  // Cancelada: no hay nada que recibir; se ve en la agenda, si quien entra la ve
  if (o.estado !== "agendado") {
    if (!verAgenda) notFound();
    redirect(`/panel/agenda/${o.id}`);
  }
  const hoy = fechaEnBolivia();
  const detalle = detalleVehiculo(o);
  const yo = Number(usuario.id);
  const tecnicoInactivo = o.tecnicoId && !tecnicos.some((t) => t.id === o.tecnicoId) ? o.tecnico : null;
  const [todas, partes, revision] = await Promise.all([fotosDeTrabajo(o.id, ["ingreso"]), partesDelChecklist(), revisionDeTrabajo(o.id)]);
  const fotos = todas.map((f) => ({ ...f, puedeQuitar: usuario.rol === "dueno" || f.subidoPor === yo }));

  return (
    <>
      {verAgenda ? <EnlaceVolver href={`/panel/agenda/${o.id}`}>Reserva</EnlaceVolver> : <EnlaceVolver href="/panel/ordenes">Órdenes</EnlaceVolver>}
      <EncabezadoPagina titulo={`Recibir ${o.placa}`}>
        {o.cliente}, {detalle.length > 0 ? `${detalle.join(" ")} (tamaño: ${o.tamano})` : `tamaño: ${o.tamano}`}
      </EncabezadoPagina>
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
          <p>
            <span className="text-tinta-suave">Servicios:</span> {o.servicios.join(", ")}
          </p>
          <ChecklistRecepcion trabajoId={o.id} partes={partes} revision={revision} />
          <section aria-labelledby="ingreso-titulo" className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <h2 id="ingreso-titulo" className="font-heading text-2xl font-bold italic">Fotos de ingreso</h2>
              <p className="text-sm text-tinta-suave">Todo el vehículo. Los detalles, con su foto en el checklist. Después de recibirlo ya no se quitan.</p>
            </div>
            <FotosOrden trabajoId={o.id} etapa="ingreso" fotos={fotos} editable textoVacio="" sinTitulo />
          </section>
          <FormularioRecepcion trabajoId={o.id} tecnicos={tecnicos} tecnicoInicial={o.tecnicoId} tecnicoInactivo={tecnicoInactivo} />
        </>
      )}
    </>
  );
}
