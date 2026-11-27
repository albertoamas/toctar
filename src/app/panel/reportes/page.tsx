import type { Metadata, Route } from "next";
import { Suspense } from "react";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { PaginaPanel } from "@/componentes/panel/pagina-panel";
import { Pestanas } from "@/componentes/panel/pestanas";
import { fechaEnBolivia, sumarDias } from "@/lib/fechas";
import { exigirModulo } from "@/lib/sesion";
import { SelectorPeriodo } from "@/modulos/reportes/componentes/selector-periodo";
import { Clientes } from "@/modulos/reportes/pestanas/clientes";
import { cargar, type Pestana } from "@/modulos/reportes/pestanas/comun";
import { Gastos } from "@/modulos/reportes/pestanas/gastos";
import { Ingresos } from "@/modulos/reportes/pestanas/ingresos";
import { Resumen } from "@/modulos/reportes/pestanas/resumen";
import { Taller } from "@/modulos/reportes/pestanas/taller";
import { diaYMes, parametrosDelPeriodo, periodoDe, type ClavePeriodo, type Periodo } from "@/modulos/reportes/reglas";

export const metadata: Metadata = { title: "Reportes" };

// Reportes v2 (19/11, prototipo aprobado; antes: pedido 16, P16-reportes-y-gastos.md). Cinco pestañas (?vista=) para
// las fechas elegidas (?periodo=): Resumen, Ingresos, Gastos, Taller y Clientes. Todo sale de los mismos datos del
// período (modulos/reportes/datos.ts y calculos.ts) y se compara con el período anterior equivalente. Lo cobrado es lo
// que entró (pagos y adelantos sin anular), no lo vendido. Solo el dueño.

const VISTAS = ["resumen", "ingresos", "gastos", "taller", "clientes"] as const satisfies readonly Pestana[];
const NOMBRE_VISTA: Record<Pestana, string> = { resumen: "Resumen", ingresos: "Ingresos", gastos: "Gastos", taller: "Taller", clientes: "Clientes" };

/** Las opciones de fechas, de la más corta a la más larga ("Elegir fechas" va aparte, en el selector). */
const OPCIONES_PERIODO: { clave: Exclude<ClavePeriodo, "rango">; texto: string }[] = [
  { clave: "hoy", texto: "Hoy" },
  { clave: "semana", texto: "Esta semana" },
  { clave: "mes", texto: "Este mes" },
  { clave: "mes-pasado", texto: "Mes pasado" },
  { clave: "6-meses", texto: "Últimos 6 meses" },
];

/** La hora en Bolivia (HH:MM): hasta dónde se compara "Hoy" con el mismo día de la semana pasada. */
const horaEnBolivia = () => new Intl.DateTimeFormat("es-BO", { timeZone: "America/La_Paz", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date());

/** "1 sep": lo que dice el selector con un rango elegido. */
const corta = (fecha: string) => diaYMes(fecha).replace(/ de (\p{L}{3})\p{L}*$/u, " $1");

export default function PaginaReportes({ searchParams }: PageProps<"/panel/reportes">) {
  return (
    <PaginaPanel tipo="lista">
      <Suspense fallback={<Cargando filas={4} />}>
        <Contenido searchParams={searchParams} />
      </Suspense>
    </PaginaPanel>
  );
}

async function Contenido({ searchParams }: Pick<PageProps<"/panel/reportes">, "searchParams">) {
  await exigirModulo("reportes");
  const parametros = await searchParams;
  const hoy = fechaEnBolivia();
  const periodo = periodoDe(parametros, hoy, horaEnBolivia());
  const vista: Pestana = VISTAS.includes(parametros.vista as Pestana) ? (parametros.vista as Pestana) : "resumen";
  // Las direcciones: la pestaña y el período (con sus fechas, si es un rango); lo de siempre, sin parámetros
  const enlace = (v: Pestana, clave: ClavePeriodo = periodo.clave) => {
    const elegido = clave === periodo.clave ? periodo : { clave, inicio: sumarDias(hoy, -29), fin: hoy };
    const p = new URLSearchParams([...(v !== "resumen" ? [["vista", v] as [string, string]] : []), ...parametrosDelPeriodo(elegido)]);
    const texto = p.toString();
    return `/panel/reportes${texto ? `?${texto}` : ""}` as Route;
  };
  return (
    <>
      <EncabezadoPagina titulo="Reportes">
        {periodo.titulo} · {periodo.comparacion}
      </EncabezadoPagina>
      <SelectorPeriodo
        opciones={OPCIONES_PERIODO.map((o) => ({ clave: o.clave, texto: o.texto, href: enlace(vista, o.clave) }))}
        activa={periodo.clave}
        texto={periodo.clave === "rango" ? `${corta(periodo.inicio)} – ${corta(periodo.fin)}` : (OPCIONES_PERIODO.find((o) => o.clave === periodo.clave)?.texto ?? "")}
        vista={vista === "resumen" ? null : vista}
        desde={periodo.inicio}
        hasta={periodo.fin}
        hoy={hoy}
      />
      <Pestanas etiqueta="Partes de los reportes" activa={enlace(vista)} pestanas={VISTAS.map((v) => ({ href: enlace(v), texto: NOMBRE_VISTA[v] }))} />
      {/* Cada pestaña espera sus datos; el encabezado, el selector y las pestañas ya están a la vista */}
      <Suspense key={`${vista}-${periodo.clave}-${periodo.inicio}-${periodo.fin}`} fallback={<Cargando filas={3} />}>
        <PestanaElegida vista={vista} periodo={periodo} hoy={hoy} enlaces={Object.fromEntries(VISTAS.map((v) => [v, enlace(v)])) as Record<Pestana, Route>} />
      </Suspense>
      <p className="text-xs text-tinta-suave">Ingresos: lo cobrado (pagos y adelantos), no lo vendido. Los anulados no cuentan.</p>
    </>
  );
}

async function PestanaElegida({ vista, periodo, hoy, enlaces }: { vista: Pestana; periodo: Periodo; hoy: string; enlaces: Record<Pestana, Route> }) {
  const c = await cargar(periodo, hoy, (v) => enlaces[v]);
  if (vista === "ingresos") return <Ingresos c={c} />;
  if (vista === "gastos") return <Gastos c={c} />;
  if (vista === "taller") return <Taller c={c} />;
  if (vista === "clientes") return <Clientes c={c} />;
  return <Resumen c={c} />;
}
