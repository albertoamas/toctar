import type { Metadata } from "next";
import { Suspense } from "react";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { PaginaPanel } from "@/componentes/panel/pagina-panel";
import { exigirModulo } from "@/lib/sesion";
import { SeccionConEditar } from "@/componentes/panel/seccion-con-editar";
import { FormularioContenido, FormularioSeccion, TextosDePagina } from "@/modulos/sitio/componentes/formulario-contenido";
import { FotoDePagina } from "@/modulos/sitio/componentes/foto-pagina";
import { VideoDePortada } from "@/modulos/sitio/componentes/video-portada";
import { obtenerDatosPublicos } from "@/modulos/configuracion/consultas";
import { CLAVES_PAGINA, editaPorSeccion, llevaFoto, PAGINAS, PORTADA, type CampoContenido, type ContenidoPagina, type Pagina } from "@/modulos/sitio/contenido";
import { CabeceraSeccion } from "@/componentes/panel/cabecera-seccion";
import { obtenerContenidos, obtenerFotosDePaginas, obtenerVideoDePortada } from "@/modulos/sitio/consultas";

/** El título de la pestaña del navegador, el mismo que el de la pantalla: "Portada", o "Textos del sitio" si se ven todas. */
export async function generateMetadata({ searchParams }: PageProps<"/panel/sitio/textos">): Promise<Metadata> {
  const { pagina } = await searchParams;
  return { title: esPagina(pagina) ? PAGINAS[pagina].titulo : "Textos del sitio" };
}

// HU-08: textos de portada (con la foto del taller), nosotros y contacto. Dueño o encargado con el permiso "sitio".
// Pedido 26: desde la portada de Sitio web se entra a una página (?pagina=inicio): solo sus textos y su foto. Sin
// ?pagina (o con una que no existe), todas, una debajo de otra.
// Pulido 13.20: cada página es una tarjeta que se lee (sus textos y, al pie, su foto) con su "Editar" en un modal. Antes
// eran formularios abiertos, uno debajo de otro, con su botón gris y fotos grandes con su guía (4,3 pantallas en el celular).
export default function PaginaTextos({ searchParams }: PageProps<"/panel/sitio/textos">) {
  return (
    <PaginaPanel tipo="ficha">
      <Suspense fallback={<Cargando volver={{ href: "/panel/sitio", texto: "Sitio web" }} />}>
        <Contenido searchParams={searchParams} />
      </Suspense>
    </PaginaPanel>
  );
}

const esPagina = (valor: unknown): valor is Pagina => typeof valor === "string" && (CLAVES_PAGINA as readonly string[]).includes(valor);

async function Contenido({ searchParams }: Pick<PageProps<"/panel/sitio/textos">, "searchParams">) {
  await exigirModulo("sitio");
  const { pagina } = await searchParams;
  const elegida = esPagina(pagina) ? pagina : null;
  const paginas = elegida ? [elegida] : CLAVES_PAGINA;
  const [contenidos, fotos, video, { redes }] = await Promise.all([obtenerContenidos(), obtenerFotosDePaginas(), obtenerVideoDePortada(), obtenerDatosPublicos()]);
  return (
    <>
      <EncabezadoPagina titulo={elegida ? PAGINAS[elegida].titulo : "Textos del sitio"} volver={{ href: "/panel/sitio", texto: "Sitio web" }} />
      <div className="flex flex-col gap-8">
        {paginas.map((p) => editaPorSeccion(p) ? (
          <SeccionesDePagina key={p} pagina={p} contenido={contenidos[p]} conTitulo={!elegida} />
        ) : (
          <SeccionConEditar
            key={p}
            id={p}
            // Entrando a una sola, el título de la pantalla ya es su nombre: la tarjeta dice lo que lleva
            titulo={elegida ? (p === PORTADA ? "Textos, foto y video" : llevaFoto(p) ? "Textos y foto" : "Textos") : PAGINAS[p].titulo}
            etiquetaEditar={`Editar ${PAGINAS[p].titulo.toLowerCase()}`}
            tituloModal={PAGINAS[p].titulo}
            lectura={
              <div className="flex flex-col gap-4">
                <TextosDePagina pagina={p} contenido={contenidos[p]} />
                {/* La portada lleva la foto del taller y Nosotros la del equipo, al pie de sus textos */}
                {llevaFoto(p) && <FotoDePagina pagina={p} foto={fotos[p] ?? null} />}
                {/* Y la portada, el video de "Mira cómo trabajamos" (pedido 48) */}
                {p === PORTADA && <VideoDePortada video={video} hayTikTok={!!redes.tiktok} />}
              </div>
            }
          >
            <FormularioContenido pagina={p} contenido={contenidos[p]} />
          </SeccionConEditar>
        ))}
      </div>
    </>
  );
}

/**
 * Una página larga (la privacidad), sección por sección (pulido 13.60): cada texto en su tarjeta, con su "Editar" y su
 * modal con ese texto solo. Antes, un modal con los 9 textos. Con todas las páginas a la vista, su título arriba.
 */
function SeccionesDePagina({ pagina, contenido, conTitulo }: { pagina: Pagina; contenido: ContenidoPagina; conTitulo: boolean }) {
  const campos = PAGINAS[pagina].campos as readonly CampoContenido[];
  return (
    <section aria-labelledby={conTitulo ? `${pagina}-titulo` : undefined} aria-label={conTitulo ? undefined : PAGINAS[pagina].titulo} className="flex flex-col gap-6">
      {conTitulo && <CabeceraSeccion id={pagina} titulo={PAGINAS[pagina].titulo} />}
      <p className="text-sm text-tinta-suave">{PAGINAS[pagina].descripcion} Cada sección se edita por separado.</p>
      {campos.map((c) => (
        <SeccionConEditar
          key={c.clave}
          id={`${pagina}-${c.clave}`}
          titulo={c.etiqueta}
          nivel={conTitulo ? 3 : 2}
          claseRecuadro={conTitulo ? "bg-fondo" : undefined}
          etiquetaEditar={`Editar ${c.etiqueta.toLowerCase()}`}
          tituloModal={c.etiqueta}
          // Los textos largos, en cuatro líneas: enteros en su "Editar" (como los de las demás páginas)
          lectura={<p className="line-clamp-4 whitespace-pre-line">{contenido[c.clave] as string}</p>}
        >
          <FormularioSeccion pagina={pagina} clave={c.clave} valor={contenido[c.clave] as string} />
        </SeccionConEditar>
      ))}
    </section>
  );
}
