import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { cn } from "cn";
import { EnlaceVolver } from "@/componentes/enlace-volver";
import { Cargando } from "@/componentes/panel/cargando";
import { IconoWhatsApp } from "@/componentes/sitio/iconos-marca";
import { buttonVariants } from "@/componentes/ui/button";
import { fechaEnBolivia, formatearFecha, formatearFechaHora } from "@/lib/fechas";
import { exigirModulo } from "@/lib/sesion";
import { enlaceWhatsApp, formatearWhatsApp } from "@/lib/whatsapp";
import { AtenderReclamo } from "@/modulos/reclamos/componentes/atender-reclamo";
import { InsigniaEstado } from "@/modulos/reclamos/componentes/estado-reclamo";
import { FotosReclamo } from "@/modulos/reclamos/componentes/fotos-reclamo";
import { obtenerReclamo } from "@/modulos/reclamos/consultas";
import { mensajeAlCliente } from "@/modulos/reclamos/reglas";

export const metadata: Metadata = { title: "Reclamo" };

// HU-17: datos y fotos de un reclamo; escribirle al cliente y marcarlo como atendido.
export default function PaginaReclamo({ params }: PageProps<"/panel/reclamos/[id]">) {
  return (
    <section className="flex flex-col gap-6">
      <EnlaceVolver href="/panel/reclamos">Reclamos</EnlaceVolver>
      <Suspense fallback={<Cargando />}>
        <Detalle params={params} />
      </Suspense>
    </section>
  );
}

async function Detalle({ params }: Pick<PageProps<"/panel/reclamos/[id]">, "params">) {
  await exigirModulo("reclamos");
  const { id } = await params;
  const numero = Number(id);
  if (!Number.isInteger(numero) || numero <= 0) notFound();
  const r = await obtenerReclamo(numero);
  if (!r) notFound();
  const recibido = formatearFecha(fechaEnBolivia(r.createdAt));

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-heading text-4xl font-extrabold italic">{r.nombre}</h1>
        <InsigniaEstado estado={r.estado} />
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,36rem)_minmax(0,22rem)]">
        <div className="flex flex-col gap-6">
          {/* Dos columnas también en el celular: así responder y atender quedan más cerca (pulido 5.2) */}
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
            <Dato termino="Recibido" ancho>{formatearFechaHora(r.createdAt)}</Dato>
            <Dato termino="WhatsApp">{formatearWhatsApp(r.telefono)}</Dato>
            <Dato termino="Placa">{r.placa}</Dato>
            <Dato termino="Servicio">{r.servicio ?? "No indicó"}</Dato>
            <Dato termino="Fecha aproximada del trabajo">{r.fechaAproximada ? formatearFecha(r.fechaAproximada) : "No indicó"}</Dato>
          </dl>
          <div className="flex flex-col gap-2">
            <h2 className="font-heading text-xl font-bold italic">Qué pasó</h2>
            <p className="whitespace-pre-line">{r.descripcion}</p>
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="font-heading text-xl font-bold italic">Fotos</h2>
            {r.fotos.length > 0 ? <FotosReclamo fotos={r.fotos} /> : <p className="text-tinta-suave">No mandó fotos.</p>}
          </div>
        </div>

        <div className="flex flex-col gap-8">
          <section className="flex flex-col items-start gap-2">
            <h2 className="font-heading text-xl font-bold italic">Responder</h2>
            <p className="text-sm text-tinta-suave">Abre el chat con {r.nombre} con un saludo ya escrito.</p>
            {/* Con cn: sin él, el borde transparente de la base le ganaba al del contorno y no se veía (revisión de botones) */}
            <a href={enlaceWhatsApp(r.telefono, mensajeAlCliente(r.nombre, recibido))} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: "outline" }))}>
              <IconoWhatsApp />
              Escribir por WhatsApp
            </a>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-heading text-xl font-bold italic">Atención</h2>
            {r.estado === "pendiente" ? (
              <AtenderReclamo id={r.id} />
            ) : (
              <div className="flex flex-col gap-1 rounded-sm border border-border bg-superficie p-4">
                <p className="whitespace-pre-line">{r.notaAtencion}</p>
                <p className="text-sm text-tinta-suave">
                  {r.atendidoPor ?? "Usuario borrado"}
                  {r.atendidoAt && `, ${formatearFechaHora(r.atendidoAt)}`}
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

function Dato({ termino, ancho, children }: { termino: string; ancho?: boolean; children: React.ReactNode }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", ancho && "col-span-2 sm:col-span-1")}>
      <dt className="text-sm text-tinta-suave">{termino}</dt>
      <dd className="font-semibold">{children}</dd>
    </div>
  );
}
