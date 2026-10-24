import type { Metadata } from "next";
import { Suspense } from "react";
import { cn } from "cn";
import { Cargando } from "@/componentes/panel/cargando";
import { exigirModulo } from "@/lib/sesion";
import { FormularioContenido } from "@/modulos/sitio/componentes/formulario-contenido";
import { FotoDePagina } from "@/modulos/sitio/componentes/foto-pagina";
import { CLAVES_PAGINA, PAGINAS_CON_FOTO, type PaginaConFoto } from "@/modulos/sitio/contenido";
import { obtenerContenidos, obtenerFotoDePagina } from "@/modulos/sitio/consultas";

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
  const [contenidos, ...fotos] = await Promise.all([obtenerContenidos(), ...PAGINAS_CON_FOTO.map((p) => obtenerFotoDePagina(p))]);
  // La portada lleva la foto del taller y Nosotros la del equipo, debajo de sus textos
  const fotoDe = new Map(PAGINAS_CON_FOTO.map((p, i) => [p, fotos[i]]));
  const conFoto = (p: string): p is PaginaConFoto => fotoDe.has(p as PaginaConFoto);
  return (
    <div className="flex max-w-2xl flex-col gap-10">
      <p className="text-sm text-tinta-suave">Cada parte se guarda con su botón.</p>
      {/* Una línea entre las partes: son formularios aparte (pulido 4.5) */}
      {CLAVES_PAGINA.map((pagina, i) => (
        <div key={pagina} className={cn("flex flex-col gap-8", i > 0 && "border-t border-border pt-10")}>
          <FormularioContenido pagina={pagina} contenido={contenidos[pagina]} />
          {conFoto(pagina) && <FotoDePagina pagina={pagina} foto={fotoDe.get(pagina) ?? null} />}
        </div>
      ))}
    </div>
  );
}
