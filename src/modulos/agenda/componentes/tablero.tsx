import type { Route } from "next";
import Link from "next/link";
import { cn } from "cn";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "lucide-react";
import type { ReservaTablero, SemanaDeAgenda } from "../consultas";
import { bloquesDeLaSemana, DIA_CORTO, diaDeLaSemana, numeroDia, seCruzan, textoDia } from "../reglas";

// HU-29: el tablero de la agenda (RF-38). Una fila por espacio y una columna por día (S-3: por día, sin horas). Cada
// reserva es una cinta negra con el borde cortado a 60° que abarca sus días; si sigue desde la semana anterior o hacia la
// siguiente, el borde va recto y lo dice. Un día libre se toca para agendar ahí; uno cerrado va rayado y lo dice.
// En el celular, un día a la vez (AgendaDelDia): sin desplazarse de lado.
// Todo es texto y enlaces: se lee igual con lector de pantalla, sin depender del color.

type Props = { semana: SemanaDeAgenda; dias: string[]; hoy: string };

const agendarEn = (fecha: string, espacioId: number) => `/panel/agenda/nueva?fecha=${fecha}&espacio=${espacioId}` as Route;

function textoFechas(r: ReservaTablero) {
  return r.inicio === r.fin ? textoDia(r.inicio) : `${textoDia(r.inicio)} al ${textoDia(r.fin)}`;
}

/** Placa, servicio y técnico: lo que dice la cinta. */
function Cinta({ r, empiezaAntes, terminaDespues, className, style }: { r: ReservaTablero; empiezaAntes: boolean; terminaDespues: boolean; className?: string; style?: React.CSSProperties }) {
  return (
    <Link
      href={`/panel/agenda/${r.id}`}
      style={style}
      className={cn(
        "relative flex min-h-14 min-w-0 flex-col justify-center gap-0.5 bg-negro py-1.5 pr-3 text-blanco hover:bg-negro/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foco)]",
        empiezaAntes ? "pl-3" : "tt-cinta",
        className,
      )}
    >
      <span className="flex items-baseline gap-2">
        {empiezaAntes && <ChevronLeftIcon className="size-3.5 shrink-0 self-center" aria-hidden />}
        <span className="truncate font-heading text-xl leading-none font-bold italic">{r.placa}</span>
        {terminaDespues && <ChevronRightIcon className="ml-auto size-3.5 shrink-0 self-center" aria-hidden />}
      </span>
      {r.servicio && (
        <span className="truncate text-xs">
          {r.servicio}
          {r.masServicios > 0 && ` y ${r.masServicios} más`}
        </span>
      )}
      <span className="truncate text-xs text-blanco/75">{r.tecnico ?? r.cliente}</span>
      <span className="sr-only">
        , {textoFechas(r)}
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
      <div style={style} className="tt-cerrado flex min-h-14 items-center justify-center text-xs text-tinta-suave">
        {/* Con fondo propio: sobre el rayado no se leía */}
        <span className="bg-superficie px-1.5 py-0.5">Cerrado</span>
      </div>
    );
  }
  if (pasado) return <div style={style} className="min-h-14" aria-hidden />;
  return (
    <Link
      href={agendarEn(fecha, espacio.id)}
      style={style}
      className="group flex min-h-14 items-center justify-center gap-1 border border-dashed border-border text-xs text-tinta-suave hover:border-tinta hover:text-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foco)]"
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
export function TableroSemana({ semana, dias, hoy }: Props) {
  const lunes = dias[0];
  return (
    <div className="hidden md:block">
      <div className="grid grid-cols-[8rem_repeat(7,minmax(0,1fr))] gap-1.5">
        <div aria-hidden />
        {dias.map((fecha, i) => {
          const esHoy = fecha === hoy;
          const cerrado = semana.diasCerrados.includes(i + 1);
          return (
            <div key={fecha} className={cn("flex items-baseline gap-1.5 border-t-2 px-1 pt-1.5 pb-1", esHoy ? "border-rojo" : "border-transparent", cerrado && "text-tinta-suave")}>
              <span className="text-sm">{DIA_CORTO[i]}</span>
              <span className={cn("text-lg", esHoy ? "font-bold" : "font-semibold")}>{numeroDia(fecha)}</span>
              {esHoy && <span className="ml-auto text-xs font-semibold text-rojo-texto">Hoy</span>}
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
              <h2 style={{ gridRow, gridColumn: 1 }} className="flex items-center font-heading text-xl font-bold italic">
                {espacio.nombre}
              </h2>
              {dias.map((fecha, i) =>
                ocupado(fecha) ? null : (
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
                <Cinta key={b.id} r={b} empiezaAntes={b.empiezaAntes} terminaDespues={b.terminaDespues} style={{ gridRow, gridColumn: `${b.columna + 2} / span ${b.dias}` }} />
              ))}
            </section>
          );
        })}
      </div>
    </div>
  );
}

/** Celular: un día, una tarjeta por espacio. Las pestañas de los días van en la página (son enlaces). */
export function AgendaDelDia({ semana, dia, hoy }: { semana: SemanaDeAgenda; dia: string; hoy: string }) {
  const cerrado = semana.diasCerrados.includes(diaDeLaSemana(dia));
  return (
    <ul aria-label={`Espacios el ${textoDia(dia)}`} className="flex flex-col gap-2 md:hidden">
      {semana.espacios.map((espacio) => {
        const r = semana.reservas.find((x) => x.espacioId === espacio.id && seCruzan({ inicio: x.inicio, fin: x.fin }, { inicio: dia, fin: dia }));
        return (
          <li key={espacio.id} className="flex flex-col gap-1">
            <h2 className="font-heading text-lg font-bold italic">{espacio.nombre}</h2>
            {r ? (
              <Cinta r={r} empiezaAntes={r.inicio < dia} terminaDespues={r.fin > dia} />
            ) : cerrado ? (
              <p className="tt-cerrado flex min-h-14 items-center justify-center text-sm text-tinta-suave">
                <span className="bg-superficie px-1.5 py-0.5">Cerrado</span>
              </p>
            ) : dia < hoy ? (
              <p className="flex min-h-14 items-center px-3 text-sm text-tinta-suave">Sin reserva</p>
            ) : (
              <Link
                href={agendarEn(dia, espacio.id)}
                className="flex min-h-14 items-center justify-between gap-3 border border-dashed border-border px-3 text-sm hover:border-tinta"
              >
                <span className="text-tinta-suave">Libre</span>
                <span className="inline-flex items-center gap-1 font-semibold">
                  <PlusIcon className="size-4" aria-hidden />
                  Agendar
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
