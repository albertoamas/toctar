import type { Metadata, Route } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ChevronRightIcon, MailIcon, MapPinIcon, ShieldCheckIcon } from "lucide-react";
import { EstadoDelTaller } from "@/componentes/sitio/estado-del-taller";
import { TituloPagina } from "@/componentes/sitio/titulo-pagina";
import { RedesSociales } from "@/componentes/sitio/redes-sociales";
import { BotonWhatsApp, WhatsAppFijo } from "@/componentes/sitio/whatsapp";
import { momentoEnBolivia } from "@/lib/fechas";
import { estadoDelTaller, resumirHorariosConHoy } from "@/lib/horarios";
import { enlaceComoLlegar, mapaDeContacto } from "@/lib/ubicacion";
import { cn } from "cn";
import { formatearWhatsApp } from "@/lib/whatsapp";
import { obtenerDatosPublicos } from "@/modulos/configuracion/consultas";
import { REDES } from "@/modulos/configuracion/esquemas";
import { contenidoPublico } from "@/modulos/sitio/publico";

export const metadata: Metadata = {
  title: "Contacto",
  description: "Dirección, mapa, horario y WhatsApp de TocTar Detailing en Tarija.",
};

const TITULO = "font-heading text-[26px] leading-7 font-extrabold italic";

// HU-14 Contacto y mapa (RF-06). Los datos salen de Configuración (HU-04) y la bienvenida del panel (HU-08).
// Pedido 38 (maqueta aprobada el 05/11): lo principal es el mapa de la ficha de TocTar en Google Maps, con la dirección y
// "Cómo llegar" pegadas abajo; arriba, si el taller está abierto ahora (hora de Bolivia); el horario marca el día de hoy;
// garantía y correo son filas que se tocan enteras. En la computadora, el mapa va a la derecha y acompaña al bajar.
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
  const comoLlegar = enlaceComoLlegar(d);
  const mapa = mapaDeContacto(d);
  const ahora = momentoEnBolivia();
  const estado = estadoDelTaller(d.horarios, ahora);
  const hayRedes = REDES.some((r) => d.redes[r]);

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:items-start md:gap-x-16 md:gap-y-10 md:py-20">
      <div className="flex flex-col items-start gap-4">
        <TituloPagina>Contacto</TituloPagina>
        <p className="max-w-prose text-lg text-tinta-suave">{contacto.bienvenida as string}</p>
        {estado && <EstadoDelTaller estado={estado} />}
        {d.whatsapp && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {/* El texto dice lo que gana el cliente; el nombre accesible suma "por WhatsApp" (pulido 2.1) */}
            <BotonWhatsApp texto="Pedir cotización" />
            <span className="text-sm text-tinta-suave tabular-nums">{formatearWhatsApp(d.whatsapp)}</span>
          </div>
        )}
      </div>

      {/* El mapa y la dirección, juntos. En el celular, de borde a borde; en la computadora, a la derecha y fijo al bajar */}
      <section aria-labelledby="direccion-titulo" className="-mx-4 flex flex-col md:sticky md:top-24 md:col-start-2 md:row-span-3 md:row-start-1 md:mx-0">
        {mapa && (
          // Mapa de Google sin clave. Se carga recién al acercarse (loading="lazy") para no frenar la página (RNF-02).
          <div className="relative aspect-[4/3] w-full bg-superficie md:aspect-[6/5]">
            <iframe
              title="Mapa del taller de TocTar Detailing"
              src={mapa}
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              className="absolute inset-0 h-full w-full border-0"
            />
          </div>
        )}
        <div className="flex flex-col items-start gap-4 bg-superficie px-4 py-5 md:flex-row md:items-center md:justify-between md:p-6">
          <div className="flex flex-col gap-2">
            <h2 id="direccion-titulo" className={TITULO}>
              Dónde estamos
            </h2>
            <address className="max-w-[36ch] text-tinta-media not-italic">{d.direccion}</address>
          </div>
          <a href={comoLlegar} target="_blank" rel="noreferrer" className="tt-boton tt-boton--blanco shrink-0">
            <MapPinIcon aria-hidden />
            Cómo llegar
          </a>
        </div>
      </section>

      <section aria-labelledby="horario-titulo" className="flex flex-col gap-4">
        <h2 id="horario-titulo" className={TITULO}>
          Horario
        </h2>
        <dl className="flex flex-col">
          {resumirHorariosConHoy(d.horarios, ahora.dia).map((g) => (
            <div
              key={g.dias}
              className={cn(
                // Los días a la izquierda y las horas a la derecha; si no caben, las horas bajan a la línea siguiente
                "flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border py-3 first:border-t",
                g.hoy && "pl-3 shadow-[inset_3px_0_0_var(--rojo)]",
              )}
            >
              <dt className="flex flex-wrap items-center gap-2 font-semibold">
                {g.dias}
                {g.hoy && <span className="bg-blanco px-2 text-xs font-bold text-negro">Hoy</span>}
              </dt>
              <dd className={cn("tabular-nums", g.hoy ? "text-tinta" : "text-tinta-suave")}>
                {g.horario === "cerrado" ? "Cerrado" : g.horario}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-label="Más formas de contacto" className="flex flex-col gap-3">
        <FilaEnlace href="/garantia" icono={<ShieldCheckIcon aria-hidden />} titulo="Garantía de cada trabajo" detalle="Si necesitas que revisemos algo, te respondemos por WhatsApp" />
        {d.correo && <FilaEnlace href={`mailto:${d.correo}`} icono={<MailIcon aria-hidden />} titulo="Correo" detalle={d.correo} />}
        {hayRedes && <RedesSociales redes={d.redes} variante="con-nombre" />}
      </section>
    </section>
  );
}

/** Una fila que se toca entera: garantía y correo (pedido 38). */
function FilaEnlace({ href, icono, titulo, detalle }: { href: Route | `mailto:${string}`; icono: React.ReactNode; titulo: string; detalle: string }) {
  const clase = "flex min-h-18 items-center gap-4 bg-superficie p-4 hover:bg-superficie-alta [&>svg]:size-6 [&>svg]:shrink-0 [&>svg]:text-rojo-texto";
  const contenido = (
    <>
      {icono}
      <span className="flex min-w-0 flex-col">
        <span className="font-semibold">{titulo}</span>
        <span className="text-sm break-words text-tinta-suave">{detalle}</span>
      </span>
      <ChevronRightIcon aria-hidden className="ml-auto !size-5 !text-tinta-suave" />
    </>
  );
  return href.startsWith("mailto:") ? (
    <a href={href} className={clase}>
      {contenido}
    </a>
  ) : (
    <Link href={href as Route} className={clase}>
      {contenido}
    </Link>
  );
}
