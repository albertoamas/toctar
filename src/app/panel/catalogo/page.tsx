import type { Metadata } from "next";
import { Suspense } from "react";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { Insignia } from "@/componentes/panel/insignia";
import { PaginaPanel } from "@/componentes/panel/pagina-panel";
import { CeldaDoble, TablaLista } from "@/componentes/panel/tabla-lista";
import { cantidad } from "@/lib/cantidad";
import { exigirModulo } from "@/lib/sesion";
import { AgregarServicio } from "@/modulos/catalogo/componentes/agregar-servicio";
import { listarCatalogo } from "@/modulos/catalogo/consultas";
import { mostrarMonto, textoDias } from "@/modulos/catalogo/reglas";
import { BarraLista } from "@/componentes/panel/barra-lista";
import { PildoraVista } from "@/componentes/panel/pildora-vista";
import { EstadoVacio } from "@/componentes/panel/estado-vacio";
import { aqui } from "@/lib/volver";

export const metadata: Metadata = { title: "Catálogo y precios" };

// HU-19 y HU-20: los servicios, con su precio más bajo, su duración y si les faltan precios; aquí se agregan. Solo el
// dueño (RN-01). Una tabla (pedido 26) con lo que decide a la vista: desde cuánto cuesta y si faltan precios.
export default function PaginaCatalogo({ searchParams }: PageProps<"/panel/catalogo">) {
  return (
    <PaginaPanel tipo="lista">
      <EncabezadoPagina
        titulo="Catálogo y precios"
        // Un solo campo: un modal y no otra pantalla (pulido 7.2)
        accion={<AgregarServicio />}
      >
        Los precios no salen en el sitio.
      </EncabezadoPagina>
      <Suspense fallback={<Cargando />}>
        <Lista searchParams={searchParams} />
      </Suspense>
    </PaginaPanel>
  );
}

// Barra de las listas (10/11): los inactivos, aparte, con la píldora "Inactivos", como los desactivados de Clientes y
// Usuarios (antes, atenuados entre los demás)
async function Lista({ searchParams }: Pick<PageProps<"/panel/catalogo">, "searchParams">) {
  await exigirModulo("catalogo");
  const [todos, { ver }] = await Promise.all([listarCatalogo(), searchParams]);
  const inactivos = ver === "inactivos";
  const servicios = todos.filter((s) => s.activo !== inactivos);
  return (
    <>
    <BarraLista derecha={<PildoraVista texto="Inactivos" valor="inactivos" />} />
    {servicios.length === 0 ? (
      <EstadoVacio>
        {inactivos
          ? "No hay servicios inactivos."
          : todos.length > 0
            ? "No hay servicios activos: los demás están en «Inactivos»."
            : "Todavía no hay servicios. Agrega el primero con «Agregar servicio»."}
      </EstadoVacio>
    ) : (
    <TablaLista
      desde={aqui("/panel/catalogo", { ver })}
      etiqueta="Servicios del catálogo"
      columnas={[
        { titulo: "Servicio", ancho: "minmax(0,1.6fr)", movil: "titulo" },
        { titulo: "Precio", ancho: "minmax(0,1fr)", alinear: "derecha", movil: "estado" },
        { titulo: "Variantes", ancho: "6.5rem", movil: "par" },
        { titulo: "Duración", ancho: "5.5rem", movil: "par" },
        // Solo si a alguno le faltan precios: con todo cargado, era una columna vacía (inventario-pantallas.md, cambio 4d)
        { titulo: "Falta", ancho: "minmax(0,1fr)", movil: "detalle", ocultarSiVacia: true },
      ]}
      filas={servicios.map((s) => ({
        href: `/panel/catalogo/${s.id}`,
        celdas: [
          <CeldaDoble key="s" principal={s.nombre} secundario={s.conMantenimiento ? "Con mantenimiento" : undefined} peso="fuerte" />,
          // Sin precios cargados, nada: lo dice "Faltan precios"
          s.desde === undefined ? null : (
            <span key="p" className="font-semibold tabular-nums">
              {s.desde === null ? "Según evaluación" : `Desde ${mostrarMonto(s.desde)} Bs`}
            </span>
          ),
          cantidad(s.variantes, "variante", "variantes"),
          textoDias(s.duracionDias),
          // Solo lo que pide atención: lo que falta cargar; completo, no dice nada (pulido 7.1). Inactivo ya lo dice la píldora
          s.preciosFaltantes > 0 ? (
            <Insignia key="e" tono="aviso">
              {s.preciosFaltantes === 1 ? "Falta" : "Faltan"} {cantidad(s.preciosFaltantes, "precio", "precios")}
            </Insignia>
          ) : null,
        ],
      }))}
    />
    )}
    </>
  );
}
