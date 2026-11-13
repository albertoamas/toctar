import Image from "next/image";
import { MapPinIcon } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { resumirHorarios } from "@/lib/horarios";
import { PAGINAS_LEGALES, PAGINAS_PRINCIPALES, PAGINAS_SECUNDARIAS } from "@/lib/sitio";
import { enlaceComoLlegar } from "@/lib/ubicacion";
import { urlSitio } from "@/lib/sitio";
import { enlaceWhatsApp, formatearWhatsApp } from "@/lib/whatsapp";
import { obtenerDatosPublicos } from "@/modulos/configuracion/consultas";
import { datosNegocioLocal, jsonLd } from "@/modulos/sitio/negocio-local";
import { RedesSociales } from "./redes-sociales";

// Pie del sitio (componente PieSitio del Design System). Los datos salen de la configuración
// (HU-04, RF-17): el dueño los cambia en el panel y se ven al guardar.
// El build no tiene base de datos: los datos se leen al atender el pedido (connection) y quedan
// en caché con la etiqueta "negocio" hasta que se editen. Los mismos datos van a Google como JSON-LD (HU-18).

// Con la política de privacidad al final (pedido 49): en el pie, no en el menú
const ENLACES = [...PAGINAS_PRINCIPALES, ...PAGINAS_SECUNDARIAS, ...PAGINAS_LEGALES];

export function Pie() {
  // Sin línea LED: es el recurso de la portada.
  return (
    <footer className="border-t border-border bg-fondo">
      {/* Celular: una columna. Tableta: la marca arriba y tres columnas. Computadora: cuatro columnas. */}
      <div className="mx-auto grid max-w-6xl gap-x-6 gap-y-8 px-4 py-10 sm:grid-cols-2 md:grid-cols-3 md:gap-y-10 md:py-12 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
        <div className="col-span-full flex flex-col items-start gap-4 lg:col-span-1">
          <Image src="/marca/toctar-monograma-sobre-oscuro.svg" alt="" width={48} height={36} unoptimized />
          <p className="tt-lema whitespace-nowrap text-tinta-suave">Como ven tu auto, te ven a ti</p>
        </div>
        <Suspense fallback={null}>
          <DatosDelNegocio />
        </Suspense>
      </div>
      {/* pb-24 en el celular: que el botón fijo de WhatsApp no tape el último enlace. */}
      <nav aria-label="Pie" className="border-t border-border">
        <ul className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 px-4 pt-3 pb-24 text-sm text-tinta-suave sm:flex sm:flex-wrap md:pb-3">
          {ENLACES.map((e) => (
            <li key={e.href}>
              <Link href={e.href} className="flex min-h-11 items-center hover:text-tinta hover:underline">
                {e.texto}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </footer>
  );
}

async function DatosDelNegocio() {
  await connection();
  const d = await obtenerDatosPublicos();

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(datosNegocioLocal(d, urlSitio())) }} />
      <Bloque titulo="Dónde estamos">
        <address className="not-italic">{d.direccion}</address>
        {(d.enlaceMapa || d.coordenadas) && (
          // Un botón de verdad, con su ícono (pedido 35): como texto en negrita no se veía que se tocaba
          <a href={enlaceComoLlegar(d)} target="_blank" rel="noreferrer" className="tt-boton tt-boton--contorno mt-2 self-start">
            <MapPinIcon className="size-[18px]" aria-hidden />
            Cómo llegar
          </a>
        )}
      </Bloque>

      <Bloque titulo="Horario">
        <dl className="flex flex-col gap-1">
          {resumirHorarios(d.horarios).map((g) => (
            <div key={g.dias}>
              <dt className="text-tinta">{g.dias}</dt>
              <dd>{g.horario === "cerrado" ? "Cerrado" : g.horario}</dd>
            </div>
          ))}
        </dl>
      </Bloque>

      <Bloque titulo="Contacto">
        {/* 24 px entre enlaces: así el área táctil de 44 px de cada uno no pisa la del otro. */}
        <div className="flex flex-col gap-6">
          {d.whatsapp && (
            <a href={enlaceWhatsApp(d.whatsapp)} target="_blank" rel="noreferrer" className={ENLACE_DESTACADO}>
              WhatsApp {formatearWhatsApp(d.whatsapp)}
            </a>
          )}
          {d.correo && (
            <a href={`mailto:${d.correo}`} className="tt-area-toque self-start break-words underline-offset-4 hover:text-tinta hover:underline">
              {d.correo}
            </a>
          )}
        </div>
        <RedesSociales redes={d.redes} variante="iconos" className="mt-1" />
      </Bloque>
    </>
  );
}

/** Enlaces sueltos del pie: 44 px de área táctil sin cambiar el espaciado (tt-area-toque). */
const ENLACE_DESTACADO = "tt-area-toque self-start font-semibold text-tinta underline-offset-4 hover:underline";

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2 text-sm text-tinta-suave">
      <h2 className="font-heading text-lg font-bold italic text-tinta">{titulo}</h2>
      {children}
    </section>
  );
}
