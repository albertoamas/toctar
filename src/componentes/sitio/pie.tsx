import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { resumirHorarios } from "@/lib/horarios";
import { enlaceMapa } from "@/lib/ubicacion";
import { enlaceWhatsApp, formatearWhatsApp } from "@/lib/whatsapp";
import { NOMBRE_RED, REDES } from "@/modulos/configuracion/esquemas";
import { obtenerDatosPublicos } from "@/modulos/configuracion/consultas";

// Pie del sitio (componente PieSitio del Design System). Los datos salen de la configuración
// (HU-04, RF-17): el dueño los cambia en el panel y se ven al guardar.
// El build no tiene base de datos: los datos se leen al atender el pedido (connection) y quedan
// en caché con la etiqueta "negocio" hasta que se editen.

const ENLACES = [
  { href: "/servicios", texto: "Servicios" },
  { href: "/galeria", texto: "Galería" },
  { href: "/nosotros", texto: "Nosotros" },
  { href: "/preguntas-frecuentes", texto: "Preguntas frecuentes" },
  { href: "/contacto", texto: "Contacto" },
];

export function Pie() {
  // Sin línea LED: el encabezado y la portada ya la usan (máximo dos por página).
  return (
    <footer className="border-t border-border bg-fondo">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
        <div className="flex flex-col items-start gap-4">
          <Image src="/marca/toctar-monograma-sobre-oscuro.svg" alt="" width={48} height={36} unoptimized />
          <p className="tt-lema whitespace-nowrap text-tinta-suave">Como ven tu auto, te ven a ti</p>
        </div>
        <Suspense fallback={null}>
          <DatosDelNegocio />
        </Suspense>
      </div>
      <nav aria-label="Pie" className="mx-auto flex max-w-6xl flex-wrap gap-x-6 gap-y-2 border-t border-border px-4 py-6 pb-24 text-sm text-tinta-suave md:pb-6">
        {ENLACES.map((e) => (
          <Link key={e.href} href={e.href} className="hover:text-tinta hover:underline">
            {e.texto}
          </Link>
        ))}
      </nav>
    </footer>
  );
}

async function DatosDelNegocio() {
  await connection();
  const d = await obtenerDatosPublicos();
  const redes = REDES.filter((r) => d.redes[r]);

  return (
    <>
      <Bloque titulo="Dónde estamos">
        <address className="not-italic">{d.direccion}</address>
        {d.coordenadas && (
          <a href={enlaceMapa(d.coordenadas)} target="_blank" rel="noreferrer" className="font-semibold text-tinta underline-offset-4 hover:underline">
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
        {d.whatsapp && (
          <a href={enlaceWhatsApp(d.whatsapp)} target="_blank" rel="noreferrer" className="font-semibold text-tinta underline-offset-4 hover:underline">
            WhatsApp {formatearWhatsApp(d.whatsapp)}
          </a>
        )}
        {d.correo && (
          <a href={`mailto:${d.correo}`} className="underline-offset-4 hover:text-tinta hover:underline">
            {d.correo}
          </a>
        )}
        {redes.length > 0 && (
          <ul aria-label="Redes sociales" className="flex flex-wrap gap-x-4 gap-y-1">
            {redes.map((r) => (
              <li key={r}>
                <a href={d.redes[r]} target="_blank" rel="noreferrer" className="underline-offset-4 hover:text-tinta hover:underline">
                  {NOMBRE_RED[r]}
                </a>
              </li>
            ))}
          </ul>
        )}
      </Bloque>
    </>
  );
}

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2 text-sm text-tinta-suave">
      <h2 className="font-heading text-lg font-bold italic text-tinta">{titulo}</h2>
      {children}
    </section>
  );
}
