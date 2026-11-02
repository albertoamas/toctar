import { Suspense } from "react";
import { PestanasSitio } from "@/modulos/sitio/componentes/pestanas";

// Encabezado y pestañas del módulo Sitio web. Este layout NO protege: cada página llama a exigirModulo.
// Las pestañas leen la ruta (usePathname): en rutas dinámicas como /servicios/[id] van dentro de <Suspense>.
export default function LayoutSitioWeb({ children }: LayoutProps<"/panel/sitio">) {
  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <h1 className="tt-titulo-pagina">Sitio web</h1>
        <Suspense fallback={<div className="h-12 border-b border-border" />}>
          <PestanasSitio />
        </Suspense>
      </div>
      {children}
    </section>
  );
}
