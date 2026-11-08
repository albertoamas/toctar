import type { Metadata } from "next";
import { cache, Suspense } from "react";
import Link from "next/link";
import { cn } from "cn";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { ENLACE_TEXTO } from "@/componentes/panel/enlace-texto";
import { EstadoVacio } from "@/componentes/panel/estado-vacio";
import { ListaFilas } from "@/componentes/panel/fila-lista";
import { puedeVerModulo } from "@/lib/permisos";
import { exigirModulo } from "@/lib/sesion";
import { OrdenarServicios } from "@/modulos/sitio/componentes/ordenar-servicios";
import { listarServicios } from "@/modulos/sitio/consultas";
import { loQueFaltaEnPagina } from "@/modulos/sitio/esquemas";

export const metadata: Metadata = { title: "Servicios del sitio" };

// HU-07: la página de cada servicio en el sitio, en orden. Dueño o encargado con el permiso "sitio". Los servicios se
// agregan en el catálogo (lo hace el dueño: llevan precios).
// Pulido 13.21: una lista como las demás del panel (`ListaFilas`, con su miniatura): cada fila dice si está en el sitio y
// qué le falta a su página; el resumen ya está en la ficha. Ordenar, poco frecuente, en "Cambiar orden" (un modal) y no
// con flechas en cada fila; el catálogo, al pie y no en un párrafo arriba.
export default function PaginaServicios() {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      {/* El título se ve enseguida; "Cambiar orden" llega con los servicios */}
      <EncabezadoPagina
        titulo="Servicios"
        volver={{ href: "/panel/sitio", texto: "Sitio web" }}
        accion={
          <Suspense fallback={null}>
            <BotonOrdenar />
          </Suspense>
        }
      />
      <Suspense fallback={<Cargando />}>
        <Lista />
      </Suspense>
    </div>
  );
}

/** Los servicios, una vez por pedido aunque los lean el botón y la lista. */
const servicios = cache(async () => {
  const usuario = await exigirModulo("sitio");
  return { usuario, servicios: await listarServicios() };
});

async function BotonOrdenar() {
  const { servicios: lista } = await servicios();
  return lista.length > 1 && <OrdenarServicios servicios={lista.map((s) => ({ id: s.id, nombre: s.nombre }))} />;
}

async function Lista() {
  const { usuario, servicios: lista } = await servicios();
  const catalogo = puedeVerModulo(usuario, "catalogo");
  if (lista.length === 0) {
    return (
      <EstadoVacio>
        {catalogo ? (
          <>
            Todavía no hay servicios. Se agregan en{" "}
            <Link href="/panel/catalogo" className={cn(ENLACE_TEXTO, "text-tinta")}>
              Catálogo y precios
            </Link>
            .
          </>
        ) : (
          "Todavía no hay servicios. El dueño los agrega en Catálogo y precios."
        )}
      </EstadoVacio>
    );
  }
  return (
    <>
      <ListaFilas
        etiqueta="Servicios del sitio"
        filas={lista.map((s) => ({
          href: `/panel/sitio/servicios/${s.id}`,
          titulo: s.nombre,
          estado: s.visible ? "En el sitio" : "Oculto",
          tonoEstado: s.visible ? "exito" : undefined,
          aviso: loQueFaltaEnPagina({ resumen: s.resumen, cantidadPasos: s.cantidadPasos, conFoto: !!s.foto }),
          miniatura: s.foto?.miniatura ?? null,
        }))}
      />
      {catalogo ? (
        <p className="text-sm text-tinta-suave">
          ¿Falta un servicio? Se agrega en{" "}
          <Link href="/panel/catalogo" className={cn(ENLACE_TEXTO, "text-tinta")}>
            Catálogo y precios
          </Link>
          .
        </p>
      ) : (
        <p className="text-sm text-tinta-suave">Los servicios nuevos los agrega el dueño.</p>
      )}
    </>
  );
}
