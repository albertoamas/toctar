import type { Metadata, Route } from "next";
import { Suspense } from "react";
import { cn } from "cn";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { EstadoVacio } from "@/componentes/panel/estado-vacio";
import { Filtros } from "@/componentes/panel/filtros";
import { Insignia } from "@/componentes/panel/insignia";
import { PaginaPanel } from "@/componentes/panel/pagina-panel";
import { Paginacion } from "@/componentes/panel/paginacion";
import { ajustarPagina, conPagina, leerPagina } from "@/lib/paginacion";
import { Pestanas } from "@/componentes/panel/pestanas";
import { CeldaDoble, TablaLista, type ColumnaTabla, type FilaTabla } from "@/componentes/panel/tabla-lista";
import { diaYHora, fechaEnBolivia } from "@/lib/fechas";
import { exigirModulo } from "@/lib/sesion";
import { NOMBRE_ESTADO_TRABAJO, TONO_ESTADO_TRABAJO } from "@/modulos/agenda/reglas";
import { Buscador } from "@/componentes/panel/buscador";
import { ordenesAbiertas, ordenesEntregadas, type OrdenEnLista, type OrdenEntregada } from "@/modulos/ordenes/consultas";
import { ESTADOS_ORDEN_ABIERTA, estaAtrasada, estadoFiltrado, filtrarOrdenes, textoEntrega } from "@/modulos/ordenes/reglas";
import { BarraLista } from "@/componentes/panel/barra-lista";
import { normalizarBusqueda } from "@/modulos/clientes/reglas";
import { aqui } from "@/lib/volver";

export const metadata: Metadata = { title: "Órdenes" };

// HU-33 y HU-34: las órdenes abiertas en una tabla (pedido 26), la entrega más cercana primero (así las atrasadas y las de
// hoy quedan arriba) y las listas al final; con filtros por estado (?estado=) que dicen cuántas hay en cada uno. Son
// pocas a la vez (las que caben en los espacios), así que se ven todas. Pedido 28: la pestaña "Entregadas", el
// historial, con búsqueda por placa, cliente o fecha y de a páginas. Pedido 32: sin técnico asignado, todos los que
// tienen "Órdenes" las ven todas.
export default function PaginaOrdenes({ searchParams }: PageProps<"/panel/ordenes">) {
  return (
    <PaginaPanel tipo="lista">
      <Suspense fallback={<Cargando />}>
        <Lista searchParams={searchParams} />
      </Suspense>
    </PaginaPanel>
  );
}

const NOMBRE_FILTRO: Record<(typeof ESTADOS_ORDEN_ABIERTA)[number], string> = { recibido: "Recibidas", en_proceso: "En proceso", listo: "Listas" };

async function Lista({ searchParams }: Pick<PageProps<"/panel/ordenes">, "searchParams">) {
  await exigirModulo("ordenes");
  const parametros = await searchParams;
  const entregadas = parametros.vista === "entregadas";

  return (
    <>
      <EncabezadoPagina titulo="Órdenes" />
      <Pestanas
        etiqueta="Órdenes"
        activa={entregadas ? "/panel/ordenes?vista=entregadas" : "/panel/ordenes"}
        pestanas={[
          { href: "/panel/ordenes", texto: "En el taller" },
          { href: "/panel/ordenes?vista=entregadas", texto: "Entregadas" },
        ]}
      />
      {entregadas ? (
        <>
          {/* Fuera de la lista: al buscar, el campo no se vuelve a montar y no pierde el foco */}
          <BarraLista buscador={<Buscador etiqueta="Buscar por placa, cliente o fecha de entrega" ejemplo="Placa, cliente o fecha (5/10)" />} />
          <Suspense fallback={<Cargando />}>
            <Entregadas q={typeof parametros.q === "string" ? parametros.q : ""} pagina={leerPagina(parametros.pagina)} desde={aqui("/panel/ordenes", parametros)} />
          </Suspense>
        </>
      ) : (
        <EnElTaller filtro={estadoFiltrado(parametros.estado)} q={typeof parametros.q === "string" ? parametros.q : ""} desde={aqui("/panel/ordenes", parametros)} />
      )}
    </>
  );
}

async function EnElTaller({ filtro, q, desde }: { filtro: (typeof ESTADOS_ORDEN_ABIERTA)[number] | null; q: string; /** Esta lista, para "Volver" (pedido 43). */ desde: string }) {
  const todas = await ordenesAbiertas();
  const hoy = fechaEnBolivia();
  if (todas.length === 0) {
    return <EstadoVacio>No hay órdenes abiertas. Se abren al recibir un vehículo desde la agenda.</EstadoVacio>;
  }
  // También se busca en el taller (antes, solo en "Entregadas"), por placa, cliente o vehículo; los filtros cuentan lo buscado
  const busqueda = normalizarBusqueda(q);
  const ordenes = filtrarOrdenes(todas, busqueda);
  const visibles = filtro ? ordenes.filter((o) => o.estado === filtro) : ordenes;
  const conBusqueda = (estado?: string) => {
    const p = new URLSearchParams();
    if (estado) p.set("estado", estado);
    if (q.trim()) p.set("q", q);
    const consulta = p.toString();
    return (consulta ? `/panel/ordenes?${consulta}` : "/panel/ordenes") as Route;
  };
  return (
    <>
      <BarraLista
        buscador={<Buscador etiqueta="Buscar por placa, cliente o vehículo" ejemplo="Placa o cliente" />}
        filtros={
          <Filtros
            etiqueta="Filtrar por estado"
            filtros={[
              { href: conBusqueda(), texto: "Todas", cuenta: ordenes.length, activo: filtro === null },
              ...ESTADOS_ORDEN_ABIERTA.map((e) => ({ href: conBusqueda(e), texto: NOMBRE_FILTRO[e], cuenta: ordenes.filter((o) => o.estado === e).length, activo: filtro === e })),
            ]}
          />
        }
      />
      {visibles.length === 0 ? (
        <EstadoVacio>
          {busqueda
            ? `Ninguna orden ${filtro ? NOMBRE_FILTRO[filtro].toLowerCase() : "en el taller"} coincide con «${q.trim()}».`
            : `Ninguna orden ${NOMBRE_FILTRO[filtro!].toLowerCase()} ahora.`}
        </EstadoVacio>
      ) : (
        <TablaLista etiqueta="Órdenes en el taller" columnas={COLUMNAS_TALLER} filas={visibles.map((o) => filaOrden(o, hoy))} desde={desde} />
      )}
    </>
  );
}

const COLUMNAS_TALLER: ColumnaTabla[] = [
  { titulo: "Vehículo", ancho: "minmax(0,1.1fr)", movil: "titulo" },
  { titulo: "Cliente", movil: "detalle" },
  { titulo: "Servicio", ancho: "minmax(0,1.3fr)", movil: "detalle" },
  { titulo: "Estado", ancho: "minmax(0,1.1fr)", movil: "estado" },
  { titulo: "Entrega", ancho: "6.5rem", movil: "detalle" },
];

/** Una orden en la tabla: la placa y el vehículo, quién, qué, el estado con lo que pide atención y cuándo se entrega. */
function filaOrden(o: OrdenEnLista, hoy: string): FilaTabla {
  const atrasada = estaAtrasada(o, hoy);
  return {
    href: `/panel/ordenes/${o.id}`,
    celdas: [
      <CeldaDoble key="v" principal={o.placa} secundario={o.vehiculo} peso="placa" />,
      o.cliente,
      o.servicios.join(", "),
      <span key="e" className="flex flex-wrap justify-end gap-1.5 @2xl:justify-start">
        <Insignia tono={TONO_ESTADO_TRABAJO[o.estado]}>{NOMBRE_ESTADO_TRABAJO[o.estado]}</Insignia>
        {atrasada && <Insignia tono="aviso">Atrasada</Insignia>}
        {o.sinAvisar && <Insignia tono="aviso">Sin avisar</Insignia>}
      </span>,
      <span key="f" className={cn(atrasada && "font-semibold text-aviso")}>
        <span className="@2xl:hidden">Entrega: </span>
        {textoEntrega(o.fechaFin, hoy)}
      </span>,
    ],
  };
}

/** El historial (pedido 28): la más reciente primero, con su búsqueda y de a páginas. */
async function Entregadas({ q, pagina: pedida, desde }: { q: string; pagina: number; /** Esta lista, para "Volver" (pedido 43). */ desde: string }) {
  let { ordenes, total } = await ordenesEntregadas({ q, pagina: pedida });
  // Una página después de la última es la última (17/11: con la paginación común de las listas, de a 25)
  const { pagina, paginas } = ajustarPagina(pedida, total);
  if (pagina !== pedida) ({ ordenes, total } = await ordenesEntregadas({ q, pagina }));
  const enlace = (p: number) => conPagina("/panel/ordenes", q.trim() ? { vista: "entregadas", q } : { vista: "entregadas" }, p);
  return (
    <>
      {ordenes.length === 0 ? (
        <EstadoVacio>{q.trim() ? `Ninguna entregada coincide con «${q.trim()}».` : "Todavía no se entregó ninguna orden."}</EstadoVacio>
      ) : (
        <>
          <TablaLista etiqueta="Órdenes entregadas" columnas={COLUMNAS_ENTREGADAS} filas={ordenes.map(filaEntregada)} desde={desde} />
          <Paginacion pagina={pagina} paginas={paginas} total={total} nombre={["orden entregada", "órdenes entregadas"]} enlace={enlace} />
        </>
      )}
    </>
  );
}

const COLUMNAS_ENTREGADAS: ColumnaTabla[] = [
  { titulo: "Vehículo", ancho: "minmax(0,1.1fr)", movil: "titulo" },
  { titulo: "Cliente", movil: "detalle" },
  { titulo: "Servicio", ancho: "minmax(0,1.3fr)", movil: "detalle" },
  { titulo: "Entregada", ancho: "8.5rem", movil: "detalle" },
];

/** Una entregada: la placa y el vehículo, quién, qué se hizo y cuándo se entregó. */
function filaEntregada(o: OrdenEntregada): FilaTabla {
  return {
    href: `/panel/ordenes/${o.id}`,
    celdas: [
      <CeldaDoble key="v" principal={o.placa} secundario={o.vehiculo} peso="placa" />,
      o.cliente,
      o.servicios.join(", "),
      <span key="f">
        <span className="@2xl:hidden">Entregada el </span>
        {diaYHora(o.entregadoAt)}
      </span>,
    ],
  };
}
