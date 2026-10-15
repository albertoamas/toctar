import type { Metadata } from "next";
import { Suspense } from "react";
import { exigirModulo } from "@/lib/sesion";
import { FormularioContenido } from "@/modulos/sitio/componentes/formulario-contenido";
import { CLAVES_PAGINA } from "@/modulos/sitio/contenido";
import { obtenerContenidos } from "@/modulos/sitio/consultas";

export const metadata: Metadata = { title: "Textos del sitio" };

// HU-08: textos de portada, nosotros y contacto. Dueño o encargado con el permiso "sitio".
export default function PaginaTextos() {
  return (
    <Suspense fallback={<p className="text-tinta-suave">Cargando…</p>}>
      <Contenido />
    </Suspense>
  );
}

async function Contenido() {
  await exigirModulo("sitio");
  const contenidos = await obtenerContenidos();
  return (
    <div className="flex max-w-2xl flex-col gap-14">
      {CLAVES_PAGINA.map((pagina) => (
        <FormularioContenido key={pagina} pagina={pagina} contenido={contenidos[pagina]} />
      ))}
    </div>
  );
}
