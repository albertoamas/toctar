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
import { Pestanas } from "@/componentes/panel/pestanas";
import { CeldaDoble, TablaLista, type ColumnaTabla, type FilaTabla } from "@/componentes/panel/tabla-lista";
import { buttonVariants } from "@/componentes/ui/button";
import { diaYHora, fechaEnBolivia } from "@/lib/fechas";
import { nombreEnMenu } from "@/lib/permisos";
import { exigirModulo } from "@/lib/sesion";
import { NOMBRE_ESTADO_TRABAJO, TONO_ESTADO_TRABAJO } from "@/modulos/agenda/reglas";
import { BuscadorClientes } from "@/modulos/clientes/componentes/buscador-clientes";
import { ordenesAbiertas, ordenesEntregadas, type OrdenEnLista, type OrdenEntregada } from "@/modulos/ordenes/consultas";
import { ENTREGADAS_POR_PAGINA, ESTADOS_ORDEN_ABIERTA, estadoFiltrado, estaAtrasada, textoEntrega } from "@/modulos/ordenes/reglas";

export const metadata: Metadata = { title: "Órdenes" };

// HU-33 y HU-34: las órdenes abiertas en una tabla (pedido 26), la entrega más cercana primero (así las atrasadas y las de
// hoy quedan arriba) y las listas al final; con filtros por estado (?estado=) que dicen cuántas hay en cada uno. Son
// pocas a la vez (las que caben en los espacios), así que se ven todas. Pedido 28: la pestaña "Entregadas", el
// historial, con búsqueda por placa, cliente o fecha y de a páginas. El técnico ve solo las suyas (RN-12, S-1), sin la
// columna del técnico; el dueño y el encargado con "Órdenes", todas.
export default function PaginaOrdenes({ searchParams }: PageProps<"/panel/ordenes">) {
  return (
    <section className="flex flex-col gap-5">
      <Suspense fallback={<Cargando />}>
        <Lista searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

const NOMBRE_FILTRO: Record<(typeof ESTADOS_ORDEN_ABIERTA)[number], string> = { recibido: "Recibidas", en_proceso: "En proceso", listo: "Listas" };

async function Lista({ searchParams }: Pick<PageProps<"/panel/ordenes">, "searchParams">) {
  const usuario = await exigirModulo("ordenes");
  const tecnico = usuario.rol === "tecnico";
  const parametros = await searchParams;
  const entregadas = parametros.vista === "entregadas";

  return (
    <>
      <EncabezadoPagina titulo={nombreEnMenu("ordenes", usuario.rol)} />
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
          <BuscadorClientes etiqueta="Buscar por placa, cliente o fecha de entrega" ejemplo="Placa, cliente o fecha (5/10)" />
          <Suspense fallback={<Cargando />}>
            <Entregadas tecnicoId={tecnico ? Number(usuario.id) : undefined} q={typeof parametros.q === "string" ? parametros.q : ""} pagina={Number(parametros.pagina)} conTecnico={!tecnico} />
          </Suspense>
        </>
      ) : (
        <EnElTaller tecnicoId={tecnico ? Number(usuario.id) : undefined} filtro={estadoFiltrado(parametros.estado)} />
      )}
    </>
  );
}

async function EnElTaller({ tecnicoId, filtro }: { tecnicoId?: number; filtro: (typeof ESTADOS_ORDEN_ABIERTA)[number] | null }) {
  const ordenes = await ordenesAbiertas(tecnicoId);
  const hoy = fechaEnBolivia();
  if (ordenes.length === 0) {
    return <EstadoVacio>{tecnicoId ? "No tienes órdenes asignadas." : "No hay órdenes abiertas. Se abren al recibir un vehículo desde la agenda."}</EstadoVacio>;
  }
  const visibles = filtro ? ordenes.filter((o) => o.estado === filtro) : ordenes;
  const conTecnico = tecnicoId === undefined;
  return (
    <>
      <Filtros
        etiqueta="Filtrar por estado"
        filtros={[
          { href: "/panel/ordenes", texto: "Todas", cuenta: ordenes.length, activo: filtro === null },
          ...ESTADOS_ORDEN_ABIERTA.map((e) => ({
            href: `/panel/ordenes?estado=${e}` as Route,
            texto: NOMBRE_FILTRO[e],
            cuenta: ordenes.filter((o) => o.estado === e).length,
            activo: filtro === e,
          })),
        ]}
      />
      {visibles.length === 0 ? (
        <EstadoVacio>Ninguna orden {NOMBRE_FILTRO[filtro!].toLowerCase()} ahora.</EstadoVacio>
      ) : (
        <TablaLista etiqueta="Órdenes en el taller" columnas={columnasTaller(conTecnico)} filas={visibles.map((o) => filaOrden(o, hoy, conTecnico))} />
      )}
    </>
  );
}

const columnasTaller = (conTecnico: boolean): ColumnaTabla[] => [
  { titulo: "Vehículo", ancho: "minmax(0,1.1fr)", movil: "titulo" },
  { titulo: "Cliente", movil: "detalle" },
  { titulo: "Servicio", ancho: "minmax(0,1.3fr)", movil: "detalle" },
  ...(conTecnico ? [{ titulo: "Técnico", ancho: "minmax(0,0.8fr)", movil: "oculta" } satisfies ColumnaTabla] : []),
  { titulo: "Estado", ancho: "minmax(0,1.1fr)", movil: "estado" },
  { titulo: "Entrega", ancho: "6.5rem", movil: "detalle" },
];

/** Una orden en la tabla: la placa y el vehículo, quién, qué, el estado con lo que pide atención y cuándo se entrega. */
function filaOrden(o: OrdenEnLista, hoy: string, conTecnico: boolean): FilaTabla {
  const atrasada = estaAtrasada(o, hoy);
  return {
    href: `/panel/ordenes/${o.id}`,
    celdas: [
      <CeldaDoble key="v" principal={o.placa} secundario={o.vehiculo} marcada />,
      o.cliente,
      o.servicios.join(", "),
      ...(conTecnico ? [o.tecnico ?? <span className="text-tinta-suave">Sin técnico</span>] : []),
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
async function Entregadas({ tecnicoId, q, pagina, conTecnico }: { tecnicoId?: number; q: string; pagina: number; conTecnico: boolean }) {
  // Una página rara (texto, 0, Infinity) es la primera; una después de la última, la última
  let pedida = Number.isSafeInteger(pagina) && pagina > 1 ? pagina : 1;
  let { ordenes, total } = await ordenesEntregadas({ tecnicoId, q, pagina: pedida });
  const paginas = Math.max(1, Math.ceil(total / ENTREGADAS_POR_PAGINA));
  if (pedida > paginas) {
    pedida = paginas;
    ({ ordenes, total } = await ordenesEntregadas({ tecnicoId, q, pagina: pedida }));
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
          <TablaLista etiqueta="Órdenes entregadas" columnas={columnasEntregadas(conTecnico)} filas={ordenes.map((o) => filaEntregada(o, conTecnico))} />
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

const columnasEntregadas = (conTecnico: boolean): ColumnaTabla[] => [
  { titulo: "Vehículo", ancho: "minmax(0,1.1fr)", movil: "titulo" },
  { titulo: "Cliente", movil: "detalle" },
  { titulo: "Servicio", ancho: "minmax(0,1.3fr)", movil: "detalle" },
  ...(conTecnico ? [{ titulo: "Técnico", ancho: "minmax(0,0.8fr)", movil: "oculta" } satisfies ColumnaTabla] : []),
  { titulo: "Entregada", ancho: "8.5rem", movil: "detalle" },
];

/** Una entregada: la placa y el vehículo, quién, qué se hizo y cuándo se entregó. */
function filaEntregada(o: OrdenEntregada, conTecnico: boolean): FilaTabla {
  return {
    href: `/panel/ordenes/${o.id}`,
    celdas: [
      <CeldaDoble key="v" principal={o.placa} secundario={o.vehiculo} marcada />,
      o.cliente,
      o.servicios.join(", "),
      ...(conTecnico ? [o.tecnico ?? <span className="text-tinta-suave">Sin técnico</span>] : []),
      <span key="f">
        <span className="@2xl:hidden">Entregada el </span>
        {diaYHora(o.entregadoAt)}
      </span>,
    ],
  };
}
