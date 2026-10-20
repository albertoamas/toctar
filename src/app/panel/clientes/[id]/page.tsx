import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { cn } from "cn";
import { EnlaceVolver } from "@/componentes/enlace-volver";
import { AvisoEnPagina } from "@/componentes/panel/aviso-en-pagina";
import { Cargando } from "@/componentes/panel/cargando";
import { IconoWhatsApp } from "@/componentes/sitio/iconos-marca";
import { buttonVariants } from "@/componentes/ui/button";
import { exigirModulo } from "@/lib/sesion";
import { enlaceWhatsApp, whatsAppLocal } from "@/lib/whatsapp";
import { AccesoCliente } from "@/modulos/clientes/componentes/acceso-cliente";
import { FormularioDatosCliente } from "@/modulos/clientes/componentes/formulario-datos-cliente";
import { VehiculosCliente } from "@/modulos/clientes/componentes/vehiculos-cliente";
import { obtenerCliente } from "@/modulos/clientes/consultas";
import { tamanosActivos } from "@/modulos/configuracion/consultas";

export const metadata: Metadata = { title: "Cliente" };

// HU-23: ficha del cliente: datos, vehículos, WhatsApp y desactivar. El historial de consultas, cotizaciones, órdenes
// y pagos se suma en C2 a C4, a medida que existen sus tablas (C1 §2).
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
  const [c, tamanos] = await Promise.all([obtenerCliente(numero), tamanosActivos()]);
  if (!c) notFound();

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-4">
        <h1 className="font-heading text-4xl font-extrabold italic">{c.nombre}</h1>
        {!c.activo && <span className="tt-insignia">Desactivado</span>}
        {/* Enlace con forma de botón: abre el chat (cn: sin él, el borde del contorno no se ve) */}
        <a href={enlaceWhatsApp(c.telefono)} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: "outline" }), "sm:ml-auto")}>
          <IconoWhatsApp />
          Escribir por WhatsApp
        </a>
      </div>
      {creado && <AvisoEnPagina>Cliente {c.nombre} creado.</AvisoEnPagina>}

      {/* En el celular, primero los vehículos (lo que más se consulta en el taller), después los datos y al final
          desactivar; en la computadora, los datos a la izquierda */}
      <div className="grid max-w-5xl gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:grid-rows-[auto_1fr] lg:items-start">
        <div className="lg:col-start-2 lg:row-start-1">
          <VehiculosCliente clienteId={c.id} vehiculos={c.vehiculos} tamanos={tamanos} />
        </div>
        <div className="lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <FormularioDatosCliente
            id={c.id}
            iniciales={{
              nombre: c.nombre,
              telefono: whatsAppLocal(c.telefono),
              correo: c.correo ?? "",
              nit: c.nit ?? "",
              razonSocial: c.razonSocial ?? "",
              notas: c.notas ?? "",
            }}
          />
        </div>
        <div className="lg:col-start-2 lg:row-start-2">
          <AccesoCliente id={c.id} nombre={c.nombre} activo={c.activo} />
        </div>
      </div>
    </>
  );
}
