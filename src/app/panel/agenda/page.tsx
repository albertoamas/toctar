import type { Metadata, Route } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { cn } from "cn";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "lucide-react";
import { BarraLista, ResumenLista } from "@/componentes/panel/barra-lista";
import { Buscador } from "@/componentes/panel/buscador";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { EstadoVacio } from "@/componentes/panel/estado-vacio";
import { ListaFilas } from "@/componentes/panel/fila-lista";
import { Insignia } from "@/componentes/panel/insignia";
import { PaginaPanel } from "@/componentes/panel/pagina-panel";
import { CeldaDoble, TablaLista, type ColumnaTabla } from "@/componentes/panel/tabla-lista";
import { cantidad } from "@/lib/cantidad";
import { buttonVariants } from "@/componentes/ui/button";
import { fechaEnBolivia, fechaExiste, sumarDias } from "@/lib/fechas";
import { puedeVerModulo } from "@/lib/permisos";
import { exigirModulo } from "@/lib/sesion";
import { AgendaDelDia, PestanasDias, SemanaEnLista, TableroSemana } from "@/modulos/agenda/componentes/tablero";
import { buscarReservas, resumenDeHoy, semanaDeAgenda, type ResumenDeHoy } from "@/modulos/agenda/consultas";
import { diasDeLaSemana, fechaCorta, lunesDeLaSemana, NOMBRE_ESTADO_TRABAJO, textoSemana, textoSemanaCorto, tituloDia, TONO_ESTADO_TRABAJO } from "@/modulos/agenda/reglas";
import { cotizacionesPorReservar, type FilaCotizacion } from "@/modulos/cotizaciones/consultas";
import { bs, diasDesde, textoDias } from "@/modulos/cotizaciones/reglas";
import { rutaTrabajo } from "@/modulos/ordenes/reglas";
import { aqui, conDesde } from "@/lib/volver";

export const metadata: Metadata = { title: "Agenda" };

// HU-29: el tablero de la agenda (RF-38). `?semana=` (cualquier día de la semana; se toma su lunes) y, en el celular,
// `?dia=` (el día que se ve). Dueño o encargado con "Agenda".
// Pulido 10.1: el tablero de la semana solo con espacio (desde 1280 px desde el 16/11). Lavado de cara (16/11,
// prototipo aprobado): un buscador de reservas de cualquier semana (?q=), lo de hoy en una línea, "Por reservar" plegado
// y, en la tableta, la semana como lista por día; en el celular, un día a la vez.
export default function PaginaAgenda({ searchParams }: PageProps<"/panel/agenda">) {
  return (
    <PaginaPanel tipo="lista">
      <EncabezadoPagina
        titulo="Agenda"
        accion={
          // Enlace con forma de botón: lleva a otra pantalla
          <Link href="/panel/agenda/nueva" className={cn(buttonVariants())}>
            <PlusIcon />
            Nueva reserva
          </Link>
        }
      />
      <Suspense fallback={<Cargando />}>
        <Tablero searchParams={searchParams} />
      </Suspense>
    </PaginaPanel>
  );
}

const enlaceSemana = (lunes: string, dia?: string) => `/panel/agenda?semana=${lunes}${dia ? `&dia=${dia}` : ""}` as Route;

async function Tablero({ searchParams }: Pick<PageProps<"/panel/agenda">, "searchParams">) {
  const usuario = await exigirModulo("agenda");
  const conOrdenes = puedeVerModulo(usuario, "ordenes");
  const parametros = await searchParams;
  const { semana: pedida, dia: diaPedido } = parametros;
  const q = typeof parametros.q === "string" ? parametros.q.trim() : "";
  // Pedido 43: lo que se abre desde la Agenda vuelve a esta semana y este día (o a esta búsqueda)
  const desdeAqui = aqui("/panel/agenda", parametros);
  const hoy = fechaEnBolivia();
  // Del 2000 al 2100: con años extremos las fechas dejan de tener cuatro cifras y la base las rechaza
  const valida = typeof pedida === "string" && fechaExiste(pedida) && pedida >= "2000-01-01" && pedida <= "2100-12-31";
  const lunes = lunesDeLaSemana(valida ? pedida : hoy);
  const dias = diasDeLaSemana(lunes);
  // En el celular: el día pedido si es de esta semana; si no, hoy (si cae en ella) o el lunes
  const dia = typeof diaPedido === "string" && dias.includes(diaPedido) ? diaPedido : dias.includes(hoy) ? hoy : lunes;
  const estaSemana = dias.includes(hoy);

  const barra = (
    <BarraLista
      buscador={<Buscador etiqueta="Buscar reservas por placa, cliente o teléfono" ejemplo="Placa o cliente" />}
      derecha={
        q ? undefined : (
          // Un renglón: la semana entre las flechas; en el celular, corta ("16 al 22 nov") para que entre
          <nav aria-label="Semanas" className="flex w-full items-center gap-2 sm:w-auto">
            <Link href={enlaceSemana(sumarDias(lunes, -7))} className={cn(buttonVariants({ variant: "outline", size: "icon" }), "shrink-0")} aria-label="Semana anterior">
              <ChevronLeftIcon />
            </Link>
            <p className="min-w-0 flex-1 text-center tt-titulo-seccion sm:min-w-56" aria-live="polite">
              <span className="sm:hidden">{textoSemanaCorto(lunes)}</span>
              <span className="hidden sm:inline">{textoSemana(lunes)}</span>
            </p>
            <Link href={enlaceSemana(sumarDias(lunes, 7))} className={cn(buttonVariants({ variant: "outline", size: "icon" }), "shrink-0")} aria-label="Semana siguiente">
              <ChevronRightIcon />
            </Link>
            {!estaSemana && (
              <Link href="/panel/agenda" className={cn(buttonVariants({ variant: "outline" }), "shrink-0")}>
                Hoy
              </Link>
            )}
          </nav>
        )
      }
    />
  );

  if (q) {
    return (
      <>
        {barra}
        <Resultados q={q} hoy={hoy} conOrdenes={conOrdenes} desde={desdeAqui} />
      </>
    );
  }

  const [semana, porReservar, resumen] = await Promise.all([semanaDeAgenda(lunes, dias[6]), cotizacionesPorReservar(), resumenDeHoy(hoy)]);
  const conMontos = puedeVerModulo(usuario, "pagos") || puedeVerModulo(usuario, "cotizaciones");
  const ahora = new Date();
  const fila = (c: FilaCotizacion) => ({
    href: conDesde(`/panel/agenda/nueva?cotizacion=${c.cotizacionId}`, desdeAqui),
    titulo: c.placa,
    tituloGrande: true,
    detalles: [c.cliente, c.servicios, ...(conMontos ? [bs(c.total)] : []), `Aceptada ${textoDias(diasDesde(c.ultimoMovimientoAt, ahora))}`].filter(Boolean),
  });

  return (
    <>
      {barra}
      <div className={cn("grid gap-3", porReservar.length > 0 && "lg:grid-cols-[minmax(0,1fr)_auto]")}>
        <ResumenHoy resumen={resumen} hoy={hoy} conOrdenes={conOrdenes} />
        {/* Pedido 31: las cotizaciones aceptadas que esperan fecha. Lavado de cara (16/11): plegadas en una fila, así el
            tablero, que es lo principal de la Agenda, no queda abajo de una lista larga; sin ninguna, no ocupa lugar */}
        {porReservar.length > 0 && (
          <details className="group lg:open:col-span-full">
            <summary className="tt-tarjeta-panel flex min-h-12 cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-superficie/50 [&::-webkit-details-marker]:hidden">
              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-aviso-fondo px-1.5 text-sm font-bold text-aviso">{porReservar.length}</span>
              <span className="flex-1 text-sm font-semibold">{porReservar.length === 1 ? "Cotización por reservar" : "Cotizaciones por reservar"}</span>
              <ChevronDownIcon className="size-4 shrink-0 text-tinta-suave group-open:rotate-180" aria-hidden />
            </summary>
            <div className="mt-2">
              <ListaFilas etiqueta="Por reservar" filas={porReservar.map(fila)} />
            </div>
          </details>
        )}
      </div>

      {semana.espacios.length === 0 ? (
        <p className="text-tinta-suave">No hay espacios activos. Agrégalos en Configuración, «Taller».</p>
      ) : (
        <>
          <TableroSemana semana={semana} dias={dias} hoy={hoy} conOrdenes={conOrdenes} desde={desdeAqui} />
          <SemanaEnLista semana={semana} dias={dias} hoy={hoy} conOrdenes={conOrdenes} desde={desdeAqui} />
          <PestanasDias semana={semana} dias={dias} hoy={hoy} dia={dia} enlace={(d) => enlaceSemana(lunes, d)} />
          <AgendaDelDia semana={semana} dia={dia} hoy={hoy} conOrdenes={conOrdenes} desde={desdeAqui} />
        </>
      )}
    </>
  );
}

/**
 * Lo de hoy en una línea: cuántas faltan recibir, cuántas están en el taller y cuántas para entregar. Con permiso de
 * Órdenes, las dos últimas llevan a su lista; "por recibir", al Inicio, que las lista con su espacio.
 */
function ResumenHoy({ resumen, hoy, conOrdenes }: { resumen: ResumenDeHoy; hoy: string; conOrdenes: boolean }) {
  const datos: { n: number; texto: string; href: Route | null }[] = [
    { n: resumen.porRecibir, texto: "por recibir", href: "/panel" },
    { n: resumen.enElTaller, texto: "en el taller", href: conOrdenes ? "/panel/ordenes" : null },
    { n: resumen.paraEntregar, texto: "para entregar", href: conOrdenes ? ("/panel/ordenes?estado=listo" as Route) : null },
  ];
  return (
    <section aria-labelledby="hoy-titulo" className="tt-tarjeta-panel flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-8">
      <h2 id="hoy-titulo" className="tt-titulo-sub">
        {tituloDia(hoy, hoy)}
      </h2>
      <ul className="grid grid-cols-3 gap-2 sm:flex sm:gap-8">
        {datos.map((d) => {
          const contenido = (
            <>
              <span className="text-xl font-bold tabular-nums">{d.n}</span>
              <span className="text-[0.8125rem] text-tinta-media sm:text-sm">{d.texto}</span>
            </>
          );
          const clase = "flex flex-col sm:flex-row sm:items-baseline sm:gap-2";
          return (
            <li key={d.texto}>
              {d.href && d.n > 0 ? (
                <Link href={d.href} className={cn(clase, "rounded-md hover:underline")}>
                  {contenido}
                </Link>
              ) : (
                <span className={clase}>{contenido}</span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const COLUMNAS_RESULTADOS: ColumnaTabla[] = [
  { titulo: "Vehículo", ancho: "minmax(0,1fr)", movil: "titulo" },
  { titulo: "Fecha", ancho: "minmax(0,1.2fr)", movil: "detalle" },
  { titulo: "Servicio", ancho: "minmax(0,1.3fr)", movil: "detalle" },
  { titulo: "Espacio", ancho: "6.5rem", movil: "detalle" },
  { titulo: "Estado", ancho: "7.5rem", movil: "estado" },
];

/** Las reservas que coinciden con la búsqueda, de cualquier semana: las que vienen primero y después las pasadas. */
async function Resultados({ q, hoy, conOrdenes, desde }: { q: string; hoy: string; conOrdenes: boolean; desde: string }) {
  const { reservas, hayMas } = await buscarReservas(q, hoy);
  if (reservas.length === 0) return <EstadoVacio>{`Ninguna reserva coincide con «${q}». Revisa la placa o el nombre.`}</EstadoVacio>;
  return (
    <>
      <ResumenLista>
        {cantidad(reservas.length, "reserva", "reservas")} con «{q}»{hayMas && ": se ven las primeras; escribe más para encontrar la que buscas"}
      </ResumenLista>
      <TablaLista
        etiqueta="Reservas encontradas"
        columnas={COLUMNAS_RESULTADOS}
        desde={desde}
        filas={reservas.map((r) => ({
          href: rutaTrabajo(r.id, r.estado, conOrdenes),
          celdas: [
            <CeldaDoble key="v" principal={r.placa} secundario={r.cliente} peso="placa" />,
            `${r.inicio === r.fin ? fechaCorta(r.inicio, hoy) : `${fechaCorta(r.inicio, hoy)} al ${fechaCorta(r.fin, hoy)}`}${r.hora ? `, ${r.hora}` : ""}`,
            r.servicio ? `${r.servicio}${r.masServicios > 0 ? ` y ${r.masServicios} más` : ""}` : null,
            r.espacio,
            <Insignia key="e" tono={TONO_ESTADO_TRABAJO[r.estado]}>
              {NOMBRE_ESTADO_TRABAJO[r.estado]}
            </Insignia>,
          ],
        }))}
      />
    </>
  );
}
