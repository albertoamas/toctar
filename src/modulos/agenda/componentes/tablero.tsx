import type { Route } from "next";
import Link from "next/link";
import { cn } from "cn";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "lucide-react";
import type { ReservaTablero, SemanaDeAgenda } from "../consultas/tablero";
import { CabeceraSeccion } from "@/componentes/panel/cabecera-seccion";
import { Insignia } from "@/componentes/panel/insignia";
import { cantidad } from "@/lib/cantidad";
import { rutaTrabajo } from "@/modulos/ordenes/reglas";
import {
  bloquesDeLaSemana,
  DIA_CORTO,
  diaDeLaSemana,
  diaEnFrase,
  NOMBRE_ESTADO_TRABAJO,
  numeroDia,
  ocupaEspacio,
  seCruzan,
  textoDia,
  textoServicio,
  tituloDia,
  TONO_ESTADO_TRABAJO,
  unirConY,
} from "../reglas";
import { conDesde } from "@/lib/volver";

// HU-29: el tablero de la agenda (RF-38), por día y sin horas (S-3). Lavado de cara del 16/11 (prototipo aprobado):
// - Computadora (desde 1280 px; en una laptop de 1024, con el menú, cada día medía 80 px y no se leía): la semana en una grilla, una fila por espacio. Los días libres quedan limpios (el
//   "Reservar" aparece al pasar el mouse o con el foco), hoy se marca en su encabezado y un día cerrado, una sola vez.
//   Cada reserva dice placa, cliente, servicio y estado (con palabra, no solo color).
// - Tableta y laptop chica (768 a 1279 px): la semana como lista por día ("Hoy", "Mañana", "Miércoles 18"), sin tocar pestañas.
// - Celular: la tira de los siete días (un punto en los que tienen reservas), fija arriba, y el día elegido en una
//   tarjeta, con los espacios libres juntos en una fila.
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

const agendarEn = (fecha: string, espacioId: number, desde: string) => conDesde(`/panel/agenda/nueva?fecha=${fecha}&espacio=${espacioId}` as Route, desde);

function textoFechas(r: Pick<ReservaTablero, "inicio" | "fin">) {
  return r.inicio === r.fin ? textoDia(r.inicio) : `${textoDia(r.inicio)} al ${textoDia(r.fin)}`;
}

/** El día cerrado: rayas a 60° (el único ángulo de la marca), igual en las tres vistas. */
const RAYAS_CERRADO: React.CSSProperties = { backgroundImage: "repeating-linear-gradient(60deg, var(--neutro-fondo) 0 6px, var(--fondo-panel) 6px 12px)" };

/** La reserva de un espacio en un día: gana la que ocupa sobre la entregada (vienen en ese orden). */
const reservaDelDia = (semana: SemanaDeAgenda, espacioId: number, dia: string) => semana.reservas.find((x) => x.espacioId === espacioId && seCruzan(x, { inicio: dia, fin: dia }));

/**
 * Las reservas que se ven en un día, una por espacio (también una entregada, como historia, pedido 28): las mismas que
 * cuentan la cabecera y la pestaña de ese día, así nunca dice "Sin reservas" arriba de un vehículo.
 */
const delDia = (semana: SemanaDeAgenda, dia: string) =>
  semana.espacios.flatMap((e) => {
    const r = reservaDelDia(semana, e.id, dia);
    return r ? [{ r, espacio: e.nombre }] : [];
  });


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
        {r.hora && <span className={cn("ml-auto shrink-0 font-normal tabular-nums", secundario)}>{r.hora}</span>}
      </span>
      <DetalleOculto r={r} empiezaAntes={empiezaAntes} terminaDespues={terminaDespues} />
    </Link>
  );
}

/**
 * Computadora: un día libre. Sin recuadro a la vista (pulido del 16/11: 15 recuadros punteados tapaban las reservas):
 * el "+ Reservar" aparece al pasar el mouse, con el foco o con pantalla táctil (sin mouse no hay "pasar por encima").
 * El lector de pantalla oye "Reservar en …, libre".
 */
function DiaLibre({ fecha, espacio, desde, style }: { fecha: string; espacio: { id: number; nombre: string }; desde: string; style: React.CSSProperties }) {
  return (
    <Link
      href={agendarEn(fecha, espacio.id, desde)}
      style={style}
      className="mx-1.5 flex items-center justify-center gap-1 rounded-lg border border-dashed border-input text-[0.8125rem] font-semibold text-tinta opacity-0 transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foco)] pointer-coarse:opacity-100"
    >
      <PlusIcon className="size-4" aria-hidden />
      <span aria-hidden>Reservar</span>
      <span className="sr-only">
        Reservar en {espacio.nombre} el {textoDia(fecha)}, libre
      </span>
    </Link>
  );
}

/** Computadora: la semana entera. */
export function TableroSemana({ semana, dias, hoy, conOrdenes, desde }: Props) {
  const lunes = dias[0];
  const filas = semana.espacios.length;
  const cerrado = (i: number) => semana.diasCerrados.includes(i + 1);
  return (
    <div className="tt-tarjeta-panel hidden p-3 xl:block">
      <div className="grid grid-cols-[8rem_repeat(7,minmax(0,1fr))] gap-y-1.5" style={{ gridTemplateRows: `3rem repeat(${filas}, minmax(6.75rem, auto))` }}>
        {/* Debajo de todo, las columnas de los días: una línea fina entre ellos. Hoy se marca solo en su encabezado (16/11:
            el marco de toda la columna quedaba debajo de las reservas y se cortaba donde una cruzaba al día siguiente) */}
        {dias.map((fecha, i) => (
          <div
            key={`columna-${fecha}`}
            aria-hidden
            style={{ gridRow: `1 / span ${filas + 1}`, gridColumn: i + 2 }}
            className="border-l border-border"
          />
        ))}
        {dias.map((fecha, i) => {
          const esHoy = fecha === hoy;
          return (
            <div
              key={fecha}
              style={{ gridRow: 1, gridColumn: i + 2 }}
              className={cn("mx-1.5 my-1 flex items-baseline gap-1.5 rounded-lg px-2 py-1.5", esHoy && "bg-info-fondo text-info", cerrado(i) && !esHoy && "text-tinta-suave")}
            >
              <span className="text-sm">{DIA_CORTO[i]}</span>
              <span className="text-lg font-bold tabular-nums">{numeroDia(fecha)}</span>
              {esHoy && <span className="ml-auto text-xs font-bold">Hoy</span>}
            </div>
          );
        })}
        {/* Un día cerrado, una sola vez para todos los espacios */}
        {dias.map((fecha, i) =>
          cerrado(i) ? (
            <div key={`cerrado-${fecha}`} style={{ gridRow: `2 / span ${filas}`, gridColumn: i + 2, ...RAYAS_CERRADO }} className="mx-1.5 flex items-center justify-center rounded-lg text-sm font-semibold text-tinta-suave">
              Cerrado
            </div>
          ) : null,
        )}

        {semana.espacios.map((espacio, fila) => {
          const deEspacio = bloquesDeLaSemana(
            semana.reservas.filter((r) => r.espacioId === espacio.id),
            lunes,
          );
          const ocupado = (fecha: string) => deEspacio.some((b) => seCruzan(b, { inicio: fecha, fin: fecha }));
          const gridRow = fila + 2;
          return (
            <section key={espacio.id} aria-label={espacio.nombre} className="contents">
              <h2 style={{ gridRow, gridColumn: 1 }} className="flex flex-col justify-center tt-titulo-sub">
                {espacio.nombre}
                {!espacio.activo && <span className="text-xs font-normal text-tinta-suave">Desactivado</span>}
              </h2>
              {dias.map((fecha, i) =>
                ocupado(fecha) || !espacio.activo || cerrado(i) || fecha < hoy ? null : (
                  <DiaLibre key={fecha} desde={desde} fecha={fecha} espacio={espacio} style={{ gridRow, gridColumn: i + 2 }} />
                ),
              )}
              {deEspacio.map((b) => (
                <Cinta key={`${b.id}-${b.inicio}`} r={b} empiezaAntes={b.empiezaAntes} terminaDespues={b.terminaDespues} conOrdenes={conOrdenes} desde={desde} style={{ gridRow, gridColumn: `${b.columna + 2} / span ${b.dias}` }} />
              ))}
            </section>
          );
        })}
      </div>
    </div>
  );
}

/** El título de un día en la tableta y el celular, con cuántas reservas tiene. */
function CabeceraDia({ fecha, hoy, cuantas, cerrado }: { fecha: string; hoy: string; cuantas: number; cerrado: boolean }) {
  return (
    <CabeceraSeccion compacta titulo={<span className={cn(fecha === hoy && "text-info", cerrado && fecha !== hoy && "text-tinta-suave")}>{tituloDia(fecha, hoy)}</span>}>
      {!cerrado && <span className="text-sm text-tinta-suave">{cuantas === 0 ? "Sin reservas" : cantidad(cuantas, "reserva", "reservas")}</span>}
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

/** Los espacios libres de un día, en una sola fila baja con "Reservar" (en el primero libre; se cambia en la reserva). */
function FilaLibres({ libres, total, fecha, desde, conBorde }: { libres: { id: number; nombre: string }[]; total: number; fecha: string; desde: string; conBorde: boolean }) {
  const texto = libres.length === total && total > 1 ? `Libres los ${total} espacios` : `${libres.length === 1 ? "Libre" : "Libres"}: ${unirConY(libres.map((e) => e.nombre))}`;
  return (
    <Link
      href={agendarEn(fecha, libres[0].id, desde)}
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
  return (
    <div className="hidden flex-col gap-6 md:flex xl:hidden">
      {dias.map((fecha) => {
        const cerrado = semana.diasCerrados.includes(diaDeLaSemana(fecha));
        const del = delDia(semana, fecha);
        // Una entregada (hoy también se ve, 18/11) no ocupa: su espacio sigue libre para reservar
        const libres = fecha < hoy || cerrado ? [] : semana.espacios.filter((e) => e.activo && !del.some((d) => d.r.espacioId === e.id && ocupaEspacio(d.r.estado)));
        return (
          <section key={fecha} aria-label={tituloDia(fecha, hoy)} className="flex flex-col gap-2">
            <CabeceraDia fecha={fecha} hoy={hoy} cuantas={del.length} cerrado={cerrado && del.length === 0} />
            {cerrado && del.length === 0 ? (
              <DiaCerrado />
            ) : del.length === 0 && libres.length === 0 ? null : (
              <div className="tt-tarjeta-panel overflow-hidden">
                {del.length > 0 && (
                  <ul aria-label={`Reservas el ${textoDia(fecha)}`}>
                    {del.map(({ r, espacio }, n) => {
                      const tramo = textoTramo(r, fecha);
                      return (
                        <li key={r.id} className={cn(n > 0 && "border-t border-border")}>
                          <Link href={conDesde(rutaTrabajo(r.id, r.estado, conOrdenes), desde)} data-tono={TONO_ESTADO_TRABAJO[r.estado] ?? "neutro"} className="grid min-h-16 grid-cols-[6.5rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 hover:bg-superficie/50">
                            <span className="flex flex-col">
                              <span className="tt-placa">{r.placa}</span>
                              <span className="text-xs text-tinta-suave">{espacio}</span>
                            </span>
                            <span className="flex min-w-0 flex-col gap-0.5">
                              <span className="truncate text-sm font-medium">
                                {r.cliente}
                                {r.hora && <span className="font-normal text-tinta-suave">, {r.hora}</span>}
                              </span>
                              {r.servicio && <span className="truncate text-[0.8125rem] text-tinta-media">{textoServicio(r)}</span>}
                              {tramo && <span className="text-xs text-tinta-suave">{tramo}</span>}
                            </span>
                            <Insignia tono={TONO_ESTADO_TRABAJO[r.estado]}>{NOMBRE_ESTADO_TRABAJO[r.estado]}</Insignia>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {libres.length > 0 && <FilaLibres libres={libres} total={semana.espacios.filter((e) => e.activo).length} fecha={fecha} desde={desde} conBorde={del.length > 0} />}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

/**
 * Celular: la tira de los siete días (prototipo aprobado el 16/11): el día de la semana en chico, el número y un punto en
 * los días con reservas. Hoy, en azul; el elegido, en negro. Queda fija arriba al bajar. Cada día es un enlace (el día va
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
                  elegido ? "bg-tinta text-fondo" : esHoy ? "bg-info-fondo text-info" : cerrado ? "text-tinta-suave" : "text-tinta",
                )}
              >
                <span className="text-[0.6875rem]">{DIA_CORTO[i]}</span>
                <span className={cn("text-base tabular-nums", esHoy || elegido ? "font-bold" : "font-medium")}>{numeroDia(d)}</span>
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
 * Celular: el día elegido en una tarjeta (prototipo del 16/11): las reservas por espacio (placa y estado; cliente y
 * servicio; el espacio, la hora y hasta cuándo sigue) y, al final, los espacios libres juntos en una sola fila con
 * "Reservar". Las pestañas de los días van arriba (PestanasDias).
 */
export function AgendaDelDia({ semana, dia, hoy, conOrdenes, desde }: { semana: SemanaDeAgenda; dia: string; hoy: string; conOrdenes: boolean; desde: string }) {
  const cerrado = semana.diasCerrados.includes(diaDeLaSemana(dia));
  const del = delDia(semana, dia);
  // Una entregada (hoy también se ve, 18/11) no ocupa: su espacio sigue libre para reservar
  const libres = dia < hoy || cerrado ? [] : semana.espacios.filter((e) => e.activo && !del.some((d) => d.r.espacioId === e.id && ocupaEspacio(d.r.estado)));
  return (
    <section aria-label={tituloDia(dia, hoy)} className="flex flex-col gap-2 md:hidden">
      <CabeceraDia fecha={dia} hoy={hoy} cuantas={del.length} cerrado={cerrado && del.length === 0} />
      {cerrado && del.length === 0 ? (
        <DiaCerrado texto="Cerrado ese día" />
      ) : del.length === 0 && libres.length === 0 ? (
        <p className="tt-tarjeta-panel px-3.5 py-3 text-sm text-tinta-suave">Sin reservas.</p>
      ) : (
        <ul aria-label={`Espacios el ${textoDia(dia)}`} className="tt-tarjeta-panel overflow-hidden">
          {del.map(({ r, espacio }, n) => {
            const tramo = textoTramo(r, dia);
            const servicio = textoServicio(r);
            return (
              <li key={r.id} className={cn(n > 0 && "border-t border-border")}>
                <Link href={conDesde(rutaTrabajo(r.id, r.estado, conOrdenes), desde)} data-tono={TONO_ESTADO_TRABAJO[r.estado] ?? "neutro"} className="flex flex-col gap-0.5 px-3.5 py-3 hover:bg-superficie/50">
                  <span className="flex items-center justify-between gap-2">
                    <span className="tt-placa text-base">{r.placa}</span>
                    <Insignia tono={TONO_ESTADO_TRABAJO[r.estado]}>{NOMBRE_ESTADO_TRABAJO[r.estado]}</Insignia>
                  </span>
                  <span className="truncate text-sm">
                    <span className="font-medium">{r.cliente}</span>
                    {servicio && <span className="text-tinta-media">, {servicio}</span>}
                  </span>
                  <span className="text-xs text-tinta-suave">
                    {espacio}
                    {r.hora && `, a las ${r.hora}`}
                    {tramo && `. ${tramo}`}
                  </span>
                </Link>
              </li>
            );
          })}
          {libres.length > 0 && (
            <li>
              <FilaLibres libres={libres} total={semana.espacios.filter((e) => e.activo).length} fecha={dia} desde={desde} conBorde={del.length > 0} />
            </li>
          )}
        </ul>
      )}
    </section>
  );
}

/** Los estados en el orden del trabajo, para la guía. */
const ESTADOS_EN_LA_GUIA = ["agendado", "recibido", "en_proceso", "listo", "entregado"] as const;

/**
 * La guía de colores de la Agenda (pedido del desarrollador, 16/11): qué estado es cada color, y el día cerrado. Los
 * mismos colores que las reservas del tablero y las insignias de la lista. Arriba, en una línea, desde la tableta: en el
 * celular cada reserva ya dice su estado escrito, en su insignia.
 */
export function GuiaColores() {
  return (
    <ul aria-label="Colores de la agenda" className="hidden flex-wrap gap-x-4 gap-y-1.5 text-xs text-tinta-media md:flex">
      {ESTADOS_EN_LA_GUIA.map((e) => (
        <li key={e} className="flex items-center gap-1.5">
          {/* El fondo de la reserva y el borde en el color fuerte del estado: un fondo pastel solo no se ve en chico */}
          <span aria-hidden className={cn("h-3.5 w-5 shrink-0 rounded-sm border-2", colorBloque(e).clase, e === "entregado" ? "border-exito" : "border-[var(--tono)]")} />
          {NOMBRE_ESTADO_TRABAJO[e]}
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <span aria-hidden style={RAYAS_CERRADO} className="h-3.5 w-5 shrink-0 rounded-sm border-2 border-tinta-suave/40" />
        Cerrado
      </li>
    </ul>
  );
}
