import type { Metadata, Route } from "next";
import { TextoAccion } from "@/componentes/panel/texto-accion";
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
import { EnElTaller, ListaDesdeHoy, SemanaEnColumnas } from "@/modulos/agenda/componentes/tablero";
import { buscarReservas, datosAgenda } from "@/modulos/agenda/consultas/tablero";
import { diasDeLaSemana, fechaCorta, lunesDeLaSemana, NOMBRE_ESTADO_TRABAJO, textoSemana, textoServicio, TONO_ESTADO_TRABAJO } from "@/modulos/agenda/reglas";
import { cotizacionesPorReservar, type FilaCotizacion } from "@/modulos/cotizaciones/consultas/lista";
import { bs, diasDesde, textoDias } from "@/modulos/cotizaciones/reglas";
import { rutaTrabajo } from "@/modulos/ordenes/reglas";
import { aqui, conDesde } from "@/lib/volver";

export const metadata: Metadata = { title: "Agenda" };

// HU-29: la agenda (RF-38), el calendario de citas: las reservas por recibir (pedido 55, 20/11; lo que está en el taller,
// en Órdenes). `?semana=` (cualquier día de la semana; se toma su lunes) en la computadora y `?hasta=` (hasta qué día
// llega la lista desde hoy) en la tableta y el celular. Dueño o encargado con "Agenda".
// Pulido 10.1: el tablero de la semana solo con espacio (desde 1280 px desde el 16/11). Lavado de cara (16/11,
// prototipo aprobado): un buscador de reservas de cualquier semana (?q=), "Por reservar" plegado
// y, en la tableta, la semana como lista por día. Rehecha el 20/11 (pedido 55): columnas en la computadora y lista desde hoy
// en la tableta y el celular (componentes/tablero.tsx).
export default function PaginaAgenda({ searchParams }: PageProps<"/panel/agenda">) {
  return (
    <PaginaPanel tipo="lista">
      <EncabezadoPagina
        titulo="Agenda"
        accion={
          // Enlace con forma de botón: lleva a otra pantalla
          <Link href="/panel/agenda/nueva" className={cn(buttonVariants())}>
            <PlusIcon />
            <TextoAccion corto="Nueva">Nueva reserva</TextoAccion>
          </Link>
        }
      />
      <Suspense fallback={<Cargando />}>
        <Tablero searchParams={searchParams} />
      </Suspense>
    </PaginaPanel>
  );
}

const enlaceSemana = (lunes: string) => `/panel/agenda?semana=${lunes}` as Route;
/** Cuántos días muestra la lista desde hoy, y cuántos suma "Ver más días". */
const DIAS_LISTA = 28;

async function Tablero({ searchParams }: Pick<PageProps<"/panel/agenda">, "searchParams">) {
  const usuario = await exigirModulo("agenda");
  const conOrdenes = puedeVerModulo(usuario, "ordenes");
  const parametros = await searchParams;
  const { semana: pedida, hasta: hastaPedido } = parametros;
  const q = typeof parametros.q === "string" ? parametros.q.trim() : "";
  // Pedido 43: lo que se abre desde la Agenda vuelve a esta semana y este día (o a esta búsqueda)
  const desdeAqui = aqui("/panel/agenda", parametros);
  const hoy = fechaEnBolivia();
  // Del 2000 al 2100: con años extremos las fechas dejan de tener cuatro cifras y la base las rechaza
  const valida = typeof pedida === "string" && fechaExiste(pedida) && pedida >= "2000-01-01" && pedida <= "2100-12-31";
  const lunes = lunesDeLaSemana(valida ? pedida : hoy);
  const dias = diasDeLaSemana(lunes);
  const estaSemana = dias.includes(hoy);
  // La lista del celular: desde hoy hasta el día pedido (con "Ver más días") o cuatro semanas, y no más de un año
  const hasta =
    typeof hastaPedido === "string" && fechaExiste(hastaPedido) && hastaPedido > hoy && hastaPedido <= sumarDias(hoy, 366) ? hastaPedido : sumarDias(hoy, DIAS_LISTA - 1);

  const barra = (
    <BarraLista
      buscador={<Buscador etiqueta="Buscar reservas por placa, cliente o teléfono" ejemplo="Placa o cliente" />}
      derecha={
        q ? undefined : (
          // Solo en la computadora: en la tableta y el celular, la lista empieza hoy y sigue con "Ver más días"
          <nav aria-label="Semanas" className="hidden items-center gap-2 xl:flex">
            <Link href={enlaceSemana(sumarDias(lunes, -7))} className={cn(buttonVariants({ variant: "outline", size: "icon" }), "shrink-0")} aria-label="Semana anterior">
              <ChevronLeftIcon />
            </Link>
            <p className="min-w-56 flex-1 text-center tt-titulo-seccion" aria-live="polite">
              {textoSemana(lunes)}
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

  const conMontos = puedeVerModulo(usuario, "pagos") || puedeVerModulo(usuario, "cotizaciones");
  return (
    <>
      {/* Fuera de lo que se recarga: al buscar, el campo no se vuelve a montar y no pierde el foco (como en Órdenes) */}
      {barra}
      <Suspense fallback={<Cargando />}>
        {q ? (
          <Resultados q={q} hoy={hoy} conOrdenes={conOrdenes} desde={desdeAqui} />
        ) : (
          <Semana lunes={lunes} dias={dias} hoy={hoy} hasta={hasta} conOrdenes={conOrdenes} conMontos={conMontos} desde={desdeAqui} />
        )}
      </Suspense>
    </>
  );
}

/** Lo que está en el taller, "Por reservar" y las reservas en sus dos vistas (computadora; tableta y celular). */
async function Semana(props: { lunes: string; dias: string[]; hoy: string; hasta: string; conOrdenes: boolean; conMontos: boolean; desde: string }) {
  const { lunes, dias, hoy, hasta, conOrdenes, conMontos, desde: desdeAqui } = props;
  // Una sola consulta para las dos vistas: la semana de la computadora y la lista desde hoy
  const desdeDia = lunes < hoy ? lunes : hoy;
  const hastaDia = dias[6] > hasta ? dias[6] : hasta;
  const [datos, porReservar] = await Promise.all([datosAgenda(desdeDia, hastaDia), cotizacionesPorReservar()]);
  const ahora = new Date();
  const fila = (c: FilaCotizacion) => ({
    href: conDesde(`/panel/agenda/nueva?cotizacion=${c.cotizacionId}`, desdeAqui),
    // La de un interesado (P31b), sin placa todavía: su nombre
    titulo: c.placa ?? c.cliente,
    tituloGrande: true,
    // Lo que hace la fila, escrito (C7, 18/11): toda la fila sigue llevando a Nueva reserva
    accion: "Reservar",
    detalles: [c.interesado ? `${c.cliente}, sin registrar` : c.cliente, c.servicios, ...(conMontos ? [bs(c.total)] : []), `Aceptada ${textoDias(diasDesde(c.ultimoMovimientoAt, ahora))}`].filter(Boolean),
  });

  return (
    <>
      {/* Pedido 31: las cotizaciones aceptadas que esperan fecha. Lavado de cara (16/11): plegadas en una fila, así el
          tablero, que es lo principal de la Agenda, no queda abajo de una lista larga; sin ninguna, no ocupa lugar */}
      {/* Lo que ya está en el taller se trabaja en Órdenes: aquí, una línea que lleva allá (pedido 55) */}
      <EnElTaller datos={datos} conOrdenes={conOrdenes} />
      {porReservar.length > 0 && (
        <details className="group">
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

      <SemanaEnColumnas datos={datos} dias={dias} hoy={hoy} conOrdenes={conOrdenes} desde={desdeAqui} />
      <ListaDesdeHoy datos={datos} hoy={hoy} hasta={hasta} conOrdenes={conOrdenes} desde={desdeAqui} verMas={`/panel/agenda?hasta=${sumarDias(hasta, DIAS_LISTA)}` as Route} />
    </>
  );
}

const COLUMNAS_RESULTADOS: ColumnaTabla[] = [
  { titulo: "Vehículo", ancho: "minmax(0,1fr)", movil: "titulo" },
  { titulo: "Fecha", ancho: "minmax(0,1.2fr)", movil: "detalle" },
  { titulo: "Servicio", ancho: "minmax(0,1.3fr)", movil: "detalle" },
  { titulo: "Estado", ancho: "7.5rem", movil: "estado" },
];

/** Las reservas que coinciden con la búsqueda, de cualquier semana: las que vienen primero y después las pasadas. */
async function Resultados({ q, hoy, conOrdenes, desde }: { q: string; hoy: string; conOrdenes: boolean; desde: string }) {
  const { reservas, hayMas } = await buscarReservas(q);
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
            `${r.inicio === r.fin ? fechaCorta(r.inicio, hoy) : `${fechaCorta(r.inicio, hoy)} al ${fechaCorta(r.fin, hoy)}`}`,
            textoServicio(r),
            <Insignia key="e" tono={TONO_ESTADO_TRABAJO[r.estado]}>
              {NOMBRE_ESTADO_TRABAJO[r.estado]}
            </Insignia>,
          ],
        }))}
      />
    </>
  );
}
