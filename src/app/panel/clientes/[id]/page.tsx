import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EnlaceVolver } from "@/componentes/enlace-volver";
import { AvisoEnPagina } from "@/componentes/panel/aviso-en-pagina";
import { Cargando } from "@/componentes/panel/cargando";
import { exigirModulo } from "@/lib/sesion";
import { formatearWhatsApp } from "@/lib/whatsapp";
import { obtenerCliente } from "@/modulos/clientes/consultas";

export const metadata: Metadata = { title: "Cliente" };

// HU-21 y HU-23: ficha del cliente. En HU-21, sus datos y vehículos; la edición y el historial llegan después (C1 §2).
export default function PaginaCliente({ params, searchParams }: PageProps<"/panel/clientes/[id]">) {
  return (
    <section className="flex flex-col gap-6">
      <EnlaceVolver href="/panel/clientes">Clientes</EnlaceVolver>
      <Suspense fallback={<Cargando />}>
        <Ficha params={params} searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function Ficha({ params, searchParams }: Pick<PageProps<"/panel/clientes/[id]">, "params" | "searchParams">) {
  await exigirModulo("clientes");
  const [{ id }, { creado }] = await Promise.all([params, searchParams]);
  const numero = Number(id);
  if (!Number.isInteger(numero) || numero <= 0) notFound();
  const c = await obtenerCliente(numero);
  if (!c) notFound();
  const vehiculos = c.vehiculos.filter((v) => v.activo);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-heading text-4xl font-extrabold italic">{c.nombre}</h1>
        {!c.activo && <span className="tt-insignia">Desactivado</span>}
      </div>
      {creado && <AvisoEnPagina>Cliente {c.nombre} creado.</AvisoEnPagina>}

      <div className="grid max-w-4xl gap-10 lg:grid-cols-2">
        <section aria-labelledby="datos-titulo" className="flex flex-col gap-4">
          <h2 id="datos-titulo" className="font-heading text-2xl font-bold italic">Datos</h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
            <Dato termino="WhatsApp">{formatearWhatsApp(c.telefono)}</Dato>
            <Dato termino="Correo">{c.correo ?? "No indicó"}</Dato>
            <Dato termino="NIT">{c.nit ?? "No indicó"}</Dato>
            <Dato termino="Razón social">{c.razonSocial ?? "No indicó"}</Dato>
            {c.notas && (
              <Dato termino="Notas" ancho>
                <span className="font-normal whitespace-pre-line">{c.notas}</span>
              </Dato>
            )}
          </dl>
        </section>

        <section aria-labelledby="vehiculos-titulo" className="flex flex-col gap-4">
          <h2 id="vehiculos-titulo" className="font-heading text-2xl font-bold italic">Vehículos</h2>
          {vehiculos.length === 0 ? (
            <p className="text-tinta-suave">Todavía no tiene vehículos.</p>
          ) : (
            <ul aria-label="Vehículos" className="flex flex-col divide-y divide-border rounded-sm border border-border">
              {vehiculos.map((v) => (
                <li key={v.id} className="flex flex-col gap-0.5 p-3">
                  <span className="font-semibold">{v.placa}</span>
                  <span className="flex flex-wrap gap-x-3 text-sm text-tinta-suave">
                    <span>{v.tamano}</span>
                    {(v.marca || v.modelo) && <span>{[v.marca, v.modelo].filter(Boolean).join(" ")}</span>}
                    {v.anio && <span>{v.anio}</span>}
                    {v.color && <span>{v.color}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

function Dato({ termino, ancho, children }: { termino: string; ancho?: boolean; children: React.ReactNode }) {
  return (
    <div className={`flex min-w-0 flex-col gap-1 ${ancho ? "col-span-2" : ""}`}>
      <dt className="text-sm text-tinta-suave">{termino}</dt>
      <dd className="font-semibold break-words">{children}</dd>
    </div>
  );
}
