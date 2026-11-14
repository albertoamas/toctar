import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { cn } from "cn";
import { MapPinIcon } from "lucide-react";
import { CierreWhatsApp } from "@/componentes/sitio/cierre-whatsapp";
import { ComparadorAntesDespues } from "@/componentes/sitio/comparador-antes-despues";
import { EnlaceTikTok } from "@/componentes/sitio/enlace-tiktok";
import { EstadoDelTaller } from "@/componentes/sitio/estado-del-taller";
import { VideoTikTok } from "@/componentes/sitio/video-tiktok";
import { PortadaArte } from "@/componentes/sitio/portada-arte";
import { TITULO_SECCION } from "@/componentes/sitio/titulo-pagina";
import { TarjetaServicio } from "@/componentes/sitio/tarjeta-servicio";
import { BotonWhatsApp, WhatsAppFijo } from "@/componentes/sitio/whatsapp";
import { momentoEnBolivia } from "@/lib/fechas";
import type { UrlsFoto } from "@/lib/fotos";
import { estadoDelTaller } from "@/lib/horarios";
import { usuarioDeTikTok } from "@/lib/tiktok";
import { enlaceComoLlegar } from "@/lib/ubicacion";
import { PORTADA } from "@/modulos/sitio/contenido";
import { ladoDelLema, nombreDelTrabajo, trabajoDePortada } from "@/modulos/sitio/galeria";
import { obtenerDatosPublicos } from "@/modulos/configuracion/consultas";
import type { VideoPortada } from "@/modulos/sitio/consultas";
import { contenidoPublico, fotoDePaginaPublica, galeriaPublica, serviciosPublicos, videoDePortadaPublico, type FotoGaleria, type ServicioPublico } from "@/modulos/sitio/publico";
import { metadatosPagina } from "@/lib/sitio";

// Las descripciones para Google van fijas (dentro del <head>, que es donde las lee Google) y sin nombrar
// servicios concretos: así no quedan desactualizadas cuando el dueño agrega o quita uno.
export const metadata: Metadata = metadatosPagina({
  titulo: { absolute: "TocTar Detailing · Detailing automotriz en Tarija" },
  descripcion: "Detailing automotriz en Tarija: cuidamos la pintura, el interior y los detalles de tu vehículo. Escríbenos por WhatsApp y te cotizamos.",
  ruta: "/",
});

const SERVICIOS_EN_PORTADA = 6;

// HU-10 Portada: lema, presentación y WhatsApp, con el comparador de antes y después al lado (pedido de la demo del
// 24/10); servicios; TikTok; cierre. Sin "Trabajos recientes" desde el pedido 36: las fotos están en la Galería.
// Pulido 13.53 (maqueta aprobada el 12/11): la foto del taller visible detrás del lema, más grande, con cuándo atiende y
// cómo llegar; las secciones separadas por la línea LED; los dos primeros servicios destacados (en el celular, de a
// dos por fila); y en TikTok, el video que sube el dueño (pedido 48), sin marco y solo si hay uno.
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
  const [inicio, foto, servicios, fotos, negocio, video] = await Promise.all([
    contenidoPublico("inicio"),
    fotoDePaginaPublica(PORTADA),
    serviciosPublicos(),
    galeriaPublica(),
    obtenerDatosPublicos(),
    videoDePortadaPublico(),
  ]);
  const trabajo = trabajoDePortada(fotos);
  // Se lee al atender la visita (connection): el estado es el de este momento, en hora de Bolivia
  const estado = estadoDelTaller(negocio.horarios, momentoEnBolivia());
  return (
    <>
      <section className="relative overflow-hidden">
        <Cabecera foto={foto} trabajo={trabajo}>
          <Presentacion lema={inicio.lema as string} presentacion={inicio.presentacion as string}>
            <AtencionDelTaller
              estado={estado}
              direccion={negocio.direccion}
              // Sin dirección, la ficha de Google Maps o las coordenadas igual sirven para llegar
              comoLlegar={negocio.direccion || negocio.enlaceMapa || negocio.coordenadas ? enlaceComoLlegar(negocio) : null}
            />
          </Presentacion>
        </Cabecera>
      </section>

      <section aria-labelledby="servicios-titulo" className="relative bg-superficie">
        <div className="mx-auto w-full max-w-6xl px-4 pt-10 pb-20 md:pt-16 md:pb-28">
          <h2 id="servicios-titulo" className={TITULO_SECCION}>Servicios</h2>
          <Servicios servicios={servicios} />
        </div>
        {/* Antes del negro de TikTok; sin TikTok sigue el cierre, gris como Servicios, y no hace falta */}
        {negocio.redes.tiktok && <hr className="tt-led" />}
      </section>

      <BloqueTikTok enlace={negocio.redes.tiktok} video={video} />

      <CierreWhatsApp
        titulo="Cuéntanos qué necesita tu vehículo"
        texto="Mándanos fotos o pasa por el taller y te decimos qué conviene hacer."
      />
    </>
  );
}

/**
 * Cabecera de la portada: lema y presentación sobre la foto del taller, y al lado el comparador de antes y después del
 * trabajo elegido en el panel (pedido de la demo del 24/10: lo que más le gustó al dueño); sin ningún trabajo con antes,
 * el arte de la marca si no hay foto del taller (pulido 2.1, tercera revisión). En el celular, el arte va arriba y el
 * comparador debajo del texto. Pulido 13.53: el comparador, más ancho que el texto desde la computadora, y abajo el
 * escalón a 60° hacia los servicios.
 * Mientras llegan los textos va `CabeceraCargando`: vacía, sin foto, sin arte y sin el escalón. Ya cargada mide lo suyo
 * (lo de abajo de la cabecera se reemplaza entero al llegar, no se corre).
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
          lado === "comparador" && "md:grid-cols-2 md:items-center md:gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]",
          lado === "arte" && "md:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]",
        )}
      >
        {lado === "arte" && <PortadaArte className="order-first h-auto w-full max-w-72 justify-self-end md:order-last md:max-w-none" />}
        <div>{children}</div>
        {/* Después del texto, también en el código: el teclado y el lector de pantalla llegan primero al lema y a
            "Pedir cotización". En el celular queda debajo, aún en la primera pantalla. */}
        {lado === "comparador" && trabajo && (
          // En un recuadro fijo de 4:3, sea cual sea la foto: la cabecera no cambia de tamaño (revisión de YankoSoft, 06/11).
          // La leyenda, solo si el trabajo tiene descripción (es opcional desde el 24/10)
          <ComparadorAntesDespues
            antes={trabajo.antes}
            despues={trabajo.despues}
            descripcion={nombreDelTrabajo(trabajo.descripcion, trabajo.servicio.nombre)}
            conLeyenda={!!trabajo.descripcion.trim()}
            alFrente
            prioritaria
            sola
            marco
            conBorde
          />
        )}
      </div>
      {/* Sobre la foto, que va posicionada detrás de todo */}
      <hr className="tt-led relative" />
    </>
  );
}

/** El ancho y los márgenes de la cabecera: los mismos cargando y cargada, para que nada se corra al llegar los datos. */
const CONTENEDOR_CABECERA = "mx-auto max-w-6xl px-4 pt-10 pb-20 md:pt-20 md:pb-28";

/**
 * La cabecera mientras llegan los datos: vacía, con el alto que ocupa el texto (medido el 12/11 con los textos de la
 * demostración: 513 px a 360 de ancho, 547 a 1280; entre 430 y 580 en otros anchos) y el lugar de la línea, sin la
 * línea, que llega con el texto. Ya cargada, la cabecera mide lo suyo.
 */
function CabeceraCargando() {
  return (
    <div aria-hidden>
      <div className={CONTENEDOR_CABECERA}>
        <div className="min-h-[32rem] md:min-h-[34rem]" />
      </div>
      <div className="h-[3px]" />
    </div>
  );
}

/**
 * Foto del taller detrás del texto. Decorativa (el texto dice quiénes son): va oculta para los lectores de pantalla.
 * Pulido 13.53: visible. En el celular el velo oscurece abajo, donde va el texto; desde la tableta, como en la maqueta,
 * es casi negro a la izquierda y se aclara hacia la derecha, y la foto se ve apenas también detrás del lema. Aun con una
 * foto blanca, el texto más claro queda sobre un gris de #2a2a2a o más oscuro: 10:1 la presentación y 7:1 lo chico. En el celular va la versión de 640 px, con prioridad baja: la de 1600 le quitaba red al texto
 * (rendimiento de 90 a 84 en Lighthouse).
 */
function FotoTaller({ foto }: { foto: UrlsFoto }) {
  return (
    <div aria-hidden className="tt-portada-foto absolute inset-0">
      <picture>
        <source media="(min-width: 768px)" srcSet={foto.url} />
        <img src={foto.miniatura} alt="" fetchPriority="low" className="size-full object-cover opacity-60 md:opacity-55" />
      </picture>
      <div className="absolute inset-0 bg-linear-to-t from-fondo from-40% via-fondo/80 to-fondo/35 md:bg-linear-to-r md:from-fondo/90 md:from-0% md:via-fondo/70 md:via-45% md:to-fondo/25" />
    </div>
  );
}

function Presentacion({ lema, presentacion, children }: { lema: string; presentacion: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-6">
      <h1 className="tt-portada-lema max-w-2xl font-heading text-[44px] leading-[42px] font-extrabold tracking-[-0.01em] text-balance uppercase italic md:text-[clamp(4rem,6.5vw,6rem)] md:leading-[0.92]">
        {lema}
      </h1>
      <p className="max-w-xl text-lg leading-7 text-tinta-media">{presentacion}</p>
      <div className="flex flex-wrap gap-3">
        <BotonWhatsApp texto="Pedir cotización" />
        <Link href="/servicios" className="tt-boton tt-boton--contorno">
          Ver los servicios
        </Link>
      </div>
      {children}
    </div>
  );
}

/**
 * Cuándo atiende el taller y dónde está, debajo de los botones de la portada (pulido 13.53): el estado de este momento
 * (`EstadoDelTaller`, del horario de Configuración > Negocio), la dirección y "Cómo llegar" (la ficha de Google Maps;
 * sin ella, las coordenadas o la dirección).
 */
function AtencionDelTaller({ estado, direccion, comoLlegar }: { estado: ReturnType<typeof estadoDelTaller>; direccion: string; comoLlegar: string | null }) {
  if (!estado && !comoLlegar) return null;
  return (
    <div className="flex w-full flex-wrap items-center gap-x-6 gap-y-2 border-t border-blanco/20 pt-5">
      {estado && <EstadoDelTaller estado={estado} />}
      {comoLlegar && (
        <a href={comoLlegar} target="_blank" rel="noreferrer" className="tt-area-toque inline-flex items-center gap-2 text-sm font-semibold underline-offset-4 hover:underline">
          <MapPinIcon aria-hidden className="size-4 shrink-0" />
          <span>
            Cómo llegar {direccion && <span className="font-medium text-tinta-suave">({direccion})</span>}
          </span>
        </a>
      )}
    </div>
  );
}

function Servicios({ servicios }: { servicios: ServicioPublico[] }) {
  return (
    <>
      {/* Los dos primeros, destacados (el orden lo pone el dueño en Sitio web > Servicios); en el celular, todos iguales
          en dos columnas (pulido 13.53) */}
      <ul className="tt-servicios-portada mt-8">
        {servicios.slice(0, SERVICIOS_EN_PORTADA).map((s, i) => (
          <li key={s.slug} className="grid">
            <TarjetaServicio servicio={s} variante={i < SERVICIOS_DESTACADOS ? "destacada" : "mosaico"} />
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

const SERVICIOS_DESTACADOS = 2;

/**
 * TikTok en la portada (pedido 35): un bloque propio después de los servicios, con su título, el usuario y un botón
 * blanco grande. Solo si el dueño cargó el enlace. Al lado (debajo en el celular), el video que subió en Sitio web >
 * Textos > Portada (pedido 48), vertical y sin marco; sin video no va nada y el texto usa todo el ancho (pulido 13.54).
 */
function BloqueTikTok({ enlace, video }: { enlace?: string; video: VideoPortada | null }) {
  if (!enlace) return null;
  const usuario = usuarioDeTikTok(enlace);
  return (
    <section
      aria-labelledby="tiktok-titulo"
      // Con video, dos columnas iguales y el video al centro de la suya: alineado al borde derecho quedaba pegado a la
      // pantalla en la tableta y lejos del texto en la computadora (revisión del 13/11)
      className={cn("mx-auto grid w-full max-w-6xl items-center gap-10 px-4 pt-14 pb-16 md:gap-16 md:pt-20 md:pb-24", video && "md:grid-cols-2")}
    >
      <div className="flex flex-col items-start gap-3">
        <h2 id="tiktok-titulo" className={TITULO_SECCION}>
          Mira cómo trabajamos
        </h2>
        <p className="max-w-xl text-lg text-tinta-media">Videos de nuestros trabajos en el taller, del antes al después.</p>
        {usuario && <p className="text-sm font-semibold text-tinta-suave">{usuario}</p>}
        <EnlaceTikTok enlace={enlace} texto="Ver en TikTok" className="mt-2" />
      </div>
      {video && (
        // Pedido 48: el video que subió el dueño. Un toque también abre TikTok (con el botón de reproducir, sería raro
        // que no hiciera nada); para el teclado y el lector de pantalla basta "Ver en TikTok"
        <a href={enlace} target="_blank" rel="noreferrer" tabIndex={-1} aria-hidden className="tt-video-tiktok justify-self-center">
          <VideoTikTok src={video.url} tipo={video.tipo} />
          {usuario && <span className="tt-video-tiktok__pie">{usuario}</span>}
        </a>
      )}
    </section>
  );
}
