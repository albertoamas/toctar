import type { Metadata, Route } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { cn } from "cn";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { EstadoVacio } from "@/componentes/panel/estado-vacio";
import { ListaFilas, type DatosFila } from "@/componentes/panel/fila-lista";
import { Pestanas } from "@/componentes/panel/pestanas";
import { buttonVariants } from "@/componentes/ui/button";
import { diaYHora, fechaEnBolivia, formatearFecha } from "@/lib/fechas";
import { nombreEnMenu } from "@/lib/permisos";
import { exigirModulo } from "@/lib/sesion";
import { BuscadorClientes } from "@/modulos/clientes/componentes/buscador-clientes";
import { ordenesAbiertas, ordenesEntregadas, type OrdenEnLista, type OrdenEntregada } from "@/modulos/ordenes/consultas";
import { ENTREGADAS_POR_PAGINA, ESTADOS_ORDEN_ABIERTA, estaAtrasada } from "@/modulos/ordenes/reglas";

export const metadata: Metadata = { title: "Órdenes" };

// HU-33 y HU-34: las órdenes abiertas, agrupadas en el orden del taller (recibidas, en proceso, listas) y en cada grupo la
// entrega más cercana primero: así las atrasadas y las de hoy quedan arriba. Son pocas a la vez (las que caben en los
// espacios), así que se ven todas; en la computadora, una columna por estado (pulido 11.1). Pedido 28: la pestaña
// "Entregadas", el historial, con búsqueda por placa, cliente o fecha y de a páginas. El técnico ve solo las suyas
// (RN-12, S-1); el dueño y el encargado con "Órdenes", todas.
export default function PaginaOrdenes({ searchParams }: PageProps<"/panel/ordenes">) {
  return (
    <section className="flex flex-col gap-6">
      <Suspense fallback={<Cargando />}>
        <Lista searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

const GRUPOS: Record<(typeof ESTADOS_ORDEN_ABIERTA)[number], string> = { recibido: "Recibidas", en_proceso: "En proceso", listo: "Listas" };

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
            <Entregadas tecnicoId={tecnico ? Number(usuario.id) : undefined} q={typeof parametros.q === "string" ? parametros.q : ""} pagina={Number(parametros.pagina) || 1} conTecnico={!tecnico} />
          </Suspense>
        </>
      ) : (
        <EnElTaller tecnicoId={tecnico ? Number(usuario.id) : undefined} />
      )}
    </>
  );
}

async function EnElTaller({ tecnicoId }: { tecnicoId?: number }) {
  const ordenes = await ordenesAbiertas(tecnicoId);
  const hoy = fechaEnBolivia();
  if (ordenes.length === 0) {
    return <EstadoVacio>{tecnicoId ? "No tienes órdenes asignadas." : "No hay órdenes abiertas. Se abren al recibir un vehículo desde la agenda."}</EstadoVacio>;
  }
  return (
    <div className="grid gap-8 lg:grid-cols-3 lg:gap-6">
      {ESTADOS_ORDEN_ABIERTA.map((estado) => {
        const delGrupo = ordenes.filter((o) => o.estado === estado);
        return (
          // El lector oye la sección como "Recibidas, 2 órdenes"; a la vista, "Recibidas (2)"
          <section key={estado} aria-label={`${GRUPOS[estado]}, ${delGrupo.length === 1 ? "1 orden" : `${delGrupo.length} órdenes`}`} className="flex flex-col gap-3">
            <h2 className="font-heading text-2xl font-bold italic">
              {GRUPOS[estado]} <span className="tabular-nums text-tinta-suave">({delGrupo.length})</span>
            </h2>
            {delGrupo.length === 0 ? (
              <p className="text-tinta-suave">Ninguna.</p>
            ) : (
              <ListaFilas etiqueta={`Órdenes ${GRUPOS[estado].toLowerCase()}`} filas={delGrupo.map((o) => filaOrden(o, hoy, tecnicoId === undefined))} />
            )}
          </section>
        );
      })}
    </div>
  );
}

/** El historial (pedido 28): la más reciente primero, con su búsqueda y de a páginas. */
async function Entregadas({ tecnicoId, q, pagina, conTecnico }: { tecnicoId?: number; q: string; pagina: number; conTecnico: boolean }) {
  const pedida = Math.max(1, Math.floor(pagina));
  const { ordenes, total } = await ordenesEntregadas({ tecnicoId, q, pagina: pedida });
  const paginas = Math.max(1, Math.ceil(total / ENTREGADAS_POR_PAGINA));
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
          <ListaFilas etiqueta="Órdenes entregadas" filas={ordenes.map((o) => filaEntregada(o, conTecnico))} />
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

/** Una orden en la lista: la placa, lo que pide atención, cuándo se entrega y, en tinta suave, qué se hace y para quién. */
function filaOrden(o: OrdenEnLista, hoy: string, conTecnico: boolean): DatosFila {
  return {
    href: `/panel/ordenes/${o.id}`,
    titulo: o.placa,
    tituloGrande: true,
    aviso: estaAtrasada(o, hoy) ? "Atrasada" : o.sinAvisar ? "Sin avisar" : null,
    dato: o.fechaFin === hoy ? "Entrega hoy" : `Entrega aproximada: ${formatearFecha(o.fechaFin)}`,
    detalles: [o.servicios.join(", "), conTecnico ? `${o.cliente}, ${o.tecnico ?? "sin técnico"}` : o.cliente],
  };
}

/** Una entregada: la placa, cuándo se entregó y, en tinta suave, qué se hizo y para quién. */
function filaEntregada(o: OrdenEntregada, conTecnico: boolean): DatosFila {
  return {
    href: `/panel/ordenes/${o.id}`,
    titulo: o.placa,
    tituloGrande: true,
    dato: `Entregada el ${diaYHora(o.entregadoAt)}`,
    detalles: [o.servicios.join(", "), conTecnico ? `${o.cliente}, ${o.tecnico ?? "sin técnico"}` : o.cliente],
    estado: "Entregada",
    tonoEstado: "exito",
  };
}
