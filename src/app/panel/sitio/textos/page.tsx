import type { Metadata } from "next";
import { Suspense } from "react";
import { cn } from "cn";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { exigirModulo } from "@/lib/sesion";
import { FormularioContenido } from "@/modulos/sitio/componentes/formulario-contenido";
import { FotoDePagina } from "@/modulos/sitio/componentes/foto-pagina";
import { CLAVES_PAGINA, llevaFoto, PAGINAS, type Pagina } from "@/modulos/sitio/contenido";
import { obtenerContenidos, obtenerFotosDePaginas } from "@/modulos/sitio/consultas";

export const metadata: Metadata = { title: "Textos del sitio" };

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
      <div className="flex max-w-2xl flex-col gap-10">
        {/* Una línea entre las partes: son formularios aparte (pulido 4.5) */}
        {paginas.map((p, i) => (
          <div key={p} className={cn("flex flex-col gap-8", i > 0 && "border-t border-border pt-10")}>
            <FormularioContenido pagina={p} contenido={contenidos[p]} tituloOculto={elegida !== null} />
            {/* La portada lleva la foto del taller y Nosotros la del equipo, debajo de sus textos */}
            {llevaFoto(p) && <FotoDePagina pagina={p} foto={fotos[p] ?? null} />}
          </div>
        ))}
      </div>
    </>
  );
}
