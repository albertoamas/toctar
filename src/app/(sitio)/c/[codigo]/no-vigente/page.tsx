import type { Metadata } from "next";
import { eq, sql } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { IconoWhatsApp, Monograma } from "@/componentes/sitio/iconos-marca";
import { db } from "@/db";
import { consulta, cotizacion } from "@/db/esquema";
import { fechaEnBolivia, formatearFecha } from "@/lib/fechas";
import { enlaceWhatsApp } from "@/lib/whatsapp";
import { obtenerDatosPublicos } from "@/modulos/configuracion/consultas";
import { esCodigoEnlace, estadoEnlace, rutaEnlace } from "@/modulos/cotizaciones/reglas";

// Pedido 47: a dónde lleva el enlace de una cotización que ya no vale. Dice por qué (tiene una versión nueva, venció o se
// rechazó) y
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
    db
      .select({ estado: cotizacion.estado, validaHasta: cotizacion.validaHasta, rechazada: sql<boolean>`${consulta.estado} = 'perdido'` })
      .from(cotizacion)
      .innerJoin(consulta, eq(cotizacion.consultaId, consulta.id))
      .where(eq(cotizacion.enlace, codigo)),
    obtenerDatosPublicos(),
  ]);
  if (!c) notFound();
  const estado = estadoEnlace(c, fechaEnBolivia());
  // Todavía vale (alguien llegó aquí escribiendo la dirección): el PDF
  if (estado === "vale") redirect(rutaEnlace(codigo));
  const texto = {
    reemplazada: { titulo: "Esta cotización tiene una versión nueva", detalle: `Pídele la última a ${negocio.nombre} por WhatsApp.` },
    vencida: { titulo: `Esta cotización venció el ${formatearFecha(c.validaHasta)}`, detalle: "Escríbenos y te mandamos una actualizada." },
    rechazada: { titulo: "Esta cotización ya no está vigente", detalle: "Escríbenos y te mandamos una actualizada." },
  }[estado];
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center">
      <Monograma className="w-24 fill-tinta" />
      <h1 className="font-heading text-[40px] leading-[44px] font-extrabold italic">{texto.titulo}</h1>
      <p className="max-w-md text-tinta-suave">{texto.detalle}</p>
      {negocio.whatsapp && (
        <a href={enlaceWhatsApp(negocio.whatsapp)} target="_blank" rel="noreferrer" className="tt-boton tt-boton--principal">
          <IconoWhatsApp className="size-5" />
          Escribir por WhatsApp
        </a>
      )}
    </section>
  );
}
