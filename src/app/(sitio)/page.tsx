import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Monograma } from "@/componentes/sitio/iconos-marca";
import { PortadaArte } from "@/componentes/sitio/portada-arte";
import { TarjetaServicio } from "@/componentes/sitio/tarjeta-servicio";
import { BotonWhatsApp, WhatsAppFijo } from "@/componentes/sitio/whatsapp";
import { contenidoPublico, galeriaPublica, serviciosPublicos } from "@/modulos/sitio/publico";

// Las descripciones para Google van fijas (dentro del <head>, que es donde las lee Google) y sin nombrar
// servicios concretos: así no quedan desactualizadas cuando el dueño agrega o quita uno.
export const metadata: Metadata = {
  title: { absolute: "TocTar Detailing · Detailing automotriz en Tarija" },
  description: "Detailing automotriz en Tarija: cuidamos la pintura, el interior y los detalles de tu vehículo. Escríbenos por WhatsApp y te cotizamos.",
};

const SERVICIOS_EN_PORTADA = 6;
const FOTOS_EN_PORTADA = 6;

// HU-10 Portada: lema, presentación y WhatsApp; servicios; algunas fotos de la galería; cierre.
// Los textos y las listas salen del panel (B3) y se leen al atender la visita (el build no tiene base).
export default function Portada() {
  return (
    <>
      <section className="relative overflow-hidden">
        <Suspense fallback={<Cabecera />}>
          <CabeceraConTexto />
        </Suspense>
      </section>

      <section aria-labelledby="servicios-titulo" className="mx-auto w-full max-w-6xl px-4 py-12 md:py-24">
        <h2 id="servicios-titulo" className="font-heading text-[28px] leading-8 font-bold italic md:text-[40px] md:leading-[44px]">Servicios</h2>
        <Suspense fallback={<div className="min-h-96" />}>
          <Servicios />
        </Suspense>
      </section>

      <Suspense fallback={null}>
        <Galeria />
      </Suspense>

      <section className="relative overflow-hidden bg-superficie">
        <Monograma className="pointer-events-none absolute -right-16 -bottom-24 w-[28rem] fill-fondo md:-right-10 md:w-[36rem]" />
        <div className="relative mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-12 md:py-24">
          <h2 className="max-w-xl font-heading text-[28px] leading-8 font-bold italic md:text-[40px] md:leading-[44px]">Cuéntanos qué necesita tu vehículo</h2>
          <p className="max-w-xl text-tinta-suave">Mándanos una foto o pasa por el taller: lo revisamos y te decimos qué conviene hacer.</p>
          {/* Principal: mientras se ve, el botón fijo se esconde y queda un solo WhatsApp en pantalla (pulido 1.3). */}
          <BotonWhatsApp />
        </div>
      </section>

      <WhatsAppFijo />
    </>
  );
}

/**
 * Cabecera de la portada: arte de marca, lema y presentación, y la línea LED.
 * Mientras llegan los textos se muestra sin ellos y SIN la línea. El bloque del texto tiene el MISMO alto mínimo
 * cargando y cargado: así un texto más corto no hace subir la página al llegar (medido el 18/10: con una
 * presentación corta subía 88 px). El mínimo es lo que ocupa el texto actual (392 px a 360 de ancho, 296 en
 * computadora); un texto más largo que eso todavía empuja lo de abajo, por eso conviene que la presentación
 * sean "dos o tres frases", como pide el panel.
 * La línea llega junto con el texto: así se enciende una sola vez y ya en su lugar.
 */
function Cabecera({ children }: { children?: React.ReactNode }) {
  return (
    <>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 pt-10 pb-12 md:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] md:items-end md:pt-20 md:pb-16">
        <PortadaArte className="order-first h-auto w-full max-w-72 justify-self-end md:order-last md:max-w-none" />
        <div aria-hidden={children ? undefined : true} className="min-h-[24.5rem] md:min-h-[18.5rem]">
          {children}
        </div>
      </div>
      {children ? <hr className="tt-led tt-led--encender" /> : <div aria-hidden className="h-[3px]" />}
    </>
  );
}

async function CabeceraConTexto() {
  await connection();
  const inicio = await contenidoPublico("inicio");
  return (
    <Cabecera>
      <Presentacion lema={inicio.lema as string} presentacion={inicio.presentacion as string} />
    </Cabecera>
  );
}

function Presentacion({ lema, presentacion }: { lema: string; presentacion: string }) {
  return (
    <div className="flex flex-col items-start gap-6">
      <h1 className="max-w-2xl font-heading text-[40px] leading-[38px] md:leading-[60px] font-extrabold tracking-[-0.01em] text-balance uppercase italic md:text-[64px]">
        {lema}
      </h1>
      <p className="max-w-xl text-lg leading-7 text-tinta-suave">{presentacion}</p>
      <div className="flex flex-wrap gap-3">
        <BotonWhatsApp />
        <Link href="/servicios" className="tt-boton tt-boton--contorno">
          Ver los servicios
        </Link>
      </div>
    </div>
  );
}

async function Servicios() {
  await connection();
  const servicios = await serviciosPublicos();
  return (
    <>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        {servicios.slice(0, SERVICIOS_EN_PORTADA).map((s) => (
          <li key={s.slug} className="grid">
            <TarjetaServicio servicio={s} />
          </li>
        ))}
      </ul>
      {servicios.length > SERVICIOS_EN_PORTADA && (
        <Link href="/servicios" className="tt-boton tt-boton--contorno mt-8">
          Ver todos los servicios
        </Link>
      )}
    </>
  );
}

async function Galeria() {
  await connection();
  const fotos = (await galeriaPublica()).slice(0, FOTOS_EN_PORTADA);
  if (fotos.length === 0) return null;
  return (
    <section aria-labelledby="galeria-titulo" className="mx-auto w-full max-w-6xl px-4 pb-12 md:pb-24">
      <h2 id="galeria-titulo" className="font-heading text-[28px] leading-8 font-bold italic md:text-[40px] md:leading-[44px]">Trabajos recientes</h2>
      <ul className="mt-8 grid grid-cols-2 gap-2 md:grid-cols-3">
        {fotos.map((f) => (
          <li key={f.id} className="aspect-square overflow-hidden bg-superficie">
            <Image
              src={f.despues.miniatura}
              alt={f.descripcion}
              width={f.despues.ancho ?? 640}
              height={f.despues.alto ?? 640}
              unoptimized
              loading="lazy"
              className="size-full object-cover"
            />
          </li>
        ))}
      </ul>
      <Link href="/galeria" className="tt-boton tt-boton--contorno mt-8">
        Ver la galería
      </Link>
    </section>
  );
}
