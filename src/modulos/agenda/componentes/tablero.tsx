import type { Route } from "next";
import Link from "next/link";
import { cn } from "cn";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "lucide-react";
import type { ReservaTablero, SemanaDeAgenda } from "../consultas";
import { rutaTrabajo } from "@/modulos/ordenes/reglas";
import { bloquesDeLaSemana, DIA_CORTO, diaDeLaSemana, NOMBRE_ESTADO_TRABAJO, numeroDia, seCruzan, textoDia, TONO_ESTADO_TRABAJO } from "../reglas";

// HU-29: el tablero de la agenda (RF-38). Una fila por espacio y una columna por día (S-3: por día, sin horas). Cada
// reserva es un bloque que abarca sus días, del color de su estado (pedido 26: el mismo tono que su insignia, con una
// barra a la izquierda); si sigue desde la semana anterior o hacia la siguiente, lo dice con una flecha. Un día libre se
// toca para agendar ahí; uno cerrado va en gris y lo dice. Hoy, resaltado en azul.
// En el celular y la tableta, un día a la vez (AgendaDelDia): sin desplazarse de lado. La semana entera, desde 1024 px
// (pulido 10.1: en la tableta, con siete columnas de 75 px, las cintas se cortaban en "4…").
// Todo es texto y enlaces: se lee igual con lector de pantalla, sin depender del color.

type Props = {
  semana: SemanaDeAgenda;
  dias: string[];
  hoy: string;
  /** Quien mira ve las órdenes: una reserva ya recibida lleva directo a su orden (C4). */
  conOrdenes: boolean;
};

const agendarEn = (fecha: string, espacioId: number) => `/panel/agenda/nueva?fecha=${fecha}&espacio=${espacioId}` as Route;

function textoFechas(r: ReservaTablero) {
  return r.inicio === r.fin ? textoDia(r.inicio) : `${textoDia(r.inicio)} al ${textoDia(r.fin)}`;
}

/**
 * El color de un bloque: el de su estado (las clases tt-tono-* de globals.css, las mismas de las insignias), de fondo y
 * en la barra. La agendada, blanca con borde: se ve igual sobre la tarjeta y sobre el gris del celular. La entregada,
 * sólida en verde: así se distingue de la lista y se ve de lejos (pedido 28).
 */
function colorBloque(estado: ReservaTablero["estado"]) {
  const tono = TONO_ESTADO_TRABAJO[estado] ?? "neutro";
  if (estado === "entregado") return { tono, clase: "tt-tono-exito border-l-exito bg-exito text-fondo", estado: "text-fondo" };
  if (tono === "neutro") return { tono, clase: "tt-tono-neutro border border-l-4 border-border border-l-tinta-suave bg-fondo", estado: "text-tinta-suave" };
  return { tono, clase: `tt-tono-${tono} border-l-[var(--tono)] bg-[var(--tono-fondo)]`, estado: "text-[var(--tono)]" };
}

/** Un día que el taller no atiende: igual en la semana y en el día. */
const CERRADO = "flex min-h-14 items-center justify-center rounded-lg bg-neutro-fondo text-tinta-suave";

/** Placa, servicio y estado: lo que dice el bloque de una reserva. */
function Cinta({
  r,
  empiezaAntes,
  terminaDespues,
  conOrdenes,
  className,
  style,
}: {
  r: ReservaTablero;
  empiezaAntes: boolean;
  terminaDespues: boolean;
  conOrdenes: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const color = colorBloque(r.estado);
  return (
    <Link
      href={rutaTrabajo(r.id, r.estado, conOrdenes)}
      style={style}
      // El tono, también como dato: la entregada va en verde (pedido 28)
      data-tono={color.tono}
      className={cn(
        "relative flex min-h-14 min-w-0 flex-col justify-center gap-0.5 rounded-lg border-l-4 py-1.5 pr-2.5 pl-2.5 text-tinta transition-[filter] hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foco)]",
        color.clase,
        className,
      )}
    >
      <span className="flex items-baseline gap-2">
        {empiezaAntes && <ChevronLeftIcon className="size-3.5 shrink-0 self-center" aria-hidden />}
        <span className="truncate tt-titulo-sub leading-none">{r.placa}</span>
        {terminaDespues && <ChevronRightIcon className="ml-auto size-3.5 shrink-0 self-center" aria-hidden />}
      </span>
      {r.servicio && (
        <span className="truncate text-xs">
          {r.servicio}
          {r.masServicios > 0 && ` y ${r.masServicios} más`}
        </span>
      )}
      {/* Desde que se recibe (recibida, en proceso, lista, entregada), el estado se ve también escrito, en su color */}
      {r.estado !== "agendado" && <span className={cn("truncate text-xs font-semibold", color.estado)}>{NOMBRE_ESTADO_TRABAJO[r.estado]}</span>}
      <span className="sr-only">
        , {NOMBRE_ESTADO_TRABAJO[r.estado].toLowerCase()}, {textoFechas(r)}
        {empiezaAntes && ", sigue desde la semana anterior"}
        {terminaDespues && ", sigue la semana siguiente"}
      </span>
    </Link>
  );
}

/** Un día sin reserva: libre (se agenda ahí), cerrado o ya pasado. */
function DiaSinReserva({ fecha, espacio, cerrado, pasado, style }: { fecha: string; espacio: { id: number; nombre: string }; cerrado: boolean; pasado: boolean; style?: React.CSSProperties }) {
  if (cerrado) {
    return (
      <div style={style} className={cn(CERRADO, "text-xs")}>
        Cerrado
      </div>
    );
  }
  if (pasado) return <div style={style} className="min-h-14" aria-hidden />;
  return (
    <Link
      href={agendarEn(fecha, espacio.id)}
      style={style}
      className="group flex min-h-14 items-center justify-center gap-1 rounded-lg border border-dashed border-border text-xs text-tinta-suave hover:border-tinta-suave hover:bg-superficie/60 hover:text-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foco)]"
    >
      <PlusIcon className="size-3.5 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden />
      Libre
      <span className="sr-only">
        : agendar en {espacio.nombre} el {textoDia(fecha)}
      </span>
    </Link>
  );
}

/** Computadora: la semana entera. */
export function TableroSemana({ semana, dias, hoy, conOrdenes }: Props) {
  const lunes = dias[0];
  return (
    // En una tarjeta, como el resto del panel
    <div className="tt-tarjeta-panel hidden p-3 lg:block">
      <div className="grid grid-cols-[8rem_repeat(7,minmax(0,1fr))] gap-1.5">
        <div aria-hidden />
        {dias.map((fecha, i) => {
          const esHoy = fecha === hoy;
          const cerrado = semana.diasCerrados.includes(i + 1);
          return (
            <div
              key={fecha}
              className={cn("flex items-baseline gap-1.5 rounded-lg px-2 pt-1.5 pb-1", esHoy && "bg-info-fondo text-info", cerrado && !esHoy && "text-tinta-suave")}
            >
              <span className="text-sm">{DIA_CORTO[i]}</span>
              <span className={cn("text-lg", esHoy ? "font-bold" : "font-semibold")}>{numeroDia(fecha)}</span>
              {esHoy && <span className="ml-auto text-xs font-semibold">Hoy</span>}
            </div>
          );
        })}

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
                ocupado(fecha) || !espacio.activo ? null : (
                  <DiaSinReserva
                    key={fecha}
                    fecha={fecha}
                    espacio={espacio}
                    cerrado={semana.diasCerrados.includes(i + 1)}
                    pasado={fecha < hoy}
                    style={{ gridRow, gridColumn: i + 2 }}
                  />
                ),
              )}
              {deEspacio.map((b) => (
                <Cinta key={`${b.id}-${b.inicio}`} r={b} empiezaAntes={b.empiezaAntes} terminaDespues={b.terminaDespues} conOrdenes={conOrdenes} style={{ gridRow, gridColumn: `${b.columna + 2} / span ${b.dias}` }} />
              ))}
            </section>
          );
        })}
      </div>
    </div>
  );
}

/** Celular y tableta: un día, una tarjeta por espacio. Las pestañas de los días van en la página (son enlaces). */
export function AgendaDelDia({ semana, dia, hoy, conOrdenes }: { semana: SemanaDeAgenda; dia: string; hoy: string; conOrdenes: boolean }) {
  const cerrado = semana.diasCerrados.includes(diaDeLaSemana(dia));
  return (
    <ul aria-label={`Espacios el ${textoDia(dia)}`} className="flex flex-col gap-2 lg:hidden">
      {semana.espacios.map((espacio) => {
        const r = semana.reservas.find((x) => x.espacioId === espacio.id && seCruzan({ inicio: x.inicio, fin: x.fin }, { inicio: dia, fin: dia }));
        return (
          <li key={espacio.id} className="flex flex-col gap-1">
            <h2 className="tt-titulo-sub">
              {espacio.nombre}
              {!espacio.activo && <span className="ml-2 text-xs font-normal text-tinta-suave">Desactivado</span>}
            </h2>
            {r ? (
              <Cinta r={r} empiezaAntes={r.inicio < dia} terminaDespues={r.fin > dia} conOrdenes={conOrdenes} />
            ) : cerrado ? (
              <p className={cn(CERRADO, "text-sm")}>Cerrado</p>
            ) : dia < hoy || !espacio.activo ? (
              <p className="flex min-h-14 items-center px-3 text-sm text-tinta-suave">Sin reserva</p>
            ) : (
              <Link
                href={agendarEn(dia, espacio.id)}
                className="flex min-h-14 items-center justify-between gap-3 rounded-lg border border-dashed border-border bg-fondo px-3 text-sm hover:border-tinta-suave"
              >
                <span className="text-tinta-suave">Libre</span>
                <span className="inline-flex items-center gap-1 font-semibold">
                  <PlusIcon className="size-4" aria-hidden />
                  Reservar
                  <span className="sr-only">
                    {" "}
                    en {espacio.nombre} el {textoDia(dia)}
                  </span>
                </span>
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
