import type { Route } from "next";
import Link from "next/link";
import { cn } from "cn";
import { ChevronRightIcon, PlusIcon } from "lucide-react";
import type { DatosAgenda, ReservaTablero } from "../consultas/tablero";
import { MarcaEstado } from "@/componentes/panel/marca-estado";
import { fechaConMes, sumarDias } from "@/lib/fechas";
import { conDesde } from "@/lib/volver";
import { textoIngresoAtrasado } from "@/modulos/inicio/reglas";
import { rutaTrabajo } from "@/modulos/ordenes/reglas";
import { DIA_CORTO, diaDeLaSemana, diaEnFrase, lunesDeLaSemana, NOMBRE_ESTADO_TRABAJO, numeroDia, textoDia, textoServicio, TONO_ESTADO_TRABAJO } from "../reglas";

// HU-29: la Agenda (RF-38), por día y sin horas (S-3). Rehecha el 20/11 (pedido 55, prototipo aprobado por el dueño) como
// el calendario de citas de los sistemas de talleres: solo las reservas por recibir. Lo que ya está en el taller se
// trabaja en Órdenes (su tablero) y aquí va resumido en una línea que lleva allá.
// - Celular y tableta: una sola lista desde hoy hacia adelante, sin botones de semana ni días anteriores. Cada día con su
//   fecha a la izquierda y las reservas que llegan; los días sin reservas, juntos en una línea; entre semanas, un
//   separador. Al final, "Ver más días".
// - Computadora (desde 1280 px): la semana en siete columnas con tarjetas compactas. Una reserva de varios días va el día
//   que llega, con cuántos días dura; los días siguientes la nombran en gris ("7788PQR sigue").
// Una reserva que no llegó en su día va hoy, en rojo ("Debía ingresar el 18 nov."), como en el inicio.

type Comun = {
  datos: DatosAgenda;
  hoy: string;
  /** Quien mira ve las órdenes: una reserva ya recibida lleva directo a su orden (C4). */
  conOrdenes: boolean;
  /** La Agenda: lo que se abre desde aquí vuelve ahí (pedido 43). */
  desde: string;
};

const agendarEn = (fecha: string, desde: string) => conDesde(`/panel/agenda/nueva?fecha=${fecha}` as Route, desde);
const noLlego = (r: ReservaTablero, hoy: string) => r.inicio < hoy;
/** El día en que se muestra: el de su ingreso o, si no llegó, hoy. */
const diaDe = (r: ReservaTablero, hoy: string) => (noLlego(r, hoy) ? hoy : r.inicio);
const llegan = (datos: DatosAgenda, dia: string, hoy: string) => datos.reservas.filter((r) => diaDe(r, hoy) === dia);
const siguen = (datos: DatosAgenda, dia: string, hoy: string) => datos.reservas.filter((r) => !noLlego(r, hoy) && r.inicio < dia && dia <= r.fin);
const cerradoEl = (datos: DatosAgenda, dia: string) => datos.diasCerrados.includes(diaDeLaSemana(dia));
const diasQueDura = (r: ReservaTablero) => Math.round((Date.parse(r.fin) - Date.parse(r.inicio)) / 86_400_000) + 1;
const cuantasLlegan = (n: number) => (n === 1 ? "1 llega" : `${n} llegan`);

/** La marca de una reserva: "Debía ingresar el 18 nov." en rojo si no llegó; si no, su estado. */
function Marca({ r, hoy, className }: { r: ReservaTablero; hoy: string; className?: string }) {
  const problema = textoIngresoAtrasado(r.inicio, hoy);
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

/** Lo que ya está en el taller, en una línea que lleva a Órdenes (su tablero). */
export function EnElTaller({ datos, conOrdenes }: { datos: DatosAgenda; conOrdenes: boolean }) {
  if (datos.enTaller.length === 0) return null;
  const n = datos.enTaller.length;
  const contenido = (
    <>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-semibold">En el taller: {n === 1 ? "1 auto" : `${n} autos`}</span>
        <span className="truncate text-xs text-tinta-suave">
          {datos.enTaller.map((t) => t.placa).join(", ")}
          {conOrdenes && " · se trabajan en Órdenes"}
        </span>
      </span>
      <span aria-hidden className="flex shrink-0 gap-1">
        {datos.enTaller.slice(0, 6).map((t) => (
          <MarcaEstado key={t.id} tono={TONO_ESTADO_TRABAJO[t.estado]}>
            <span className="sr-only">{NOMBRE_ESTADO_TRABAJO[t.estado]}</span>
          </MarcaEstado>
        ))}
      </span>
      {conOrdenes && <ChevronRightIcon className="size-4 shrink-0 text-tinta-suave" aria-hidden />}
    </>
  );
  const clase = "tt-tarjeta-panel flex min-h-12 items-center gap-3 px-4 py-3";
  return conOrdenes ? (
    <Link href="/panel/ordenes" className={cn(clase, "hover:bg-superficie/50")}>
      {contenido}
    </Link>
  ) : (
    <div className={clase}>{contenido}</div>
  );
}

/** Computadora: la semana en siete columnas, solo con las reservas por recibir. */
export function SemanaEnColumnas({ datos, dias, hoy, conOrdenes, desde }: Comun & { dias: string[] }) {
  return (
    <div className="hidden grid-cols-7 gap-2 xl:grid">
      {dias.map((dia, i) => {
        const del = llegan(datos, dia, hoy);
        const sig = siguen(datos, dia, hoy);
        const esHoy = dia === hoy;
        const pasado = dia < hoy;
        const cerrado = cerradoEl(datos, dia);
        return (
          <section
            key={dia}
            aria-label={textoDia(dia)}
            className={cn("tt-tarjeta-panel flex min-h-64 min-w-0 flex-col gap-1.5 p-2", pasado && "bg-fondo-panel")}
          >
            <header className={cn("mb-1 flex flex-col gap-0.5 border-b border-border px-1.5 pb-2", (pasado || cerrado) && !esHoy && "text-tinta-suave")}>
              <span className="flex items-center gap-1.5">
                <span className="text-sm">{DIA_CORTO[i]}</span>
                {/* Hoy, en negro (19/11): el azul es el de "En proceso" */}
                <span className={cn("font-bold tabular-nums", esHoy ? "grid size-8 place-items-center rounded-full bg-tinta text-base text-fondo" : "text-lg")}>{numeroDia(dia)}</span>
                {esHoy && <span className="ml-auto text-xs font-semibold text-tinta-suave">Hoy</span>}
              </span>
              {!pasado && <span className="text-xs text-tinta-suave">{cerrado ? "Cerrado" : del.length ? cuantasLlegan(del.length) : "Sin reservas"}</span>}
            </header>
            {del.map((r) => (
              <Link
                key={r.id}
                href={conDesde(rutaTrabajo(r.id, r.estado, conOrdenes), desde)}
                className={cn(
                  "flex min-w-0 flex-col gap-0.5 rounded-lg border border-l-[3px] border-border px-2.5 py-2 hover:bg-fondo-panel focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  noLlego(r, hoy) ? "border-l-peligro" : "border-l-aviso",
                )}
              >
                <span className="truncate tt-placa text-[0.9375rem]">{r.placa}</span>
                <span className="truncate text-[0.8125rem]">{r.cliente}</span>
                <Marca r={r} hoy={hoy} className="text-xs" />
                {diasQueDura(r) > 1 && <span className="text-xs text-tinta-suave">{diasQueDura(r)} días</span>}
                <span className="sr-only">{r.servicio ? `, ${textoServicio(r)}` : ""}</span>
              </Link>
            ))}
            {sig.map((r) => (
              <Link
                key={`sigue-${r.id}`}
                href={conDesde(rutaTrabajo(r.id, r.estado, conOrdenes), desde)}
                className="truncate rounded-md border border-dashed border-border px-2 py-1 text-xs text-tinta-suave hover:text-tinta"
              >
                <span className="tt-placa">{r.placa}</span> sigue
              </Link>
            ))}
            {cerrado ? (
              <p className="m-auto text-xs text-tinta-suave">El taller no abre</p>
            ) : (
              !pasado && (
                <Link
                  href={agendarEn(dia, desde)}
                  className="mt-auto flex min-h-10 items-center justify-center gap-1 rounded-lg border border-dashed border-input text-sm font-semibold text-tinta-suave hover:border-tinta-suave hover:text-tinta"
                >
                  <PlusIcon className="size-4" aria-hidden />
                  Reservar<span className="sr-only"> el {textoDia(dia)}</span>
                </Link>
              )
            )}
          </section>
        );
      })}
    </div>
  );
}

/** Tableta y celular: una sola lista desde hoy hasta `hasta`; al final, "Ver más días". */
export function ListaDesdeHoy({ datos, hoy, hasta, conOrdenes, desde, verMas }: Comun & { hasta: string; verMas: Route }) {
  const partes: React.ReactNode[] = [];
  let vacios: string[] = [];
  let semana: string | null = null;
  const cerrarVacios = () => {
    if (vacios.length === 0) return;
    const [primero, ultimo] = [vacios[0], vacios[vacios.length - 1]];
    const texto =
      vacios.length === 1 ? `${DIA_CORTO[diaDeLaSemana(primero) - 1]} ${numeroDia(primero)}` : `${DIA_CORTO[diaDeLaSemana(primero) - 1]} ${numeroDia(primero)} al ${DIA_CORTO[diaDeLaSemana(ultimo) - 1]} ${numeroDia(ultimo)}`;
    partes.push(
      <li key={`vacios-${primero}`} className="flex items-center justify-between gap-3 border-t border-border bg-fondo-panel py-2.5 pr-4 pl-[4.75rem] text-sm text-tinta-suave first:border-t-0">
        <span>{texto} · sin reservas</span>
        <Link href={agendarEn(primero, desde)} className="flex shrink-0 items-center gap-1 font-semibold hover:text-tinta">
          <PlusIcon className="size-4" aria-hidden />
          Reservar<span className="sr-only"> el {textoDia(primero)}</span>
        </Link>
      </li>,
    );
    vacios = [];
  };
  for (let dia = hoy; dia <= hasta; dia = sumarDias(dia, 1)) {
    const lunes = lunesDeLaSemana(dia);
    if (semana && lunes !== semana) {
      cerrarVacios();
      partes.push(
        <li key={`semana-${lunes}`} className="border-t border-border bg-fondo-panel px-4 py-2 text-xs font-semibold text-tinta-suave">
          Semana del {fechaConMes(lunes, hoy)}
        </li>,
      );
    }
    semana = lunes;
    if (cerradoEl(datos, dia)) {
      cerrarVacios();
      partes.push(
        <li key={dia} className="border-t border-border bg-fondo-panel py-2.5 pr-4 pl-[4.75rem] text-sm text-tinta-suave first:border-t-0">
          {/* Hoy, aunque esté cerrado, se nombra: es desde donde se lee la lista (un domingo empezaba sin "Hoy") */}
          {dia === hoy ? (
            <h2 className="font-semibold text-tinta">
              <span className="sr-only">Hoy, {textoDia(dia)}: cerrado</span>
              <span aria-hidden>Hoy, {DIA_CORTO[diaDeLaSemana(dia) - 1]} {numeroDia(dia)} · cerrado</span>
            </h2>
          ) : (
            <>
              {DIA_CORTO[diaDeLaSemana(dia) - 1]} {numeroDia(dia)} · cerrado
            </>
          )}
        </li>,
      );
      continue;
    }
    const del = llegan(datos, dia, hoy);
    // Hoy va siempre en su renglón, aunque no llegue nadie: es desde donde se lee la lista
    if (del.length === 0 && dia !== hoy) {
      vacios.push(dia);
      continue;
    }
    cerrarVacios();
    const esHoy = dia === hoy;
    partes.push(
      <li key={dia} className="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-3 border-t border-border px-4 py-3 first:border-t-0">
        <span className="flex flex-col items-center gap-0.5 pt-0.5" aria-hidden>
          <span className="text-[0.6875rem] font-semibold tracking-wide text-tinta-suave uppercase">{esHoy ? "Hoy" : DIA_CORTO[diaDeLaSemana(dia) - 1]}</span>
          <span className={cn("grid size-9 place-items-center rounded-full text-xl font-bold tabular-nums", esHoy && "bg-tinta text-fondo")}>{numeroDia(dia)}</span>
        </span>
        <section aria-labelledby={`dia-${dia}`} className="flex min-w-0 flex-col">
          <h2 id={`dia-${dia}`} className="sr-only">
            {esHoy ? `Hoy, ${textoDia(dia)}` : textoDia(dia)}
          </h2>
          {del.length === 0 && <p className="py-2 text-sm text-tinta-suave">Sin reservas</p>}
          <ul className="flex flex-col divide-y divide-dashed divide-border empty:hidden">
            {del.map((r) => (
              <li key={r.id}>
                <Link
                  href={conDesde(rutaTrabajo(r.id, r.estado, conOrdenes), desde)}
                  className="grid grid-cols-[4px_minmax(0,1fr)] gap-2.5 py-2 hover:bg-fondo-panel"
                >
                  <span aria-hidden className={cn("rounded-full", noLlego(r, hoy) ? "bg-peligro" : "bg-aviso")} />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="flex items-center justify-between gap-2">
                      <span className="tt-placa">{r.placa}</span>
                      <Marca r={r} hoy={hoy} className="text-sm" />
                    </span>
                    <span className="truncate text-sm text-tinta-media">
                      {r.cliente}
                      {r.servicio && ` · ${textoServicio(r)}`}
                    </span>
                    {diasQueDura(r) > 1 && (
                      <span className="text-xs text-tinta-suave">
                        {diasQueDura(r)} días, hasta el {diaEnFrase(r.fin)}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link href={agendarEn(dia, desde)} className="flex items-center gap-1 pt-1.5 text-sm font-semibold text-tinta-suave hover:text-tinta">
            <PlusIcon className="size-4" aria-hidden />
            Reservar {esHoy ? "hoy" : "este día"}
            <span className="sr-only"> ({textoDia(dia)})</span>
          </Link>
        </section>
      </li>,
    );
  }
  cerrarVacios();
  return (
    <div className="flex flex-col gap-3 xl:hidden">
      <ol aria-label="Reservas desde hoy" className="tt-tarjeta-panel overflow-hidden">
        {partes}
      </ol>
      <Link href={verMas} className="flex min-h-11 items-center justify-center text-sm font-semibold text-tinta-suave hover:text-tinta">
        Ver más días
      </Link>
    </div>
  );
}
