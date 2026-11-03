import type { Metadata } from "next";
import { Suspense } from "react";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { Insignia } from "@/componentes/panel/insignia";
import { CeldaDoble, TablaLista } from "@/componentes/panel/tabla-lista";
import { cantidad } from "@/lib/cantidad";
import { exigirModulo } from "@/lib/sesion";
import { AgregarServicio } from "@/modulos/catalogo/componentes/agregar-servicio";
import { listarCatalogo } from "@/modulos/catalogo/consultas";
import { mostrarMonto, textoDias } from "@/modulos/catalogo/reglas";

export const metadata: Metadata = { title: "Catálogo y precios" };

// HU-19 y HU-20: los servicios, con su precio más bajo, su duración y si les faltan precios; aquí se agregan. Solo el
// dueño (RN-01). Una tabla (pedido 26) con lo que decide a la vista: desde cuánto cuesta y si faltan precios.
export default function PaginaCatalogo() {
  return (
    <section className="flex max-w-5xl flex-col gap-6">
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
    <TablaLista
      etiqueta="Servicios del catálogo"
      columnas={[
        { titulo: "Servicio", ancho: "minmax(0,1.6fr)", movil: "titulo" },
        { titulo: "Precio", ancho: "minmax(0,1fr)", alinear: "derecha", movil: "estado" },
        { titulo: "Variantes", ancho: "6.5rem", movil: "par" },
        { titulo: "Duración", ancho: "5.5rem", movil: "par" },
        { titulo: "Estado", ancho: "minmax(0,1fr)", movil: "detalle" },
      ]}
      filas={servicios.map((s) => ({
        href: `/panel/catalogo/${s.id}`,
        atenuada: !s.activo,
        celdas: [
          <CeldaDoble key="s" principal={s.nombre} secundario={s.conMantenimiento ? "Con mantenimiento" : undefined} />,
          // Sin precios cargados, nada: lo dice "Faltan precios"
          s.desde === undefined ? null : (
            <span key="p" className="font-semibold tabular-nums">
              {s.desde === null ? "Según evaluación" : `Desde ${mostrarMonto(s.desde)} Bs`}
            </span>
          ),
          cantidad(s.variantes, "variante", "variantes"),
          textoDias(s.duracionDias),
          // Solo lo que pide atención: lo que falta cargar o si está inactivo; completo, no dice nada (pulido 7.1)
          !s.activo ? (
            <Insignia key="e">Inactivo</Insignia>
          ) : s.preciosFaltantes > 0 ? (
            <Insignia key="e" tono="aviso">
              {s.preciosFaltantes === 1 ? "Falta" : "Faltan"} {cantidad(s.preciosFaltantes, "precio", "precios")}
            </Insignia>
          ) : null,
        ],
      }))}
    />
  );
}
