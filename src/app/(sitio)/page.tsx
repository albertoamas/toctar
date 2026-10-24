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
import { ladoDelLema, trabajoDePortada } from "@/modulos/sitio/galeria";
import { contenidoPublico, fotoPortadaPublica, galeriaPublica, serviciosPublicos, type FotoGaleria, type ServicioPublico } from "@/modulos/sitio/publico";

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
              <Cabecera />
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
  const [inicio, foto, servicios, fotos] = await Promise.all([contenidoPublico("inicio"), fotoPortadaPublica(), serviciosPublicos(), galeriaPublica()]);
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
      <Galeria fotos={fotos.filter((f) => f.id !== trabajo?.id).slice(0, FOTOS_EN_PORTADA)} />

      <CierreWhatsApp
        titulo="Cuéntanos qué necesita tu vehículo"
        texto="Mándanos una foto o pasa por el taller: lo revisamos y te decimos qué conviene hacer."
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
 * Mientras llegan los textos se muestra vacía: sin foto, sin arte y SIN la línea (con el arte, al llegar una foto el
 * texto subía de golpe en el celular). El bloque del texto tiene el MISMO alto mínimo
 * cargando y cargado: así un texto más corto no hace subir la página al llegar (medido el 18/10: con una
 * presentación corta subía 88 px). El mínimo es lo que ocupa el texto actual (392 px a 360 de ancho, 296 en
 * computadora); un texto más largo que eso todavía empuja lo de abajo, por eso conviene que la presentación
 * sean "dos o tres frases", como pide el panel.
 * La línea llega junto con el texto: así se enciende una sola vez y ya en su lugar.
 */
function Cabecera({ children, foto, trabajo }: { children?: React.ReactNode; foto?: UrlsFoto | null; trabajo?: ReturnType<typeof trabajoDePortada<FotoGaleria>> }) {
  // Cargando (sin children) no va nada al lado: llega junto con el texto
  const lado = children ? ladoDelLema({ hayFotoTaller: !!foto, hayComparador: !!trabajo }) : null;
  return (
    <>
      {foto && <FotoTaller foto={foto} />}
      {/* La columna derecha es la del comparador o la del arte; sin ninguno, el texto usa todo el ancho (su máximo lo pone Presentacion). */}
      <div
        className={cn(
          "relative mx-auto grid max-w-6xl gap-8 px-4 pt-10 pb-12 md:items-end md:pt-20 md:pb-16",
          lado === "comparador" && "md:grid-cols-2 md:items-center md:gap-12",
          lado === "arte" && "md:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]",
        )}
      >
        {lado === "arte" && <PortadaArte className="order-first h-auto w-full max-w-72 justify-self-end md:order-last md:max-w-none" />}
        <div aria-hidden={children ? undefined : true} className="min-h-[24.5rem] md:min-h-[18.5rem]">
          {children}
        </div>
        {/* Después del texto, también en el código: el teclado y el lector de pantalla llegan primero al lema y a
            "Pedir cotización". En el celular queda debajo, aún en la primera pantalla. */}
        {lado === "comparador" && trabajo && (
          <div className="[--alto-comparador:45dvh] md:[--alto-comparador:60dvh]">
            <ComparadorAntesDespues antes={trabajo.antes} despues={trabajo.despues} descripcion={trabajo.descripcion} conLeyenda alFrente />
          </div>
        )}
      </div>
      {children ? <hr className="tt-led tt-led--encender" /> : <div aria-hidden className="h-[3px]" />}
    </>
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

function Galeria({ fotos }: { fotos: FotoGaleria[] }) {
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
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/galeria" className="tt-boton tt-boton--contorno">
          Ver la galería
        </Link>
        {/* Más trabajos, en video (pedido de la demo del 24/10) */}
        <EnlaceTikTok />
      </div>
    </section>
  );
}
