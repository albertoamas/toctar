import type { Route } from "next";
import Link from "next/link";
import { cn } from "cn";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "lucide-react";
import type { ReservaTablero, SemanaDeAgenda } from "../consultas/tablero";
import { CabeceraSeccion } from "@/componentes/panel/cabecera-seccion";
import { MarcaEstado } from "@/componentes/panel/marca-estado";
import { cantidad } from "@/lib/cantidad";
import { rutaTrabajo } from "@/modulos/ordenes/reglas";
import {
  bloquesDeLaSemana,
  DIA_CORTO,
  diaDeLaSemana,
  diaEnFrase,
  NOMBRE_ESTADO_TRABAJO,
  numeroDia,
  ocupaLugar,
  seCruzan,
  textoDia,
  textoServicio,
  tituloDia,
  TONO_ESTADO_TRABAJO,
} from "../reglas";
import { conDesde } from "@/lib/volver";

// HU-29: el tablero de la agenda (RF-38), por día y sin horas (S-3). Lavado de cara del 16/11 (prototipo aprobado):
// Pedido 55: sin espacios. El taller tiene N lugares y cada día dice cuántos están ocupados ("2 de 3 lugares", "Lleno" o,
// si una extensión lo pasó, "4 de 3" en rojo). Las filas de la grilla son lugares a la vista, sin nombre: cada reserva va
// en una donde no se encime (filasDelTablero).
// - Computadora (desde 1280 px; en una laptop de 1024, con el menú, cada día medía 80 px y no se leía): la semana en una grilla. Los días libres llevan su
//   "+ Reservar" en gris, siempre a la vista (desde el 19/11; antes solo al pasar el mouse), hoy se marca en su encabezado y un día cerrado, una sola vez.
//   Cada reserva dice placa, cliente, servicio y estado (con palabra, no solo color).
// - Tableta y laptop chica (768 a 1279 px): la semana como lista por día ("Hoy", "Mañana", "Miércoles 18"), sin tocar
//   pestañas. Recorrido visual del 19/11: empieza en hoy (los días anteriores, plegados) y una reserva de varios días va
//   una sola vez, el día que empieza; los días siguientes la nombran en una línea ("Siguen en el taller").
// Los estados, con un punto y su palabra, sin píldora (MarcaEstado, como en el inicio). Sin la guía de colores (19/11):
// cada reserva ya dice su estado escrito.
// - Celular: la tira de los siete días (un punto en los que tienen reservas), fija arriba, y el día elegido en una
//   tarjeta, con los lugares que quedan en una fila.
// Todo es texto y enlaces: se lee igual con lector de pantalla.

type Props = {
  semana: SemanaDeAgenda;
  dias: string[];
  hoy: string;
  /** Quien mira ve las órdenes: una reserva ya recibida lleva directo a su orden (C4). */
  conOrdenes: boolean;
  /** La Agenda con su semana y día: lo que se abre desde aquí vuelve ahí (pedido 43). */
  desde: string;
};

const agendarEn = (fecha: string, desde: string) => conDesde(`/panel/agenda/nueva?fecha=${fecha}` as Route, desde);

function textoFechas(r: Pick<ReservaTablero, "inicio" | "fin">) {
  return r.inicio === r.fin ? textoDia(r.inicio) : `${textoDia(r.inicio)} al ${textoDia(r.fin)}`;
}

/** El día cerrado: rayas a 60° (el único ángulo de la marca), igual en las tres vistas. */
const RAYAS_CERRADO: React.CSSProperties = { backgroundImage: "repeating-linear-gradient(60deg, var(--neutro-fondo) 0 6px, var(--fondo-panel) 6px 12px)" };

/**
 * Las reservas que se ven en un día (también una entregada, como historia, pedido 28): primero las que ocupan, en el
 * orden de sus filas. Las mismas que cuentan la cabecera y la pestaña de ese día, así nunca dice "Sin reservas" arriba
 * de un vehículo.
 */
const delDia = (semana: SemanaDeAgenda, dia: string) =>
  semana.reservas
    .filter((r) => seCruzan(r, { inicio: dia, fin: dia }))
    .sort((a, b) => Number(ocupaLugar(b.estado)) - Number(ocupaLugar(a.estado)) || a.fila - b.fila);

/** Cuántos lugares quedan un día: ninguno si ya pasó, si el taller cierra o si está lleno. */
function quedan(semana: SemanaDeAgenda, dia: string, hoy: string): number {
  if (dia < hoy || semana.diasCerrados.includes(diaDeLaSemana(dia))) return 0;
  return Math.max(0, semana.lugares - (semana.ocupados[dia] ?? 0));
}

/** "2 de 3 lugares", "Lleno" o, con más autos que lugares (una extensión), "4 de 3 lugares" en rojo. */
function Ocupacion({ semana, dia, className }: { semana: SemanaDeAgenda; dia: string; className?: string }) {
  const ocupados = semana.ocupados[dia] ?? 0;
  if (ocupados > semana.lugares) return <span className={cn("font-semibold text-peligro", className)}>{ocupados} de {semana.lugares} lugares</span>;
  if (ocupados === semana.lugares) return <span className={cn("text-tinta-suave", className)}>Lleno</span>;
  return (
    <span className={cn("text-tinta-suave", className)}>
      {ocupados} de {semana.lugares} {semana.lugares === 1 ? "lugar" : "lugares"}
    </span>
  );
}

/** Hasta o desde cuándo sigue una reserva de varios días, mirada desde un día. */
function textoTramo(r: Pick<ReservaTablero, "inicio" | "fin">, dia: string) {
  if (r.inicio === r.fin) return null;
  if (dia < r.fin) return `Hasta el ${diaEnFrase(r.fin)}`;
  return `Desde el ${diaEnFrase(r.inicio)}`;
}

/**
 * El color de un bloque en la grilla: el de su estado (las clases tt-tono-* de globals.css, las mismas de las
 * insignias). La reservada, en ámbar (16/11: blanca no se distinguía de un día libre; gris, de uno cerrado). La
 * entregada, sólida en verde (pedido 28). La guía de colores (GuiaColores) usa estos mismos.
 */
function colorBloque(estado: ReservaTablero["estado"]) {
  const tono = TONO_ESTADO_TRABAJO[estado] ?? "neutro";
  if (estado === "entregado") return { tono, clase: "tt-tono-exito border-transparent bg-exito text-fondo", texto: "text-fondo", punto: "bg-fondo" };
  if (tono === "neutro") return { tono, clase: "tt-tono-neutro border-input bg-neutro-fondo", texto: "text-tinta-suave", punto: "bg-tinta-suave" };
  return { tono, clase: `tt-tono-${tono} border-transparent bg-[var(--tono-fondo)]`, texto: "text-[var(--tono)]", punto: "bg-[var(--tono)]" };
}

/** Lo que el lector de pantalla oye después de lo visible: el estado, las fechas y si sigue de otra semana. */
function DetalleOculto({ r, empiezaAntes, terminaDespues }: { r: ReservaTablero; empiezaAntes?: boolean; terminaDespues?: boolean }) {
  return (
    <span className="sr-only">
      , {NOMBRE_ESTADO_TRABAJO[r.estado].toLowerCase()}, {textoFechas(r)}
      {empiezaAntes && ", sigue desde la semana anterior"}
      {terminaDespues && ", sigue la semana siguiente"}
    </span>
  );
}

/** Computadora: una reserva en la grilla, con placa, hora (si se acordó), cliente, servicio y estado. */
function Cinta({ r, empiezaAntes, terminaDespues, conOrdenes, desde, style }: { r: ReservaTablero; empiezaAntes: boolean; terminaDespues: boolean; conOrdenes: boolean; desde: string; style: React.CSSProperties }) {
  const color = colorBloque(r.estado);
  const servicio = textoServicio(r);
  const secundario = r.estado === "entregado" ? "text-fondo" : "text-tinta-media";
  return (
    <Link
      href={conDesde(rutaTrabajo(r.id, r.estado, conOrdenes), desde)}
      style={style}
      data-tono={color.tono}
      className={cn(
        "relative z-10 mx-1.5 flex min-w-0 flex-col justify-center gap-0.5 overflow-hidden rounded-lg border px-3 py-2 text-tinta transition-[filter] hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foco)]",
        color.clase,
      )}
    >
      <span className="flex items-baseline gap-1.5">
        {empiezaAntes && <ChevronLeftIcon className="size-3.5 shrink-0 self-center" aria-hidden />}
        <span className="truncate tt-placa text-[0.9375rem]">{r.placa}</span>
        {terminaDespues && <ChevronRightIcon className="ml-auto size-3.5 shrink-0 self-center" aria-hidden />}
      </span>
      <span className="truncate text-[0.8125rem] font-medium">{r.cliente}</span>
      {servicio && <span className={cn("truncate text-xs", secundario)}>{servicio}</span>}
      <span aria-hidden className={cn("mt-0.5 flex items-center gap-1.5 text-xs font-semibold", color.texto)}>
        <span className={cn("size-[7px] shrink-0 rounded-full", color.punto)} />
        <span className="truncate">{NOMBRE_ESTADO_TRABAJO[r.estado]}</span>
      </span>
      <DetalleOculto r={r} empiezaAntes={empiezaAntes} terminaDespues={terminaDespues} />
    </Link>
  );
}

/**
 * Computadora: un día libre, con su "+ Reservar" siempre a la vista, igual que en la tableta (19/11, a pedido del dueño):
 * escondido hasta pasar el mouse (16/11), quien entraba no sabía que el día libre se toca para reservar. En gris, para
 * que las reservas sigan mandando; al pasar el mouse se marca. El lector de pantalla oye "Reservar en …, libre".
 */
function DiaLibre({ fecha, quedan, desde, style }: { fecha: string; quedan: number; desde: string; style: React.CSSProperties }) {
  return (
    <Link
      href={agendarEn(fecha, desde)}
      style={style}
      className="mx-1.5 flex items-center justify-center gap-1 rounded-lg border border-dashed border-input text-[0.8125rem] font-semibold text-tinta-suave transition-colors hover:border-tinta-suave hover:bg-superficie hover:text-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foco)]"
    >
      <PlusIcon className="size-4" aria-hidden />
      <span aria-hidden>Reservar</span>
      <span className="sr-only">
        Reservar el {textoDia(fecha)}, {quedan === 1 ? "queda 1 lugar" : `quedan ${quedan} lugares`}
      </span>
    </Link>
  );
}

/** Computadora: la semana entera. */
export function TableroSemana({ semana, dias, hoy, conOrdenes, desde }: Props) {
  const lunes = dias[0];
  const filas = semana.filas;
  const cerrado = (i: number) => semana.diasCerrados.includes(i + 1);
  const bloques = bloquesDeLaSemana(semana.reservas, lunes);
  const ocupadaEn = (fila: number, fecha: string) => bloques.some((b) => b.fila === fila && seCruzan(b, { inicio: fecha, fin: fecha }));
  return (
    <div className="tt-tarjeta-panel hidden p-3 xl:block">
      <div className="grid grid-cols-[repeat(7,minmax(0,1fr))] gap-y-1.5" style={{ gridTemplateRows: `3.75rem repeat(${filas}, minmax(6.75rem, auto))` }}>
        {/* Debajo de todo, las columnas de los días: una línea fina entre ellos. Hoy se marca solo en su encabezado (16/11:
            el marco de toda la columna quedaba debajo de las reservas y se cortaba donde una cruzaba al día siguiente) */}
        {dias.map((fecha, i) => (
          <div
            key={`columna-${fecha}`}
            aria-hidden
            style={{ gridRow: `1 / span ${filas + 1}`, gridColumn: i + 1 }}
            // Los días que ya pasaron, un poco más apagados (19/11): la vista va a hoy y lo que sigue
            className={cn(i > 0 && "border-l border-border", fecha < hoy && "bg-fondo-panel/60")}
          />
        ))}
        {dias.map((fecha, i) => {
          const esHoy = fecha === hoy;
          return (
            <div
              key={fecha}
              style={{ gridRow: 1, gridColumn: i + 1 }}
              // Hoy, en negro (19/11): el número en un círculo y "Hoy" en gris. El azul era el de "En proceso" y, encima de
              // una reserva en proceso, parecía que el día lo estaba
              className={cn("mx-1.5 my-1 flex flex-col gap-0.5 px-2 py-1", (cerrado(i) || fecha < hoy) && !esHoy && "text-tinta-suave")}
            >
              <span className="flex items-center gap-1.5">
                <span className="text-sm">{DIA_CORTO[i]}</span>
                <span className={cn("font-bold tabular-nums", esHoy ? "grid size-8 place-items-center rounded-full bg-tinta text-base text-fondo" : "text-lg")}>{numeroDia(fecha)}</span>
                {esHoy && <span className="ml-auto text-xs font-semibold text-tinta-suave">Hoy</span>}
              </span>
              {/* Cuántos lugares están ocupados (pedido 55): desde hoy, y no en un día cerrado */}
              {fecha >= hoy && !cerrado(i) && <Ocupacion semana={semana} dia={fecha} className="text-xs" />}
            </div>
          );
        })}
        {/* Un día cerrado, una sola vez para todas las filas */}
        {dias.map((fecha, i) =>
          cerrado(i) ? (
            <div key={`cerrado-${fecha}`} style={{ gridRow: `2 / span ${filas}`, gridColumn: i + 1, ...RAYAS_CERRADO }} className="mx-1.5 flex items-center justify-center rounded-lg text-sm font-semibold text-tinta-suave">
              Cerrado
            </div>
          ) : null,
        )}
        {/* "+ Reservar" una vez por día con lugar, en la primera fila libre de ese día */}
        {dias.map((fecha) => {
          const libres = quedan(semana, fecha, hoy);
          if (libres === 0) return null;
          const fila = Array.from({ length: filas }, (_, n) => n).find((n) => !ocupadaEn(n, fecha));
          if (fila === undefined) return null;
          return <DiaLibre key={`libre-${fecha}`} desde={desde} fecha={fecha} quedan={libres} style={{ gridRow: fila + 2, gridColumn: dias.indexOf(fecha) + 1 }} />;
        })}
        {bloques.map((b) => (
          <Cinta key={`${b.id}-${b.inicio}`} r={b} empiezaAntes={b.empiezaAntes} terminaDespues={b.terminaDespues} conOrdenes={conOrdenes} desde={desde} style={{ gridRow: b.fila + 2, gridColumn: `${b.columna + 1} / span ${b.dias}` }} />
        ))}
      </div>
    </div>
  );
}

/** El título de un día en la tableta y el celular, con cuántas reservas tiene. */
function CabeceraDia({ semana, fecha, hoy, cuantas, cerrado }: { semana: SemanaDeAgenda; fecha: string; hoy: string; cuantas: number; cerrado: boolean }) {
  return (
    <CabeceraSeccion compacta titulo={<span className={cn(cerrado && fecha !== hoy && "text-tinta-suave")}>{tituloDia(fecha, hoy)}</span>}>
      {/* Desde hoy, cuántos lugares están ocupados (pedido 55); antes, cuántas reservas hubo */}
      {!cerrado &&
        (fecha >= hoy ? (
          <Ocupacion semana={semana} dia={fecha} className="text-sm" />
        ) : (
          <span className="text-sm text-tinta-suave">{cuantas === 0 ? "Sin reservas" : cantidad(cuantas, "reserva", "reservas")}</span>
        ))}
    </CabeceraSeccion>
  );
}

/** Un día cerrado en la tableta y el celular. */
function DiaCerrado({ texto = "Cerrado" }: { texto?: string }) {
  return (
    <p style={RAYAS_CERRADO} className="rounded-xl px-4 py-3.5 text-sm font-semibold text-tinta-suave">
      {texto}
    </p>
  );
}

/** Los lugares que quedan un día, en una sola fila baja con "Reservar" (pedido 55). */
function FilaLibres({ quedan, fecha, desde, conBorde }: { quedan: number; fecha: string; desde: string; conBorde: boolean }) {
  const texto = quedan === 1 ? "Queda 1 lugar" : `Quedan ${quedan} lugares`;
  return (
    <Link
      href={agendarEn(fecha, desde)}
      className={cn("flex min-h-12 items-center justify-between gap-3 bg-superficie/50 px-4 text-sm hover:bg-superficie", conBorde && "border-t border-border")}
    >
      <span className="text-tinta-media">{texto}</span>
      <span className="inline-flex shrink-0 items-center gap-1 font-semibold">
        <PlusIcon className="size-4" aria-hidden />
        Reservar
        <span className="sr-only"> el {textoDia(fecha)}</span>
      </span>
    </Link>
  );
}

/** Tableta: la semana como lista por día, sin pestañas. */
export function SemanaEnLista({ semana, dias, hoy, conOrdenes, desde }: Props) {
  // Si la semana es la de hoy, empieza en hoy: los días que ya pasaron van plegados arriba (19/11)
  const pasados = dias.filter((d) => d < hoy);
  const desdeHoy = dias.filter((d) => d >= hoy);
  const dia = (fecha: string, primero: boolean) => <DiaEnLista key={fecha} fecha={fecha} primero={primero} semana={semana} hoy={hoy} conOrdenes={conOrdenes} desde={desde} />;
  return (
    <div className="hidden flex-col gap-6 md:flex xl:hidden">
      {pasados.length > 0 && desdeHoy.length > 0 && (
        <details className="group">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-sm font-semibold text-tinta-suave hover:text-tinta [&::-webkit-details-marker]:hidden">
            <ChevronRightIcon className="size-4 transition-transform group-open:rotate-90" aria-hidden />
            {pasados.length === 1 ? "Ver el día anterior" : `Ver los ${pasados.length} días anteriores`}
          </summary>
          <div className="mt-3 flex flex-col gap-6">{pasados.map((d, n) => dia(d, n === 0))}</div>
        </details>
      )}
      {(desdeHoy.length > 0 && pasados.length > 0 ? desdeHoy : dias).map((d, n) => dia(d, n === 0))}
    </div>
  );
}

/**
 * Un día de la lista de la tableta. Una reserva que viene de un día anterior (de varios días) va completa solo en el
 * primer día que se ve; en los demás, la nombra una línea "Siguen en el taller: 4567BDF y 2468KLM" (19/11: se repetía
 * entera cada día, 13 filas para 6 vehículos).
 */
function DiaEnLista({ fecha, primero, semana, hoy, conOrdenes, desde }: { fecha: string; primero: boolean; semana: SemanaDeAgenda; hoy: string; conOrdenes: boolean; desde: string }) {
  const cerrado = semana.diasCerrados.includes(diaDeLaSemana(fecha));
  const del = delDia(semana, fecha);
  const siguen = primero ? [] : del.filter((r) => r.inicio < fecha);
  const nuevas = primero ? del : del.filter((r) => r.inicio >= fecha);
  // Una entregada (hoy también se ve, 18/11) no ocupa: su lugar sigue libre para reservar
  const libres = quedan(semana, fecha, hoy);
  const hayAlgo = nuevas.length > 0 || siguen.length > 0 || libres > 0;
  return (
    <section aria-label={tituloDia(fecha, hoy)} className="flex flex-col gap-2">
      <CabeceraDia semana={semana} fecha={fecha} hoy={hoy} cuantas={del.length} cerrado={cerrado && del.length === 0} />
      {cerrado && del.length === 0 ? (
        <DiaCerrado />
      ) : !hayAlgo ? null : (
        <div className="tt-tarjeta-panel overflow-hidden">
          {nuevas.length > 0 && (
            <ul aria-label={`Reservas el ${textoDia(fecha)}`}>
              {nuevas.map((r, n) => {
                const tramo = textoTramo(r, fecha);
                return (
                  <li key={r.id} className={cn(n > 0 && "border-t border-border")}>
                    <Link href={conDesde(rutaTrabajo(r.id, r.estado, conOrdenes), desde)} data-tono={TONO_ESTADO_TRABAJO[r.estado] ?? "neutro"} className="grid min-h-16 grid-cols-[6.5rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 hover:bg-superficie/50">
                      <span className="tt-placa">{r.placa}</span>
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate text-sm font-medium">{r.cliente}</span>
                        {r.servicio && <span className="truncate text-[0.8125rem] text-tinta-media">{textoServicio(r)}</span>}
                        {tramo && <span className="text-xs text-tinta-suave">{tramo}</span>}
                      </span>
                      <MarcaEstado tono={TONO_ESTADO_TRABAJO[r.estado]} className="text-sm">
                        {NOMBRE_ESTADO_TRABAJO[r.estado]}
                      </MarcaEstado>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          {siguen.length > 0 && (
            <p className={cn("flex flex-wrap items-baseline gap-x-1.5 px-4 py-3 text-sm text-tinta-suave", nuevas.length > 0 && "border-t border-border")}>
              <span>Siguen en el taller:</span>
              {siguen.map((r, n) => (
                <span key={r.id}>
                  <Link href={conDesde(rutaTrabajo(r.id, r.estado, conOrdenes), desde)} className="tt-placa text-tinta underline-offset-4 hover:underline">
                    {r.placa}
                  </Link>
                  {n < siguen.length - 2 ? "," : n === siguen.length - 2 ? " y" : ""}
                </span>
              ))}
            </p>
          )}
          {libres > 0 && <FilaLibres quedan={libres} fecha={fecha} desde={desde} conBorde={nuevas.length > 0 || siguen.length > 0} />}
        </div>
      )}
    </section>
  );
}

/**
 * Celular: la tira de los siete días (prototipo aprobado el 16/11): el día de la semana en chico, el número y un punto en
 * los días con reservas. El elegido, en negro; hoy, con su número subrayado (19/11; antes en azul). Queda fija arriba al bajar. Cada día es un enlace (el día va
 * en la dirección).
 */
export function PestanasDias({ semana, dias, hoy, dia, enlace }: { semana: SemanaDeAgenda; dias: string[]; hoy: string; dia: string; enlace: (dia: string) => Route }) {
  return (
    <nav aria-label="Días de la semana" className="sticky top-0 z-20 -mx-4 border-b border-border bg-fondo-panel px-4 py-2 md:hidden">
      <ul className="grid grid-cols-7">
        {dias.map((d, i) => {
          const cerrado = semana.diasCerrados.includes(diaDeLaSemana(d));
          const n = delDia(semana, d).length;
          const elegido = d === dia;
          const esHoy = d === hoy;
          return (
            <li key={d}>
              <Link
                href={enlace(d)}
                aria-current={elegido ? "date" : undefined}
                aria-label={`${textoDia(d)}${esHoy ? ", hoy" : ""}${n > 0 ? `, ${cantidad(n, "reserva", "reservas")}` : cerrado ? ", cerrado" : ", sin reservas"}`}
                className={cn(
                  "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-lg",
                  elegido ? "bg-tinta text-fondo" : cerrado && !esHoy ? "text-tinta-suave" : "text-tinta",
                )}
              >
                <span className="text-[0.6875rem]">{DIA_CORTO[i]}</span>
                {/* Hoy, sin elegir: su número subrayado en negro (19/11, en lugar del celeste de "En proceso") */}
                <span className={cn("text-base tabular-nums", esHoy || elegido ? "font-bold" : "font-medium", esHoy && !elegido && "underline decoration-2 underline-offset-4")}>{numeroDia(d)}</span>
                <span aria-hidden className={cn("size-[5px] rounded-full", n > 0 ? (elegido ? "bg-fondo" : "bg-tinta-media") : "bg-transparent")} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Celular: el día elegido en una tarjeta (prototipo del 16/11): las reservas (placa y estado; cliente y servicio; hasta
 * cuándo sigue) y, al final, los lugares que quedan en una sola fila con "Reservar". Las pestañas de los días van arriba (PestanasDias).
 */
export function AgendaDelDia({ semana, dia, hoy, conOrdenes, desde }: { semana: SemanaDeAgenda; dia: string; hoy: string; conOrdenes: boolean; desde: string }) {
  const cerrado = semana.diasCerrados.includes(diaDeLaSemana(dia));
  const del = delDia(semana, dia);
  // Una entregada (hoy también se ve, 18/11) no ocupa: su lugar sigue libre para reservar
  const libres = quedan(semana, dia, hoy);
  return (
    <section aria-label={tituloDia(dia, hoy)} className="flex flex-col gap-2 md:hidden">
      <CabeceraDia semana={semana} fecha={dia} hoy={hoy} cuantas={del.length} cerrado={cerrado && del.length === 0} />
      {cerrado && del.length === 0 ? (
        <DiaCerrado texto="Cerrado ese día" />
      ) : del.length === 0 && libres === 0 ? (
        <p className="tt-tarjeta-panel px-3.5 py-3 text-sm text-tinta-suave">Sin reservas.</p>
      ) : (
        <ul aria-label={`Reservas el ${textoDia(dia)}`} className="tt-tarjeta-panel overflow-hidden">
          {del.map((r, n) => {
            const tramo = textoTramo(r, dia);
            const servicio = textoServicio(r);
            return (
              <li key={r.id} className={cn(n > 0 && "border-t border-border")}>
                <Link href={conDesde(rutaTrabajo(r.id, r.estado, conOrdenes), desde)} data-tono={TONO_ESTADO_TRABAJO[r.estado] ?? "neutro"} className="flex flex-col gap-0.5 px-3.5 py-3 hover:bg-superficie/50">
                  <span className="flex items-center justify-between gap-2">
                    <span className="tt-placa text-base">{r.placa}</span>
                    <MarcaEstado tono={TONO_ESTADO_TRABAJO[r.estado]} className="text-sm">
                      {NOMBRE_ESTADO_TRABAJO[r.estado]}
                    </MarcaEstado>
                  </span>
                  <span className="truncate text-sm">
                    <span className="font-medium">{r.cliente}</span>
                    {servicio && <span className="text-tinta-media">, {servicio}</span>}
                  </span>
                  {tramo && <span className="text-xs text-tinta-suave">{tramo}</span>}
                </Link>
              </li>
            );
          })}
          {libres > 0 && (
            <li>
              <FilaLibres quedan={libres} fecha={dia} desde={desde} conBorde={del.length > 0} />
            </li>
          )}
        </ul>
      )}
    </section>
  );
}
