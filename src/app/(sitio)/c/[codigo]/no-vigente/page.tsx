import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { IconoWhatsApp, Monograma } from "@/componentes/sitio/iconos-marca";
import { db } from "@/db";
import { cotizacion } from "@/db/esquema";
import { fechaEnBolivia, formatearFecha } from "@/lib/fechas";
import { enlaceWhatsApp } from "@/lib/whatsapp";
import { obtenerDatosPublicos } from "@/modulos/configuracion/consultas";
import { esCodigoEnlace, estadoEnlace, rutaEnlace } from "@/modulos/cotizaciones/reglas";

// Pedido 47: a dónde lleva el enlace de una cotización que ya no vale. Dice por qué (tiene una versión nueva o venció) y
// ofrece escribir al negocio. Sin datos del cliente ni montos: el enlace pudo llegar a otra persona.

export const metadata: Metadata = { title: "Cotización", robots: { index: false, follow: false } };

export default function PaginaCotizacionNoVigente({ params }: PageProps<"/c/[codigo]/no-vigente">) {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <Contenido params={params} />
    </Suspense>
  );
}

async function Contenido({ params }: Pick<PageProps<"/c/[codigo]/no-vigente">, "params">) {
  await connection();
  const { codigo } = await params;
  if (!esCodigoEnlace(codigo)) notFound();
  const [[c], negocio] = await Promise.all([
    db.select({ estado: cotizacion.estado, validaHasta: cotizacion.validaHasta }).from(cotizacion).where(eq(cotizacion.enlace, codigo)),
    obtenerDatosPublicos(),
  ]);
  if (!c) notFound();
  const estado = estadoEnlace(c.estado, c.validaHasta, fechaEnBolivia());
  // Todavía vale (alguien llegó aquí escribiendo la dirección): el PDF
  if (estado === "vale") redirect(rutaEnlace(codigo));
  const reemplazada = estado === "reemplazada";
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center">
      <Monograma className="w-24 fill-tinta" />
      <h1 className="font-heading text-[40px] leading-[44px] font-extrabold italic">
        {reemplazada ? "Esta cotización tiene una versión nueva" : `Esta cotización venció el ${formatearFecha(c.validaHasta)}`}
      </h1>
      <p className="max-w-md text-tinta-suave">
        {reemplazada ? `Pídele la última a ${negocio.nombre} por WhatsApp.` : "Escríbenos y te mandamos una actualizada."}
      </p>
      {negocio.whatsapp && (
        <a href={enlaceWhatsApp(negocio.whatsapp)} target="_blank" rel="noreferrer" className="tt-boton tt-boton--principal">
          <IconoWhatsApp className="size-5" />
          Escribir por WhatsApp
        </a>
      )}
    </section>
  );
}
