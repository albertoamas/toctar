import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { MapPinIcon } from "lucide-react";
import { BotonWhatsApp, WhatsAppFijo } from "@/componentes/sitio/whatsapp";
import { resumirHorarios } from "@/lib/horarios";
import { enlaceMapa } from "@/lib/ubicacion";
import { formatearWhatsApp } from "@/lib/whatsapp";
import { obtenerDatosPublicos } from "@/modulos/configuracion/consultas";
import { NOMBRE_RED, REDES } from "@/modulos/configuracion/esquemas";
import { contenidoPublico } from "@/modulos/sitio/publico";

export const metadata: Metadata = {
  title: "Contacto",
  description: "Dirección, mapa, horario y WhatsApp de TocTar Detailing en Tarija.",
};

const TITULO = "font-heading text-2xl font-bold italic";

// HU-14 Contacto y mapa (RF-06). Los datos salen de Configuración (HU-04) y la bienvenida del panel (HU-08).
// Tocar la dirección abre Google Maps (en el celular, la app de mapas).
export default function PaginaContacto() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12 md:py-20">
      <h1 className="font-heading text-[40px] leading-[44px] font-extrabold italic">Contacto</h1>
      <Suspense fallback={<div className="min-h-screen" />}>
        <Datos />
      </Suspense>
      <WhatsAppFijo />
    </section>
  );
}

async function Datos() {
  await connection();
  const [d, contacto] = await Promise.all([obtenerDatosPublicos(), contenidoPublico("contacto")]);
  const mapa = d.coordenadas ? enlaceMapa(d.coordenadas) : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.direccion)}`;
  const redes = REDES.filter((r) => d.redes[r]);

  return (
    <div className="mt-4 grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <div className="flex flex-col gap-8">
        <p className="max-w-prose text-lg text-tinta-suave">{contacto.bienvenida as string}</p>
        {d.whatsapp && (
          <div className="flex flex-col items-start gap-2">
            <BotonWhatsApp />
            <span className="text-sm text-tinta-suave">{formatearWhatsApp(d.whatsapp)}</span>
          </div>
        )}

        <section aria-labelledby="direccion-titulo" className="flex flex-col gap-2">
          <h2 id="direccion-titulo" className={TITULO}>Dónde estamos</h2>
          <a href={mapa} target="_blank" rel="noreferrer" className="flex items-start gap-2 hover:underline">
            <MapPinIcon className="mt-0.5 size-5 shrink-0 text-rojo-texto" aria-hidden />
            <address className="not-italic">{d.direccion}</address>
          </a>
          <a href={mapa} target="_blank" rel="noreferrer" className="text-sm font-semibold text-rojo-texto hover:underline">
            Cómo llegar
          </a>
        </section>

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

        {(d.correo || redes.length > 0) && (
          <section aria-labelledby="tambien-titulo" className="flex flex-col gap-2">
            <h2 id="tambien-titulo" className={TITULO}>También estamos en</h2>
            {d.correo && (
              <a href={`mailto:${d.correo}`} className="hover:underline">
                {d.correo}
              </a>
            )}
            {redes.length > 0 && (
              <ul aria-label="Redes sociales" className="flex flex-wrap gap-x-5 gap-y-1">
                {redes.map((r) => (
                  <li key={r}>
                    <a href={d.redes[r]} target="_blank" rel="noreferrer" className="font-semibold hover:underline">
                      {NOMBRE_RED[r]}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>

      {d.coordenadas && (
        // Mapa de Google sin clave. Se carga recién al acercarse (loading="lazy") para no frenar la página (RNF-02).
        <div className="relative aspect-[4/3] w-full bg-superficie md:aspect-auto md:min-h-[28rem]">
          <iframe
            title="Mapa del taller de TocTar Detailing"
            src={`https://www.google.com/maps?q=${d.coordenadas.lat},${d.coordenadas.lng}&z=16&output=embed`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="absolute inset-0 h-full w-full border-0"
          />
        </div>
      )}
    </div>
  );
}
