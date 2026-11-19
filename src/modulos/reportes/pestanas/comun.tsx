import "server-only";
import type { Route } from "next";
import { cn } from "cn";
import type { LucideIcon } from "lucide-react";
import { TarjetaNumero } from "@/componentes/panel/tarjeta-numero";
import { hastaLaHora, horasConMovimiento, indicadores, porTramo, type Indicadores, type PuntoDelTramo } from "../calculos";
import { datosEntre, ordenDeServicios, primerasEntregas, type DatosDelPeriodo } from "../datos";
import { POR_UNIDAD, tramosDe, tramosPorHora, type Periodo, type Tramo, type UnidadTramo } from "../reglas";
import type { PuntoSerie } from "../componentes/graficos";

// Lo que comparten las cinco pestañas de Reportes v2 (19/11): los datos del período y del anterior, los indicadores,
// los tramos de los gráficos y las piezas de la pantalla (las tarjetas de número, el cambio, el vacío).

export type Pestana = "resumen" | "ingresos" | "gastos" | "taller" | "clientes";

export type Cargado = {
  periodo: Periodo;
  hoy: string;
  /** Lo de las fechas y lo del anterior (con "Hoy", cortado a la misma hora). */
  datos: DatosDelPeriodo;
  antes: DatosDelPeriodo;
  act: Indicadores;
  ant: Indicadores;
  unidad: UnidadTramo;
  tramos: Tramo[];
  puntos: PuntoDelTramo[];
  /** "por día", "por hora"…: lo que va en el título de un gráfico. */
  por: string;
  /** El lugar de cada servicio en el catálogo: su color fijo. */
  ordenServicios: Map<number, number>;
  /** El enlace a otra pestaña con las mismas fechas. */
  enlace: (p: Pestana) => Route;
};

/** Trae y calcula lo de unas fechas y lo del período anterior equivalente, una vez por pantalla. */
export async function cargar(periodo: Periodo, hoy: string, enlace: (p: Pestana) => Route): Promise<Cargado> {
  const [datos, antesEntero, ordenServicios] = await Promise.all([datosEntre(periodo.inicio, periodo.fin), datosEntre(periodo.antes.inicio, periodo.antes.fin), ordenDeServicios()]);
  const antes = hastaLaHora(antesEntero, periodo.hastaHora);
  const clientes = [...new Set([...datos.ordenes, ...antes.ordenes].map((o) => o.clienteId))];
  const primeras = await primerasEntregas(clientes);
  const esHoy = periodo.clave === "hoy";
  let unidad: UnidadTramo;
  let tramos: Tramo[];
  if (esHoy) {
    const horas = horasConMovimiento(datos, periodo.hastaHora ?? "23:59");
    unidad = "hora";
    tramos = horas ? tramosPorHora(periodo.inicio, horas[0], horas[1]) : [];
  } else {
    ({ unidad, tramos } = tramosDe(periodo.inicio, periodo.fin));
  }
  return {
    periodo,
    hoy,
    datos,
    antes,
    act: indicadores(datos, periodo.inicio, periodo.fin, primeras),
    ant: indicadores(antes, periodo.antes.inicio, periodo.antes.fin, primeras),
    unidad,
    tramos,
    puntos: porTramo(datos, tramos, esHoy),
    por: POR_UNIDAD[unidad],
    ordenServicios,
    enlace,
  };
}

/** Los puntos de un gráfico: el tramo y sus valores, en el orden de las series. */
export function puntosDe(c: Cargado, valores: (p: PuntoDelTramo) => number[]): PuntoSerie[] {
  return c.tramos.map((t, i) => ({ corto: t.corto, nombre: t.nombre, valores: valores(c.puntos[i]) }));
}

/** El color fijo de un servicio por su lugar en el catálogo; "Otros", gris. */
export function colorDeServicio(c: Cargado, servicioId: number | null): string {
  const lugar = servicioId === null ? undefined : c.ordenServicios.get(servicioId);
  return lugar === undefined ? "var(--grafico-otros)" : `var(--grafico-servicio-${(lugar % 8) + 1})`;
}

/** El cambio en %: null sin anterior con qué comparar (o con uno en cero o negativo). */
export const cambioDe = (act: number, ant: number) => (ant > 0 ? Math.round(((act - ant) / ant) * 100) : null);

/** El cambio frente al período anterior, para la nota de una tarjeta: "▲ 12 % vs. oct.", verde si es bueno y rojo si es malo. */
export function Cambio(props: { cambio: number | null; contra: string; subirEsMalo?: boolean; unidad?: string; sinCambio?: string }) {
  const { cambio, contra, subirEsMalo, unidad = "%", sinCambio } = props;
  if (cambio === null) return <>{sinCambio ?? "Sin datos para comparar"}</>;
  const bueno = cambio === 0 ? null : subirEsMalo ? cambio < 0 : cambio > 0;
  return (
    <>
      <span className={cn("font-semibold", bueno === null ? "text-tinta-suave" : bueno ? "text-exito" : "text-peligro")}>
        {cambio > 0 ? "▲" : cambio < 0 ? "▼" : "="} {Math.abs(cambio)} {unidad}
      </span>{" "}
      {contra}
    </>
  );
}

export type Indicador = { icono: LucideIcon; titulo: string; valor: string; nota: React.ReactNode; href?: Route };

/** Los indicadores de la pestaña: de a dos en el celular, todos en una fila en la computadora. */
export function Indicadores({ etiqueta, items }: { etiqueta: string; items: Indicador[] }) {
  return (
    <section aria-label={etiqueta} className={cn("grid grid-cols-2 gap-3", items.length === 3 ? "lg:grid-cols-3 [&>*:last-child]:max-lg:col-span-2" : "lg:grid-cols-4")}>
      {items.map((i) => (
        <TarjetaNumero key={i.titulo} icono={i.icono} titulo={i.titulo} valor={i.valor} nota={i.nota} href={i.href} />
      ))}
    </section>
  );
}

/** Sin datos para un gráfico: qué falta, en una línea. */
export function SinDatos({ children }: { children: React.ReactNode }) {
  return <p className="py-10 text-center text-sm text-tinta-suave">{children}</p>;
}

/** "2,1 días". */
export const textoDias = (d: number) => `${String(Math.round(d * 10) / 10).replace(".", ",")} ${d === 1 ? "día" : "días"}`;

/** "45 %" de una parte sobre un total (0 sin total). */
export const porciento = (parte: number, total: number) => (total > 0 ? Math.round((parte / total) * 100) : 0);
