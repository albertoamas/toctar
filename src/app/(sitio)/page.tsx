import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { cn } from "cn";
import { CierreWhatsApp } from "@/componentes/sitio/cierre-whatsapp";
import { ComparadorAntesDespues } from "@/componentes/sitio/comparador-antes-despues";
import { EnlaceTikTok } from "@/componentes/sitio/enlace-tiktok";
import { PortadaArte } from "@/componentes/sitio/portada-arte";
import { TarjetaServicio } from "@/componentes/sitio/tarjeta-servicio";
import { BotonWhatsApp, WhatsAppFijo } from "@/componentes/sitio/whatsapp";
import type { UrlsFoto } from "@/lib/fotos";
import { PORTADA } from "@/modulos/sitio/contenido";
import { ladoDelLema, nombreDelTrabajo, trabajoDePortada } from "@/modulos/sitio/galeria";
import { obtenerDatosPublicos } from "@/modulos/configuracion/consultas";
import { contenidoPublico, fotoDePaginaPublica, galeriaPublica, serviciosPublicos, type FotoGaleria, type ServicioPublico } from "@/modulos/sitio/publico";

// Las descripciones para Google van fijas (dentro del <head>, que es donde las lee Google) y sin nombrar
// servicios concretos: así no quedan desactualizadas cuando el dueño agrega o quita uno.
export const metadata: Metadata = {
  title: { absolute: "TocTar Detailing · Detailing automotriz en Tarija" },
  description: "Detailing automotriz en Tarija: cuidamos la pintura, el interior y los detalles de tu vehículo. Escríbenos por WhatsApp y te cotizamos.",
};

const SERVICIOS_EN_PORTADA = 6;
const FOTOS_EN_PORTADA = 6;

// HU-10 Portada: lema, presentación y WhatsApp, con el comparador de antes y después al lado (pedido de la demo del
// 24/10); servicios; algunas fotos de la galería; cierre.
// Los textos y las listas salen del panel (B3) y se leen al atender la visita (el build no tiene base).
// Toda la portada aparece de una vez (pulido 2.1): antes, los títulos fijos ("Servicios", el cierre) salían
// en el primer envío y su contenido después, y se veían títulos sueltos. Mientras llegan los datos se ve
// la cabecera vacía, con el espacio reservado de una pantalla (nada salta al llegar).
export default function Portada() {
  return (
    <>
      <Suspense
        fallback={
          <>
            <section className="relative overflow-hidden">
              <CabeceraCargando />
            </section>
            <div aria-hidden className="min-h-screen" />
          </>
        }
      >
        <PortadaConDatos />
      </Suspense>
      <WhatsAppFijo />
    </>
  );
}

async function PortadaConDatos() {
  await connection();
  const [inicio, foto, servicios, fotos, { redes }] = await Promise.all([
    contenidoPublico("inicio"),
    fotoDePaginaPublica(PORTADA),
    serviciosPublicos(),
    galeriaPublica(),
    obtenerDatosPublicos(),
  ]);
  const trabajo = trabajoDePortada(fotos);
  return (
    <>
      <section className="relative overflow-hidden">
        <Cabecera foto={foto} trabajo={trabajo}>
          <Presentacion lema={inicio.lema as string} presentacion={inicio.presentacion as string} />
        </Cabecera>
      </section>

      <section aria-labelledby="servicios-titulo" className="mx-auto w-full max-w-6xl px-4 py-12 md:py-24">
        <h2 id="servicios-titulo" className="font-heading text-[28px] leading-8 font-bold italic md:text-[40px] md:leading-[44px]">Servicios</h2>
        <Servicios servicios={servicios} />
      </section>

      {/* Sin repetir el trabajo que ya se compara arriba */}
      <Galeria fotos={fotos.filter((f) => f.id !== trabajo?.id).slice(0, FOTOS_EN_PORTADA)} tiktok={redes.tiktok} />

      <CierreWhatsApp
        titulo="Cuéntanos qué necesita tu vehículo"
        texto="Mándanos fotos o pasa por el taller y te decimos qué conviene hacer."
      />
    </>
  );
}

/**
 * Cabecera de la portada: lema y presentación sobre la foto del taller (oscurecida), y la línea LED. Al lado, el
 * comparador de antes y después del trabajo elegido en el panel (pedido de la demo del 24/10: lo que más le gustó al
 * dueño); sin ningún trabajo con antes, el arte de la marca si no hay foto del taller (pulido 2.1, tercera revisión).
 * En el celular, el arte va arriba y el comparador debajo del texto, sin pasar del 45 % del alto (una foto vertical no
 * tapa la pantalla entera).
 * Mientras llegan los textos va `CabeceraCargando`: vacía, sin foto, sin arte y SIN la línea (con el arte, al llegar
 * una foto el texto subía de golpe en el celular). Ya cargada mide lo suyo. Medido con la red y el procesador frenados:
 * CLS 0 a 360, 412 y 480 px (lo de abajo de la cabecera se reemplaza entero al llegar, no se corre).
 * La línea llega junto con el texto: así se enciende una sola vez y ya en su lugar.
 */
function Cabecera({ children, foto, trabajo }: { children: React.ReactNode; foto: UrlsFoto | null; trabajo: ReturnType<typeof trabajoDePortada<FotoGaleria>> }) {
  const lado = ladoDelLema({ hayFotoTaller: !!foto, hayComparador: !!trabajo });
  return (
    <>
      {foto && <FotoTaller foto={foto} />}
      {/* La columna derecha es la del comparador o la del arte; sin ninguno, el texto usa todo el ancho (su máximo lo pone Presentacion). */}
      <div
        className={cn(
          "relative grid gap-8 md:items-end",
          CONTENEDOR_CABECERA,
          lado === "comparador" && "md:grid-cols-2 md:items-center md:gap-12",
          lado === "arte" && "md:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]",
        )}
      >
        {lado === "arte" && <PortadaArte className="order-first h-auto w-full max-w-72 justify-self-end md:order-last md:max-w-none" />}
        <div>{children}</div>
        {/* Después del texto, también en el código: el teclado y el lector de pantalla llegan primero al lema y a
            "Pedir cotización". En el celular queda debajo, aún en la primera pantalla. */}
        {lado === "comparador" && trabajo && (
          <div className="[--alto-comparador:45dvh] md:[--alto-comparador:60dvh]">
            {/* La leyenda, solo si el trabajo tiene descripción (es opcional desde el 24/10) */}
            <ComparadorAntesDespues
              antes={trabajo.antes}
              despues={trabajo.despues}
              descripcion={nombreDelTrabajo(trabajo.descripcion, trabajo.servicio.nombre)}
              conLeyenda={!!trabajo.descripcion.trim()}
              alFrente
              sola
            />
          </div>
        )}
      </div>
      <hr className="tt-led tt-led--encender" />
    </>
  );
}

/** El ancho y los márgenes de la cabecera: los mismos cargando y cargada, para que nada se corra al llegar los datos. */
const CONTENEDOR_CABECERA = "mx-auto max-w-6xl px-4 pt-10 pb-12 md:pt-20 md:pb-16";

/**
 * La cabecera mientras llegan los datos: vacía, con el alto que ocupa el texto (24,5rem a 360 px de ancho, 18,5rem en
 * computadora) y el lugar de la línea, sin la línea: se enciende una sola vez, al llegar el texto. Ya cargada, la
 * cabecera mide lo suyo (hasta el 24/10 la reserva quedaba también cargada y en un celular ancho dejaba un hueco de
 * hasta 150 px antes del comparador).
 */
function CabeceraCargando() {
  return (
    <div aria-hidden>
      <div className={CONTENEDOR_CABECERA}>
        <div className="min-h-[24.5rem] md:min-h-[18.5rem]" />
      </div>
      <div className="h-[3px]" />
    </div>
  );
}

/**
 * Foto del taller detrás del texto. Decorativa (el texto dice quiénes son): va oculta para los lectores de pantalla.
 * Un velo de fondo la oscurece donde va el texto (abajo en el celular, a la izquierda en la computadora) para que
 * el lema y la presentación se lean como sobre negro: contraste de 6:1 o más aun con una foto blanca (medido el 18/10).
 * En el celular va la versión de 640 px, con prioridad baja: oscurecida no se nota, y la de 1600 le quitaba red al
 * texto (rendimiento de 90 a 84 en Lighthouse).
 */
function FotoTaller({ foto }: { foto: UrlsFoto }) {
  return (
    <div aria-hidden className="tt-portada-foto absolute inset-0">
      <picture>
        <source media="(min-width: 768px)" srcSet={foto.url} />
        <img src={foto.miniatura} alt="" fetchPriority="low" className="size-full object-cover opacity-50" />
      </picture>
      <div className="absolute inset-0 bg-linear-to-t from-fondo from-35% via-fondo/80 to-fondo/40 md:bg-linear-to-r md:from-30% md:via-fondo/85 md:to-fondo/40" />
    </div>
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
        <BotonWhatsApp texto="Pedir cotización" />
        <Link href="/servicios" className="tt-boton tt-boton--contorno">
          Ver los servicios
        </Link>
      </div>
    </div>
  );
}

function Servicios({ servicios }: { servicios: ServicioPublico[] }) {
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

/** Trabajos recientes. Sin fotos (o solo la del comparador de arriba), queda el acceso a TikTok si está cargado. */
function Galeria({ fotos, tiktok }: { fotos: FotoGaleria[]; tiktok?: string }) {
  if (fotos.length === 0 && !tiktok) return null;
  return (
    <section aria-labelledby="galeria-titulo" className="mx-auto w-full max-w-6xl px-4 pb-12 md:pb-24">
      <h2 id="galeria-titulo" className="font-heading text-[28px] leading-8 font-bold italic md:text-[40px] md:leading-[44px]">Trabajos recientes</h2>
      {fotos.length > 0 && (
        <ul className="mt-8 grid grid-cols-2 gap-2 md:grid-cols-3">
          {fotos.map((f) => (
            <li key={f.id} className="aspect-square overflow-hidden bg-superficie">
              <Image
                src={f.despues.miniatura}
                alt={nombreDelTrabajo(f.descripcion, f.servicio.nombre)}
                width={f.despues.ancho ?? 640}
                height={f.despues.alto ?? 640}
                unoptimized
                loading="lazy"
                className="size-full object-cover"
              />
            </li>
          ))}
        </ul>
      )}
      <div className="mt-8 flex flex-wrap gap-3">
        {fotos.length > 0 && (
          <Link href="/galeria" className="tt-boton tt-boton--contorno">
            Ver la galería
          </Link>
        )}
        {/* Más trabajos, en video (pedido de la demo del 24/10) */}
        <EnlaceTikTok enlace={tiktok} />
      </div>
    </section>
  );
}
