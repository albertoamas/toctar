import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { TituloPagina } from "@/componentes/sitio/titulo-pagina";
import { fechaEnBolivia, formatearFecha } from "@/lib/fechas";
import { formatearWhatsApp } from "@/lib/whatsapp";
import { obtenerDatosPublicos } from "@/modulos/configuracion/consultas";
import { PAGINAS } from "@/modulos/sitio/contenido";
import { contenidoConFechaPublico } from "@/modulos/sitio/publico";
import { bloquesDeTexto, conDatosDelNegocio, type DatosParaTexto } from "@/modulos/sitio/texto-con-formato";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: "Qué datos guarda el taller, para qué los usa, quién los ve y cómo pedir que se corrijan o se borren.",
};

// Pedido 49 (P49-politica-de-privacidad.md). El texto sale del panel (Sitio web > Textos > Privacidad), una sección por
// campo con su título; los datos del negocio, entre llaves, de Configuración. "Última actualización": cuándo se guardó.
// Llega entera, con el título: nada aparece suelto antes que el resto (pulido 2.1 y 2.5).
export default function PaginaPrivacidad() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <Contenido />
    </Suspense>
  );
}

async function Contenido() {
  await connection();
  const [{ datos: texto, actualizada }, negocio] = await Promise.all([contenidoConFechaPublico("privacidad"), obtenerDatosPublicos()]);
  const datos: DatosParaTexto = {
    negocio: negocio.nombre,
    direccion: negocio.direccion,
    whatsapp: negocio.whatsapp ? formatearWhatsApp(negocio.whatsapp) : null,
    correo: negocio.correo,
  };
  const [presentacion, ...secciones] = PAGINAS.privacidad.campos;
  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-12 md:py-20">
      <header className="flex flex-col gap-3">
        <TituloPagina>{PAGINAS.privacidad.titulo}</TituloPagina>
        {actualizada && <p className="text-sm text-tinta-suave">Última actualización: {formatearFecha(fechaEnBolivia(new Date(actualizada)))}</p>}
        <Bloques texto={conDatosDelNegocio(texto[presentacion.clave] as string, datos)} entrada />
      </header>
      {secciones.map((s) => (
        <section key={s.clave} aria-labelledby={`privacidad-${s.clave}`} className="flex flex-col gap-4">
          <h2 id={`privacidad-${s.clave}`} className="font-heading text-[26px] leading-7 font-extrabold italic">
            {s.etiqueta}
          </h2>
          <Bloques texto={conDatosDelNegocio(texto[s.clave] as string, datos)} />
        </section>
      ))}
    </article>
  );
}

/** Párrafos y listas del texto (`bloquesDeTexto`). `entrada`: la presentación, en blanco y más grande. */
function Bloques({ texto, entrada = false }: { texto: string; entrada?: boolean }) {
  const clase = entrada ? "text-xl leading-8 text-tinta" : "text-lg leading-7 text-tinta-suave";
  return bloquesDeTexto(texto).map((b, i) =>
    b.tipo === "parrafo" ? (
      <p key={i} className={`max-w-prose whitespace-pre-line ${clase}`}>
        {b.texto}
      </p>
    ) : (
      <ul key={i} className={`flex max-w-prose list-disc flex-col gap-2 pl-6 marker:text-rojo-texto ${clase}`}>
        {b.items.map((item, j) => (
          <li key={j}>{item}</li>
        ))}
      </ul>
    ),
  );
}
