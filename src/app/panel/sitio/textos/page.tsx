import type { Metadata } from "next";
import { Suspense } from "react";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { exigirModulo } from "@/lib/sesion";
import { FormularioContenido } from "@/modulos/sitio/componentes/formulario-contenido";
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
export default function PaginaTextos({ searchParams }: PageProps<"/panel/sitio/textos">) {
  return (
    <Suspense fallback={<Cargando />}>
      <Contenido searchParams={searchParams} />
    </Suspense>
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
      <div className="flex max-w-2xl flex-col gap-6">
        {/* Varios formularios a la vista: cada uno guarda lo suyo */}
        {!elegida && <p className="text-sm text-tinta-suave">Cada parte se guarda con su botón.</p>}
        {/* Cada página del sitio, una tarjeta con sus textos y su foto: son formularios aparte (pulido 4.5) */}
        {paginas.map((p) => (
          <div key={p} className="tt-formulario-panel flex flex-col gap-8">
            <FormularioContenido pagina={p} contenido={contenidos[p]} tituloOculto={elegida !== null} />
            {/* La portada lleva la foto del taller y Nosotros la del equipo, debajo de sus textos */}
            {llevaFoto(p) && <FotoDePagina pagina={p} foto={fotos[p] ?? null} />}
          </div>
        ))}
      </div>
    </>
  );
}
