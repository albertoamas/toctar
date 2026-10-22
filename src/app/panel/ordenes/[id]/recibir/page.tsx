import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { EnlaceVolver } from "@/componentes/enlace-volver";
import { Cargando } from "@/componentes/panel/cargando";
import { fechaEnBolivia, formatearFecha } from "@/lib/fechas";
import { exigirModulo } from "@/lib/sesion";
import { tecnicosActivos } from "@/modulos/agenda/consultas";
import { FormularioRecepcion } from "@/modulos/ordenes/componentes/formulario-recepcion";
import { FotosOrden } from "@/modulos/ordenes/componentes/fotos-orden";
import { obtenerOrden } from "@/modulos/ordenes/consultas";
import { esOrden, puedeRecibirse } from "@/modulos/ordenes/reglas";

export const metadata: Metadata = { title: "Recibir vehículo" };

// HU-33: recibir el vehículo (RF-40, CU-15). Dueño o encargado con "Órdenes", desde el día de ingreso de la reserva:
// fotos de ingreso con la cámara, observaciones y técnico. Al recibirlo, la reserva pasa a orden.
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
  if (usuario.rol === "tecnico") redirect("/panel/sin-acceso");
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const [o, tecnicos] = await Promise.all([obtenerOrden(Number(id), false), tecnicosActivos()]);
  if (!o) notFound();
  if (esOrden(o.estado)) redirect(`/panel/ordenes/${o.id}`);
  if (o.estado !== "agendado") redirect(`/panel/agenda/${o.id}`);
  const hoy = fechaEnBolivia();
  const yo = Number(usuario.id);
  const fotos = o.fotos.filter((f) => f.etapa === "ingreso").map((f) => ({ ...f, puedeQuitar: usuario.rol === "dueno" || f.subidoPor === yo }));

  return (
    <>
      <EnlaceVolver href={`/panel/agenda/${o.id}`}>Reserva</EnlaceVolver>
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-4xl font-extrabold italic">Recibir {o.placa}</h1>
        <p>{o.cliente}</p>
        <p className="text-sm text-tinta-suave">{o.tamano}</p>
      </div>
      {!puedeRecibirse(o, hoy) ? (
        <p className="rounded-sm border border-aviso p-3">
          Esa reserva todavía no llega a su día de ingreso ({formatearFecha(o.fechaInicio)}): reprográmala.{" "}
          <Link href={`/panel/agenda/${o.id}`} className="font-semibold underline">
            Ir a la reserva
          </Link>
        </p>
      ) : (
        <>
          <section aria-labelledby="servicios-titulo" className="flex flex-col gap-2">
            <h2 id="servicios-titulo" className="font-heading text-2xl font-bold italic">Servicios</h2>
            <ul className="list-disc pl-5">
              {o.servicios.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="ingreso-titulo" className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <h2 id="ingreso-titulo" className="font-heading text-2xl font-bold italic">Fotos de ingreso</h2>
              <p className="text-sm text-tinta-suave">Todo el vehículo y cada detalle: rayones, golpes, el interior. Después de recibirlo ya no se quitan.</p>
            </div>
            <FotosOrden trabajoId={o.id} etapa="ingreso" fotos={fotos} editable textoVacio="" sinTitulo />
          </section>
          <FormularioRecepcion trabajoId={o.id} tecnicos={tecnicos} tecnicoInicial={o.tecnicoId} conFotos={fotos.length > 0} />
        </>
      )}
    </>
  );
}
