import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { cn } from "cn";
import { Cargando } from "@/componentes/panel/cargando";
import { ENLACE_TEXTO } from "@/componentes/panel/enlace-texto";
import { puedeVerModulo } from "@/lib/permisos";
import { exigirModulo } from "@/lib/sesion";
import { ListaServicios } from "@/modulos/sitio/componentes/lista-servicios";
import { listarServicios } from "@/modulos/sitio/consultas";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";

export const metadata: Metadata = { title: "Servicios del sitio" };

// HU-07: la página de cada servicio en el sitio, en orden. Dueño o encargado con el permiso "sitio". Los servicios se
// agregan en el catálogo (lo hace el dueño: llevan precios); pulido 13.2: para él, el enlace en lugar de la explicación.
export default function PaginaServicios() {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <EncabezadoPagina titulo="Servicios" volver={{ href: "/panel/sitio", texto: "Sitio web" }} />
      <Suspense fallback={<Cargando />}>
        <Lista />
      </Suspense>
    </div>
  );
}

async function Lista() {
  const usuario = await exigirModulo("sitio");
  const servicios = await listarServicios();
  return (
    <>
      <div className="flex flex-col gap-1">
        <p className="text-tinta-suave">
          En este orden salen en el sitio. Toca uno para editar su página.
          {!puedeVerModulo(usuario, "catalogo") && " Los servicios nuevos los agrega el dueño."}
        </p>
        {puedeVerModulo(usuario, "catalogo") && (
          <Link href="/panel/catalogo" className={cn(ENLACE_TEXTO, "text-tinta")}>
            Agregar un servicio en el catálogo
          </Link>
        )}
      </div>
      <ListaServicios
      servicios={servicios.map((s) => ({
        id: s.id,
        nombre: s.nombre,
        resumen: s.resumen,
        visible: s.visible,
        miniatura: s.foto?.miniatura ?? null,
      }))}
      />
    </>
  );
}
