import type { Metadata, Route } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { cn } from "cn";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { EstadoVacio } from "@/componentes/panel/estado-vacio";
import { Filtros } from "@/componentes/panel/filtros";
import { Insignia } from "@/componentes/panel/insignia";
import { PaginaPanel } from "@/componentes/panel/pagina-panel";
import { Pestanas } from "@/componentes/panel/pestanas";
import { CeldaDoble, TablaLista, type ColumnaTabla, type FilaTabla } from "@/componentes/panel/tabla-lista";
import { buttonVariants } from "@/componentes/ui/button";
import { diaYHora, fechaEnBolivia } from "@/lib/fechas";
import { exigirModulo } from "@/lib/sesion";
import { NOMBRE_ESTADO_TRABAJO, TONO_ESTADO_TRABAJO } from "@/modulos/agenda/reglas";
import { Buscador } from "@/componentes/panel/buscador";
import { ordenesAbiertas, ordenesEntregadas, type OrdenEnLista, type OrdenEntregada } from "@/modulos/ordenes/consultas";
import { ENTREGADAS_POR_PAGINA, ESTADOS_ORDEN_ABIERTA, estaAtrasada, estadoFiltrado, filtrarOrdenes, textoEntrega } from "@/modulos/ordenes/reglas";
import { BarraLista } from "@/componentes/panel/barra-lista";
import { normalizarBusqueda } from "@/modulos/clientes/reglas";

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
            <Entregadas q={typeof parametros.q === "string" ? parametros.q : ""} pagina={Number(parametros.pagina)} />
          </Suspense>
        </>
      ) : (
        <EnElTaller filtro={estadoFiltrado(parametros.estado)} q={typeof parametros.q === "string" ? parametros.q : ""} />
      )}
    </>
  );
}

async function EnElTaller({ filtro, q }: { filtro: (typeof ESTADOS_ORDEN_ABIERTA)[number] | null; q: string }) {
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
        <TablaLista etiqueta="Órdenes en el taller" columnas={COLUMNAS_TALLER} filas={visibles.map((o) => filaOrden(o, hoy))} />
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
async function Entregadas({ q, pagina }: { q: string; pagina: number }) {
  // Una página rara (texto, 0, Infinity) es la primera; una después de la última, la última
  let pedida = Number.isSafeInteger(pagina) && pagina > 1 ? pagina : 1;
  let { ordenes, total } = await ordenesEntregadas({ q, pagina: pedida });
  const paginas = Math.max(1, Math.ceil(total / ENTREGADAS_POR_PAGINA));
  if (pedida > paginas) {
    pedida = paginas;
    ({ ordenes, total } = await ordenesEntregadas({ q, pagina: pedida }));
  }
  const enlace = (p: number) => {
    const datos = new URLSearchParams({ vista: "entregadas" });
    if (q.trim()) datos.set("q", q);
    if (p > 1) datos.set("pagina", String(p));
    return `/panel/ordenes?${datos.toString()}` as Route;
  };
  return (
    <>
      {ordenes.length === 0 ? (
        <EstadoVacio>{q.trim() ? `Ninguna entregada coincide con «${q.trim()}».` : "Todavía no se entregó ninguna orden."}</EstadoVacio>
      ) : (
        <>
          <TablaLista etiqueta="Órdenes entregadas" columnas={COLUMNAS_ENTREGADAS} filas={ordenes.map(filaEntregada)} />
          {paginas > 1 && (
            <nav aria-label="Páginas" className="flex flex-wrap items-center gap-3">
              {pedida > 1 && (
                <Link href={enlace(pedida - 1)} className={cn(buttonVariants({ variant: "outline" }))}>
                  <ChevronLeftIcon />
                  Más recientes
                </Link>
              )}
              <span className="text-sm text-tinta-suave tabular-nums">
                Página {pedida} de {paginas}
              </span>
              {pedida < paginas && (
                <Link href={enlace(pedida + 1)} className={cn(buttonVariants({ variant: "outline" }))}>
                  Anteriores
                  <ChevronRightIcon />
                </Link>
              )}
            </nav>
          )}
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
