import type { Metadata } from "next";
import { Suspense } from "react";
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

export const metadata: Metadata = { title: "Servicios del sitio" };

// HU-07: la página de cada servicio en el sitio, en orden. Dueño o encargado con el permiso "sitio". Los servicios se
// agregan en el catálogo (lo hace el dueño: llevan precios).
// Pulido 13.21: una lista como las demás del panel (`ListaFilas`, con su miniatura): cada fila dice si está en el sitio y
// qué le falta a su página; el resumen ya está en la ficha. Ordenar, poco frecuente, en "Cambiar orden" (un modal) y no
// con flechas en cada fila; el catálogo, al pie y no en un párrafo arriba.
export default function PaginaServicios() {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Suspense fallback={<Cargando volver={{ href: "/panel/sitio", texto: "Sitio web" }} />}>
        <Lista />
      </Suspense>
    </div>
  );
}

/** Lo primero que le falta a su página, o null: sin resumen no se puede mostrar; sin pasos ni foto, sale incompleta. */
function loQueFalta(s: { resumen: string; cantidadPasos: number; foto: unknown }): string | null {
  if (!s.resumen.trim()) return "Falta el resumen";
  if (s.cantidadPasos === 0) return "Sin pasos";
  if (!s.foto) return "Sin foto";
  return null;
}

async function Lista() {
  const usuario = await exigirModulo("sitio");
  const servicios = await listarServicios();
  const catalogo = puedeVerModulo(usuario, "catalogo");
  return (
    <>
      <EncabezadoPagina
        titulo="Servicios"
        volver={{ href: "/panel/sitio", texto: "Sitio web" }}
        accion={servicios.length > 1 && <OrdenarServicios servicios={servicios.map((s) => ({ id: s.id, nombre: s.nombre }))} />}
      />
      {servicios.length === 0 ? (
        <EstadoVacio>Todavía no hay servicios. El dueño los agrega en Catálogo y precios.</EstadoVacio>
      ) : (
        <ListaFilas
          etiqueta="Servicios del sitio"
          filas={servicios.map((s) => ({
            href: `/panel/sitio/servicios/${s.id}`,
            titulo: s.nombre,
            estado: s.visible ? "En el sitio" : "Oculto",
            tonoEstado: s.visible ? "exito" : undefined,
            aviso: loQueFalta(s),
            miniatura: s.foto?.miniatura ?? null,
          }))}
        />
      )}
      {catalogo ? (
        <p className="text-sm text-tinta-suave">
          ¿Falta un servicio? Se agrega en{" "}
          <Link href="/panel/catalogo" className={cn(ENLACE_TEXTO, "text-tinta")}>
            Catálogo y precios
          </Link>
          .
        </p>
      ) : (
        servicios.length > 0 && <p className="text-sm text-tinta-suave">Los servicios nuevos los agrega el dueño.</p>
      )}
    </>
  );
}
