import type { Route } from "next";
import Link from "next/link";
import { cn } from "cn";
import { ChevronRightIcon, PlusIcon } from "lucide-react";
import type { ReservaTablero, SemanaDeAgenda } from "../consultas/tablero";
import { MarcaEstado } from "@/componentes/panel/marca-estado";
import { cantidad } from "@/lib/cantidad";
import { conDesde } from "@/lib/volver";
import { textoEntregaAtrasada, textoIngresoAtrasado } from "@/modulos/inicio/reglas";
import { rutaTrabajo } from "@/modulos/ordenes/reglas";
import { DIA_CORTO, diaDeLaSemana, diaEnFrase, NOMBRE_ESTADO_TRABAJO, numeroDia, ocupaLugar, seCruzan, textoDia, textoServicio, tituloDia, TONO_ESTADO_TRABAJO } from "../reglas";

// HU-29: la Agenda (RF-38), por día y sin horas (S-3). Rehecha el 20/11 (pedido 55, a pedido del dueño): sin espacios ni
// límite por día, y con el diseño de las agendas de uso diario:
// - Computadora (desde 1280 px): la semana en siete columnas; cada día dice cuántos autos tiene y sus reservas van en
//   tarjetas compactas apiladas (placa, cliente y estado), sin filas ni barras. Las de varios días van en cada día que
//   ocupan, con "Día 2 de 3".
// - Tableta y celular: una lista que empieza hoy, día por día ("Hoy, jueves 20", "Mañana, viernes 21"): se baja con el
//   dedo y se ve la semana sin tocar nada (antes, una tira de siete días que había que tocar de a uno). Una reserva de
//   varios días va entera el primer día que se ve; los siguientes la nombran en una línea ("Siguen en el taller").
// Las entregadas no se muestran salvo con "Ver entregadas" (llenaban la semana; la historia está en Órdenes). Un problema
// va en rojo en lugar del estado: "Atrasada desde el 18 nov." o "Debía ingresar el 7 nov.", como en el inicio. Todo es
// texto y enlaces: se lee igual con lector de pantalla.

type Props = {
  semana: SemanaDeAgenda;
  dias: string[];
  hoy: string;
  /** Quien mira ve las órdenes: una reserva ya recibida lleva directo a su orden (C4). */
  conOrdenes: boolean;
  /** La Agenda con su semana: lo que se abre desde aquí vuelve ahí (pedido 43). */
  desde: string;
};

const agendarEn = (fecha: string, desde: string) => conDesde(`/panel/agenda/nueva?fecha=${fecha}` as Route, desde);

/** Las reservas de un día: primero las que siguen en curso, por el día en que entraron. */
const delDia = (semana: SemanaDeAgenda, dia: string) =>
  semana.reservas
    .filter((r) => seCruzan(r, { inicio: dia, fin: dia }))
    .sort((a, b) => Number(ocupaLugar(b.estado)) - Number(ocupaLugar(a.estado)) || (a.inicio < b.inicio ? -1 : a.inicio > b.inicio ? 1 : a.id - b.id));

const cerradoEl = (semana: SemanaDeAgenda, dia: string) => semana.diasCerrados.includes(diaDeLaSemana(dia));

/** "3 autos", "Sin reservas" o "Cerrado": lo que dice cada día arriba de sus reservas. */
function textoDelDia(semana: SemanaDeAgenda, dia: string, cuantas: number): string {
  if (cuantas === 0) return cerradoEl(semana, dia) ? "Cerrado" : "Sin reservas";
  return cantidad(semana.autos[dia] || cuantas, "auto", "autos");
}

/** "Día 2 de 3" en una reserva de varios días, o nada. Una atrasada no lo lleva: ya lo dice su marca. */
function diaDeVarios(r: ReservaTablero, dia: string, hoy: string): string | null {
  if (r.inicio === r.entrega || r.entrega < hoy) return null;
  const total = Math.round((Date.parse(r.entrega) - Date.parse(r.inicio)) / 86_400_000) + 1;
  const n = Math.round((Date.parse(dia) - Date.parse(r.inicio)) / 86_400_000) + 1;
  return `Día ${n} de ${total}`;
}

/** La marca de una reserva: el problema en su color (como en el inicio) o, si no hay, su estado. */
function Marca({ r, hoy, className }: { r: ReservaTablero; hoy: string; className?: string }) {
  const problema = textoEntregaAtrasada({ estado: r.estado, fechaFin: r.entrega }, hoy) ?? (r.estado === "agendado" ? textoIngresoAtrasado(r.inicio, hoy) : null);
  if (problema)
    return (
      <MarcaEstado tono="peligro" problema className={className}>
        {problema}
      </MarcaEstado>
    );
  return (
    <MarcaEstado tono={TONO_ESTADO_TRABAJO[r.estado]} className={className}>
      {NOMBRE_ESTADO_TRABAJO[r.estado]}
    </MarcaEstado>
  );
}

/** "+ Reservar" de un día que viene: lleva a Nueva reserva con ese día puesto. */
function Reservar({ fecha, desde, className, conTexto }: { fecha: string; desde: string; className?: string; conTexto?: string }) {
  return (
    <Link href={agendarEn(fecha, desde)} className={cn("flex items-center gap-1 text-sm font-semibold text-tinta-suave hover:text-tinta", className)}>
      {conTexto && <span className="mr-auto font-normal">{conTexto}</span>}
      <PlusIcon className="size-4" aria-hidden />
      Reservar
      <span className="sr-only"> el {textoDia(fecha)}</span>
    </Link>
  );
}

/** Computadora: la semana en siete columnas. */
export function SemanaEnColumnas({ semana, dias, hoy, conOrdenes, desde }: Props) {
  return (
    <div className="hidden grid-cols-7 gap-2 xl:grid">
      {dias.map((dia, i) => {
        const del = delDia(semana, dia);
        const esHoy = dia === hoy;
        const pasado = dia < hoy;
        const cerrado = cerradoEl(semana, dia);
        return (
          <section key={dia} aria-label={tituloDia(dia, hoy)} className={cn("flex min-w-0 flex-col gap-2 rounded-xl p-2", pasado ? "bg-fondo-panel" : "bg-superficie/60")}>
            <header className={cn("flex flex-col gap-0.5 px-1.5 pt-1", (pasado || cerrado) && !esHoy && "text-tinta-suave")}>
              <span className="flex items-center gap-1.5">
                <span className="text-sm">{DIA_CORTO[i]}</span>
                {/* Hoy, en negro (19/11): el azul es el de "En proceso" */}
                <span className={cn("font-bold tabular-nums", esHoy ? "grid size-8 place-items-center rounded-full bg-tinta text-base text-fondo" : "text-lg")}>{numeroDia(dia)}</span>
                {esHoy && <span className="ml-auto text-xs font-semibold text-tinta-suave">Hoy</span>}
              </span>
              <span className="text-xs text-tinta-suave">{textoDelDia(semana, dia, del.length)}</span>
            </header>
            {del.length > 0 && (
              <ul aria-label={`Reservas el ${textoDia(dia)}`} className="flex flex-col gap-1.5">
                {del.map((r) => {
                  const enCurso = diaDeVarios(r, dia, hoy);
                  return (
                    <li key={r.id}>
                      <Link
                        href={conDesde(rutaTrabajo(r.id, r.estado, conOrdenes), desde)}
                        data-tono={TONO_ESTADO_TRABAJO[r.estado] ?? "neutro"}
                        className={cn(
                          "tt-tarjeta-panel flex flex-col gap-0.5 px-2.5 py-2 hover:bg-fondo-panel focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                          r.estado === "entregado" && "opacity-70",
                        )}
                      >
                        <span className="truncate tt-placa text-[0.9375rem]">{r.placa}</span>
                        <span className="truncate text-[0.8125rem]">{r.cliente}</span>
                        <Marca r={r} hoy={hoy} className="text-xs" />
                        {enCurso && <span className="text-xs text-tinta-suave">{enCurso}</span>}
                        <span className="sr-only">{r.servicio ? `, ${textoServicio(r)}` : ""}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
            {!pasado && !cerrado && (
              <Reservar
                fecha={dia}
                desde={desde}
                className="min-h-11 justify-center rounded-lg border border-dashed border-input hover:border-tinta-suave hover:bg-fondo"
              />
            )}
            {cerrado && del.length === 0 && <p className="px-1.5 text-xs text-tinta-suave">El taller no abre.</p>}
          </section>
        );
      })}
    </div>
  );
}

/** Tableta y celular: la semana como lista por día, desde hoy. */
export function SemanaEnLista({ semana, dias, hoy, conOrdenes, desde }: Props) {
  // Si la semana es la de hoy, empieza en hoy: los días que ya pasaron van plegados arriba (19/11)
  const pasados = dias.filter((d) => d < hoy);
  const desdeHoy = dias.filter((d) => d >= hoy);
  const dia = (fecha: string, primero: boolean) => <DiaEnLista key={fecha} fecha={fecha} primero={primero} semana={semana} hoy={hoy} conOrdenes={conOrdenes} desde={desde} />;
  return (
    <div className="flex flex-col gap-5 xl:hidden">
      {pasados.length > 0 && desdeHoy.length > 0 && (
        <details className="group">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-sm font-semibold text-tinta-suave hover:text-tinta [&::-webkit-details-marker]:hidden">
            <ChevronRightIcon className="size-4 transition-transform group-open:rotate-90" aria-hidden />
            {pasados.length === 1 ? "Ver el día anterior" : `Ver los ${pasados.length} días anteriores`}
          </summary>
          <div className="mt-3 flex flex-col gap-5">{pasados.map((d, n) => dia(d, n === 0))}</div>
        </details>
      )}
      {(desdeHoy.length > 0 && pasados.length > 0 ? desdeHoy : dias).map((d, n) => dia(d, n === 0))}
    </div>
  );
}

/**
 * Un día de la lista. Una reserva que viene de un día anterior (de varios días) va completa solo en el primer día que se
 * ve; en los demás, la nombra una línea "Siguen en el taller: 4567BDF y 2468KLM" (19/11: se repetía entera cada día).
 * Un día que viene, con "+ Reservar" al final; sin reservas, en un solo renglón.
 */
function DiaEnLista({ fecha, primero, semana, hoy, conOrdenes, desde }: { fecha: string; primero: boolean; semana: SemanaDeAgenda; hoy: string; conOrdenes: boolean; desde: string }) {
  const cerrado = cerradoEl(semana, fecha);
  const del = delDia(semana, fecha);
  const siguen = primero ? [] : del.filter((r) => r.inicio < fecha);
  const nuevas = primero ? del : del.filter((r) => r.inicio >= fecha);
  const conReservar = fecha >= hoy && !cerrado;
  const esHoy = fecha === hoy;
  return (
    <section aria-label={tituloDia(fecha, hoy)} className="flex flex-col gap-2">
      <header className="flex items-baseline justify-between gap-3">
        <h2 className={cn("tt-titulo-sub", !esHoy && (cerrado || fecha < hoy) && "text-tinta-suave")}>{tituloDia(fecha, hoy)}</h2>
        {del.length > 0 && <span className="text-sm text-tinta-suave">{textoDelDia(semana, fecha, del.length)}</span>}
      </header>
      <div className={cn("tt-tarjeta-panel overflow-hidden", fecha < hoy && "bg-fondo-panel/60")}>
        {nuevas.length > 0 && (
          <ul aria-label={`Reservas el ${textoDia(fecha)}`}>
            {nuevas.map((r, n) => {
              const servicio = textoServicio(r);
              const tramo = r.inicio === r.fin ? null : fecha < r.fin ? `Hasta el ${diaEnFrase(r.fin)}` : null;
              return (
                <li key={r.id} className={cn(n > 0 && "border-t border-border")}>
                  <Link
                    href={conDesde(rutaTrabajo(r.id, r.estado, conOrdenes), desde)}
                    data-tono={TONO_ESTADO_TRABAJO[r.estado] ?? "neutro"}
                    className={cn("flex flex-col gap-0.5 px-4 py-3 hover:bg-fondo-panel", r.estado === "entregado" && "opacity-70")}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="tt-placa text-base">{r.placa}</span>
                      <Marca r={r} hoy={hoy} className="text-sm" />
                    </span>
                    <span className="truncate text-sm">
                      <span className="font-medium">{r.cliente}</span>
                      {servicio && <span className="text-tinta-media"> · {servicio}</span>}
                    </span>
                    {tramo && <span className="text-xs text-tinta-suave">{tramo}</span>}
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
        {conReservar ? (
          <Reservar
            fecha={fecha}
            desde={desde}
            conTexto={del.length === 0 ? "Sin reservas" : undefined}
            className={cn("min-h-12 px-4", del.length > 0 && "border-t border-border")}
          />
        ) : (
          del.length === 0 && <p className="px-4 py-3 text-sm text-tinta-suave">{cerrado ? "Cerrado" : "Sin reservas"}</p>
        )}
      </div>
    </section>
  );
}
