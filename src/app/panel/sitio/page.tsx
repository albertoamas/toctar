import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Cargando } from "@/componentes/panel/cargando";
import { ENLACE_TEXTO } from "@/componentes/panel/enlace-texto";
import { puedeVerModulo } from "@/lib/permisos";
import { exigirModulo } from "@/lib/sesion";
import { ListaServicios } from "@/modulos/sitio/componentes/lista-servicios";
import { listarServicios } from "@/modulos/sitio/consultas";

export const metadata: Metadata = { title: "Servicios del sitio" };

// HU-07: la página de cada servicio en el sitio, en orden. Dueño o encargado con el permiso "sitio". Los servicios se
// agregan en el catálogo (lo hace el dueño: llevan precios); pulido 13.2: para él, el enlace en lugar de la explicación.
export default function PaginaServicios() {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
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
      <p className="flex flex-wrap items-center gap-x-3 text-tinta-suave">
        En este orden salen en el sitio.
        {puedeVerModulo(usuario, "catalogo") && (
          <Link href="/panel/catalogo" className={ENLACE_TEXTO + " text-tinta"}>
            Agregar un servicio en el catálogo
          </Link>
        )}
      </p>
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
