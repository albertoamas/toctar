import type { Metadata } from "next";
import { Suspense } from "react";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { PaginaPanel } from "@/componentes/panel/pagina-panel";
import { exigirModulo } from "@/lib/sesion";
import { SeccionConEditar } from "@/componentes/panel/seccion-con-editar";
import { FormularioContenido, TextosDePagina } from "@/modulos/sitio/componentes/formulario-contenido";
import { FotoDePagina } from "@/modulos/sitio/componentes/foto-pagina";
import { CLAVES_PAGINA, llevaFoto, PAGINAS, type Pagina } from "@/modulos/sitio/contenido";
import { obtenerContenidos, obtenerFotosDePaginas } from "@/modulos/sitio/consultas";

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
  const [contenidos, fotos] = await Promise.all([obtenerContenidos(), obtenerFotosDePaginas()]);
  return (
    <>
      <EncabezadoPagina titulo={elegida ? PAGINAS[elegida].titulo : "Textos del sitio"} volver={{ href: "/panel/sitio", texto: "Sitio web" }} />
      <div className="flex flex-col gap-8">
        {paginas.map((p) => (
          <SeccionConEditar
            key={p}
            id={p}
            // Entrando a una sola, el título de la pantalla ya es su nombre: la tarjeta dice lo que lleva
            titulo={elegida ? (llevaFoto(p) ? "Textos y foto" : "Textos") : PAGINAS[p].titulo}
            etiquetaEditar={`Editar ${PAGINAS[p].titulo.toLowerCase()}`}
            tituloModal={PAGINAS[p].titulo}
            lectura={
              <div className="flex flex-col gap-4">
                <TextosDePagina pagina={p} contenido={contenidos[p]} />
                {/* La portada lleva la foto del taller y Nosotros la del equipo, al pie de sus textos */}
                {llevaFoto(p) && <FotoDePagina pagina={p} foto={fotos[p] ?? null} />}
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
