import type { Metadata } from "next";
import { Suspense } from "react";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { ListaFilas } from "@/componentes/panel/fila-lista";
import { cantidad } from "@/lib/cantidad";
import { exigirModulo } from "@/lib/sesion";
import { AgregarServicio } from "@/modulos/catalogo/componentes/agregar-servicio";
import { listarCatalogo } from "@/modulos/catalogo/consultas";
import { mostrarMonto, textoDias } from "@/modulos/catalogo/reglas";

export const metadata: Metadata = { title: "Catálogo y precios" };

// HU-19 y HU-20: los servicios, con su precio más bajo, su duración y si les faltan precios; aquí se agregan. Solo el
// dueño (RN-01). Una lista de un toque (pulido 7.1): lo que decide (desde cuánto cuesta y si faltan precios) a la vista.
export default function PaginaCatalogo() {
  return (
    <section className="flex max-w-3xl flex-col gap-6">
      <EncabezadoPagina
        titulo="Catálogo y precios"
        // Un solo campo: un modal y no otra pantalla (pulido 7.2)
        accion={<AgregarServicio />}
      >
        Los precios no salen en el sitio.
      </EncabezadoPagina>
      <Suspense fallback={<Cargando />}>
        <Lista />
      </Suspense>
    </section>
  );
}

async function Lista() {
  await exigirModulo("catalogo");
  const servicios = await listarCatalogo();
  return (
    <ListaFilas
      etiqueta="Servicios del catálogo"
      filas={servicios.map((s) => ({
        href: `/panel/catalogo/${s.id}`,
        titulo: s.nombre,
        dato: s.desde === undefined ? null : s.desde === null ? "Según evaluación" : `Desde ${mostrarMonto(s.desde)} Bs`,
        detalles: [cantidad(s.variantes, "variante", "variantes"), textoDias(s.duracionDias), ...(s.generaMantenimiento ? ["Con mantenimiento"] : [])],
        // Solo lo que falta cargar; completos no dice nada
        aviso: s.activo && s.preciosFaltantes > 0 ? `${s.preciosFaltantes === 1 ? "Falta" : "Faltan"} ${cantidad(s.preciosFaltantes, "precio", "precios")}` : null,
        estado: s.activo ? undefined : "Inactivo",
        atenuada: !s.activo,
      }))}
    />
  );
}
