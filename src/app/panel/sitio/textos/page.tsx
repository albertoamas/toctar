import type { Metadata } from "next";
import { Suspense } from "react";
import { cn } from "cn";
import { Cargando } from "@/componentes/panel/cargando";
import { exigirModulo } from "@/lib/sesion";
import { FormularioContenido } from "@/modulos/sitio/componentes/formulario-contenido";
import { FotoDePagina } from "@/modulos/sitio/componentes/foto-pagina";
import { CLAVES_PAGINA, llevaFoto } from "@/modulos/sitio/contenido";
import { obtenerContenidos, obtenerFotosDePaginas } from "@/modulos/sitio/consultas";

export const metadata: Metadata = { title: "Textos del sitio" };

// HU-08: textos de portada (con la foto del taller), nosotros y contacto. Dueño o encargado con el permiso "sitio".
export default function PaginaTextos() {
  return (
    <Suspense fallback={<Cargando />}>
      <Contenido />
    </Suspense>
  );
}

async function Contenido() {
  await exigirModulo("sitio");
  const [contenidos, fotos] = await Promise.all([obtenerContenidos(), obtenerFotosDePaginas()]);
  return (
    <div className="flex max-w-2xl flex-col gap-10">
      <p className="text-sm text-tinta-suave">Cada parte se guarda con su botón.</p>
      {/* Una línea entre las partes: son formularios aparte (pulido 4.5) */}
      {CLAVES_PAGINA.map((pagina, i) => (
        <div key={pagina} className={cn("flex flex-col gap-8", i > 0 && "border-t border-border pt-10")}>
          <FormularioContenido pagina={pagina} contenido={contenidos[pagina]} />
          {/* La portada lleva la foto del taller y Nosotros la del equipo, debajo de sus textos */}
          {llevaFoto(pagina) && <FotoDePagina pagina={pagina} foto={fotos[pagina] ?? null} />}
        </div>
      ))}
    </div>
  );
}
