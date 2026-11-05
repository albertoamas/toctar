import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { MapPinIcon } from "lucide-react";
import { TituloPagina } from "@/componentes/sitio/titulo-pagina";
import { RedesSociales } from "@/componentes/sitio/redes-sociales";
import { BotonWhatsApp, WhatsAppFijo } from "@/componentes/sitio/whatsapp";
import { resumirHorarios } from "@/lib/horarios";
import { enlaceComoLlegar, mapaDeContacto } from "@/lib/ubicacion";
import { formatearWhatsApp } from "@/lib/whatsapp";
import { obtenerDatosPublicos } from "@/modulos/configuracion/consultas";
import { REDES } from "@/modulos/configuracion/esquemas";
import { contenidoPublico } from "@/modulos/sitio/publico";

export const metadata: Metadata = {
  title: "Contacto",
  description: "Dirección, mapa, horario y WhatsApp de TocTar Detailing en Tarija.",
};

const TITULO = "font-heading text-2xl font-bold italic";

// HU-14 Contacto y mapa (RF-06). Los datos salen de Configuración (HU-04) y la bienvenida del panel (HU-08).
// Tocar la dirección abre Google Maps (en el celular, la app de mapas).
// Llega entera, con el título: nada aparece suelto antes que el resto (pulido 2.1 y 2.5, revisión de YankoSoft).
export default function PaginaContacto() {
  return (
    <>
      <Suspense fallback={<div className="min-h-screen" />}>
        <Datos />
      </Suspense>
      <WhatsAppFijo />
    </>
  );
}

async function Datos() {
  await connection();
  const [d, contacto] = await Promise.all([obtenerDatosPublicos(), contenidoPublico("contacto")]);
  // Pedido 38: la ficha del taller en Google Maps; sin ella, las coordenadas o la dirección
  const mapa = enlaceComoLlegar(d);
  const mapaIncrustado = mapaDeContacto(d);
  const hayRedes = REDES.some((r) => d.redes[r]);

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12 md:py-20">
      <TituloPagina>Contacto</TituloPagina>
      {/* Una sola grilla: en el celular el mapa va justo debajo de "Dónde estamos"; en la computadora ocupa la
          columna derecha a lo alto (pulido 2.7). Como el mapa tiene su lugar fijo, la grilla pone el resto en la primera. */}
      <div className="mt-4 grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:gap-x-10">
        <div className="flex flex-col gap-8">
          <p className="max-w-prose text-lg text-tinta-suave">{contacto.bienvenida as string}</p>
          {d.whatsapp && (
            <div className="flex flex-col items-start gap-2">
              {/* El texto dice lo que gana el cliente; el nombre accesible suma "por WhatsApp" (pulido 2.1) */}
              <BotonWhatsApp texto="Pedir cotización" />
              <span className="text-sm text-tinta-suave">{formatearWhatsApp(d.whatsapp)}</span>
            </div>
          )}
        </div>

        <section aria-labelledby="direccion-titulo" className="flex flex-col gap-2">
          <h2 id="direccion-titulo" className={TITULO}>Dónde estamos</h2>
          <a href={mapa} target="_blank" rel="noreferrer" className="flex items-start gap-2 hover:underline">
            <MapPinIcon className="mt-0.5 size-5 shrink-0 text-rojo-texto" aria-hidden />
            <address className="not-italic">{d.direccion}</address>
          </a>
          <a href={mapa} target="_blank" rel="noreferrer" className="tt-area-toque self-start text-sm font-semibold text-rojo-texto hover:underline">
            Cómo llegar
          </a>
        </section>

        {mapaIncrustado && (
          // Mapa de Google sin clave. Se carga recién al acercarse (loading="lazy") para no frenar la página (RNF-02).
          <div className="relative aspect-[4/3] w-full bg-superficie md:col-start-2 md:row-span-5 md:row-start-1 md:aspect-auto md:min-h-[28rem]">
            <iframe
              title="Mapa del taller de TocTar Detailing"
              src={mapaIncrustado}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="absolute inset-0 h-full w-full border-0"
            />
          </div>
        )}

        <section aria-labelledby="horario-titulo" className="flex flex-col gap-2">
          <h2 id="horario-titulo" className={TITULO}>Horario</h2>
          <dl className="flex flex-col gap-2">
            {resumirHorarios(d.horarios).map((g) => (
              <div key={g.dias} className="flex flex-wrap gap-x-3">
                <dt className="font-semibold">{g.dias}</dt>
                <dd className="text-tinta-suave">{g.horario === "cerrado" ? "Cerrado" : g.horario}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="garantia-titulo" className="flex flex-col gap-2">
          <h2 id="garantia-titulo" className={TITULO}>¿Algo no quedó bien?</h2>
          <p className="text-tinta-suave">Cuéntanos en el formulario de garantía y te respondemos por WhatsApp.</p>
          <Link href="/garantia" className="tt-area-toque self-start text-sm font-semibold text-rojo-texto hover:underline">
            Garantía y reclamos
          </Link>
        </section>

        {(d.correo || hayRedes) && (
          <section aria-labelledby="tambien-titulo" className="flex flex-col gap-3">
            <h2 id="tambien-titulo" className={TITULO}>También estamos en</h2>
            {d.correo && (
              <a href={`mailto:${d.correo}`} className="tt-area-toque self-start hover:underline">
                {d.correo}
              </a>
            )}
            <RedesSociales redes={d.redes} variante="con-nombre" />
          </section>
        )}
      </div>
    </section>
  );
}
