import type { Metadata } from "next";
import { Suspense } from "react";
import { Cargando } from "@/componentes/panel/cargando";
import { exigirModulo } from "@/lib/sesion";
import { FormularioContenido } from "@/modulos/sitio/componentes/formulario-contenido";
import { FotoPortada } from "@/modulos/sitio/componentes/foto-portada";
import { CLAVES_PAGINA } from "@/modulos/sitio/contenido";
import { obtenerContenidos, obtenerFotoPortada } from "@/modulos/sitio/consultas";

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
  const [contenidos, fotoPortada] = await Promise.all([obtenerContenidos(), obtenerFotoPortada()]);
  return (
    <div className="flex max-w-2xl flex-col gap-14">
      {CLAVES_PAGINA.map((pagina) =>
        pagina === "inicio" ? (
          <div key={pagina} className="flex flex-col gap-8">
            <FormularioContenido pagina={pagina} contenido={contenidos[pagina]} />
            <FotoPortada foto={fotoPortada} />
          </div>
        ) : (
          <FormularioContenido key={pagina} pagina={pagina} contenido={contenidos[pagina]} />
        ),
      )}
    </div>
  );
}
