import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChevronLeftIcon } from "lucide-react";
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
      <Link href="/panel/reclamos" className="flex items-center gap-1 text-sm text-tinta-suave hover:text-tinta">
        <ChevronLeftIcon className="size-4" aria-hidden />
        Reclamos
      </Link>
      <Suspense fallback={<p className="text-tinta-suave">Cargando…</p>}>
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
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <Dato termino="Recibido">{formatearFechaHora(r.createdAt)}</Dato>
            <Dato termino="WhatsApp">{formatearWhatsApp(r.telefono)}</Dato>
            <Dato termino="Placa">{r.placa}</Dato>
            <Dato termino="Servicio">{r.servicio ?? "No indicó"}</Dato>
            <Dato termino="Fecha aproximada del trabajo">{r.fechaAproximada ? formatearFecha(r.fechaAproximada) : "No indicó"}</Dato>
          </dl>
          <div className="flex flex-col gap-2">
            <h2 className="font-semibold">Qué pasó</h2>
            <p className="whitespace-pre-line">{r.descripcion}</p>
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="font-semibold">Fotos</h2>
            {r.fotos.length > 0 ? <FotosReclamo fotos={r.fotos} /> : <p className="text-tinta-suave">No mandó fotos.</p>}
          </div>
        </div>

        <div className="flex flex-col gap-8">
          <section className="flex flex-col items-start gap-2">
            <h2 className="font-semibold">Responder</h2>
            <p className="text-sm text-tinta-suave">Abre el chat con {r.nombre} con un saludo ya escrito.</p>
            <a href={enlaceWhatsApp(r.telefono, mensajeAlCliente(r.nombre, recibido))} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline" })}>
              <IconoWhatsApp />
              Escribir por WhatsApp
            </a>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-semibold">Atención</h2>
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

function Dato({ termino, children }: { termino: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-sm text-tinta-suave">{termino}</dt>
      <dd className="font-semibold">{children}</dd>
    </div>
  );
}
