import type { Metadata, Route } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { cn } from "cn";
import { BanknoteIcon, BellRingIcon, CalculatorIcon, CarFrontIcon, ChartPieIcon, FileCheckIcon, UsersIcon, ChevronRightIcon, HandCoinsIcon, PercentIcon, PiggyBankIcon, ReceiptTextIcon } from "lucide-react";
import { Seccion } from "@/componentes/panel/cabecera-seccion";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { Filtros } from "@/componentes/panel/filtros";
import { PaginaPanel } from "@/componentes/panel/pagina-panel";
import { Pestanas } from "@/componentes/panel/pestanas";
import { TarjetaNumero } from "@/componentes/panel/tarjeta-numero";
import { cantidad } from "@/lib/cantidad";
import { fechaEnBolivia, sumarDias } from "@/lib/fechas";
import { exigirModulo } from "@/lib/sesion";
import { NOMBRE_MOTIVO } from "@/modulos/cotizaciones/reglas";
import { saldosPendientes } from "@/modulos/pagos/consultas";
import { NOMBRE_METODO } from "@/modulos/pagos/reglas";
import { ElegirFechas } from "@/modulos/reportes/componentes/elegir-fechas";
import { BarrasHorizontales } from "@/modulos/reportes/componentes/barras-horizontales";
import { GraficoAcumulado, type DiaAcumulado } from "@/modulos/reportes/componentes/grafico-acumulado";
import { GraficoClientes } from "@/modulos/reportes/componentes/grafico-clientes";
import { GraficoIngresosGastos, TortaNeto } from "@/modulos/reportes/componentes/graficos-resumen";
import { RegistrarGasto } from "@/modulos/reportes/componentes/registrar-gasto";
import {
  categoriasActivas,
  elTallerEntre,
  entregasHasta,
  entregadosEntre,
  gastosEntre,
  ingresosEntre,
  totalesEntre,
} from "@/modulos/reportes/consultas";
import { acumuladoDesde, bsRedondo, parametrosDelPeriodo, primerDiaDeGastos, clientesPorTramo, POR_UNIDAD, sumarPorTramo, tramosDe, cambioPorcentual, comparacionDelAcumulado, diaYMes, diasEntre, mesDe, periodoDe, sumarMeses, tituloMes, type ClavePeriodo, type Periodo } from "@/modulos/reportes/reglas";

export const metadata: Metadata = { title: "Reportes" };

// Pedido 16 (P16-reportes-y-gastos.md; prototipo aprobado el 16/11 con la opción A, registro-de-cambios.md): cuatro
// pestañas (?vista=) para las fechas elegidas (?periodo=, 17/11): Resumen (lo neto en una torta y los 6 meses en barras
// con la línea de la ganancia), Ingresos (cómo van frente al período anterior y por forma de pago), Gastos (el reporte:
// cómo van y por categoría; la lista de gastos es su propia pantalla) y Taller y clientes (entregados, servicios,
// cotizaciones, clientes y mantenimientos). Solo el dueño. Lo que entró sale de los pagos sin anular, por su día; lo que
// salió, de los gastos.

const VISTAS = ["resumen", "ingresos", "gastos", "taller"] as const;
type Vista = (typeof VISTAS)[number];
const NOMBRE_VISTA: Record<Vista, string> = { resumen: "Resumen", ingresos: "Ingresos", gastos: "Gastos", taller: "Taller y clientes" };

export default function PaginaReportes({ searchParams }: PageProps<"/panel/reportes">) {
  return (
    <PaginaPanel tipo="lista">
      <Suspense fallback={<Cargando />}>
        <Contenido searchParams={searchParams} />
      </Suspense>
    </PaginaPanel>
  );
}

/**
 * Lo que comparten las pestañas: el período elegido (Resumen lo usa entero) y, para las que todavía van por mes
 * (Ingresos, Gastos, Taller y clientes, que se revisan una por una), el mes en que termina.
 */
type Contexto = { periodo: Periodo; mes: string; anterior: string; hoy: string; pasado: boolean };

/** "Registrar gasto", con sus categorías: espera solo, así las consultas de la pestaña no esperan a las categorías. */
async function BotonRegistrarGasto({ hoy }: { hoy: string }) {
  return <RegistrarGasto categorias={await categoriasActivas()} hoy={hoy} />;
}

/** Las opciones de fechas, en el orden en que se usan: lo de hoy primero. */
const OPCIONES_PERIODO: { clave: ClavePeriodo; texto: string }[] = [
  { clave: "semana", texto: "Esta semana" },
  { clave: "mes", texto: "Este mes" },
  { clave: "mes-pasado", texto: "Mes pasado" },
  { clave: "6-meses", texto: "6 meses" },
  { clave: "rango", texto: "Elegir fechas" },
];

async function Contenido({ searchParams }: Pick<PageProps<"/panel/reportes">, "searchParams">) {
  await exigirModulo("reportes");
  const parametros = await searchParams;
  const hoy = fechaEnBolivia();
  const periodo = periodoDe(parametros, hoy);
  const vista: Vista = VISTAS.includes(parametros.vista as Vista) ? (parametros.vista as Vista) : "resumen";
  const ctx: Contexto = { periodo, mes: periodo.mes, anterior: sumarMeses(periodo.mes, -1), hoy, pasado: periodo.mes !== mesDe(hoy) };
  // Las direcciones: la pestaña y el período (con sus fechas, si es un rango); lo de siempre, sin parámetros
  const enlace = (v: Vista, clave: ClavePeriodo = periodo.clave) => {
    // Otro período: su clave; un rango nuevo empieza en los últimos 30 días
    const elegido = clave === periodo.clave ? periodo : { clave, inicio: sumarDias(hoy, -29), fin: hoy };
    const p = new URLSearchParams([...(v !== "resumen" ? [["vista", v] as [string, string]] : []), ...parametrosDelPeriodo(elegido)]);
    const texto = p.toString();
    return `/panel/reportes${texto ? `?${texto}` : ""}` as Route;
  };

  return (
    <>
      <EncabezadoPagina titulo="Reportes" accion={
          <Suspense fallback={null}>
            <BotonRegistrarGasto hoy={hoy} />
          </Suspense>
        }
      >
        {periodo.titulo}
      </EncabezadoPagina>
      <Pestanas etiqueta="Partes de los reportes" activa={enlace(vista)} pestanas={VISTAS.map((v) => ({ href: enlace(v), texto: NOMBRE_VISTA[v] }))} />
      <div className="flex flex-col gap-3">
        {/* Como en BarraLista: en el celular se desliza; el py-1 deja lugar al foco del teclado, que si no se recorta */}
        <div className="-mx-4 -my-1 overflow-x-auto px-4 py-1 sm:mx-0 sm:overflow-visible sm:px-0">
          <Filtros etiqueta="Fechas" filtros={OPCIONES_PERIODO.map((o) => ({ href: enlace(vista, o.clave), texto: o.texto, activo: periodo.clave === o.clave }))} />
        </div>
        {/* Un rango: desde y hasta; al cambiarlos se actualiza solo */}
        {periodo.clave === "rango" && (
          <ElegirFechas key={`${periodo.inicio}-${periodo.fin}`} vista={vista === "resumen" ? null : vista} desde={periodo.inicio} hasta={periodo.fin} hoy={hoy} />
        )}
      </div>
      {vista === "resumen" && <Resumen ctx={ctx} />}
      {vista === "ingresos" && <Ingresos ctx={ctx} />}
      {vista === "gastos" && <Gastos ctx={ctx} />}
      {vista === "taller" && <TallerYClientes ctx={ctx} />}
      <p className="text-xs text-tinta-suave">Los ingresos salen de los pagos registrados; los gastos, de los gastos registrados. Los anulados no cuentan.</p>
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// Resumen

async function Resumen({ ctx }: { ctx: Contexto }) {
  const { periodo } = ctx;
  const { unidad, tramos } = tramosDe(periodo.inicio, periodo.fin);
  const [ingresos, gastos, antes] = await Promise.all([
    ingresosEntre(periodo.inicio, periodo.fin),
    gastosEntre(periodo.inicio, periodo.fin),
    totalesEntre(periodo.antes.inicio, periodo.antes.fin),
  ]);
  const entro = ingresos.total;
  const salio = gastos.total;
  const entroPorTramo = sumarPorTramo(ingresos.porDia, tramos);
  const salioPorTramo = sumarPorTramo(gastos.porDia, tramos);
  const ganancia = entro - salio;
  const sinGastos = salio === 0 && entro > 0;
  const margen = entro > 0 ? Math.round((ganancia / entro) * 100) : null;
  const vs = periodo.vs;
  // El anterior sin gastos registrados (con ingresos) daría un margen de 100 % y una "caída" falsa: no se compara
  const sinGastosAntes = antes.salio === 0 && antes.entro > 0;
  const margenAntes = antes.entro > 0 && !sinGastosAntes ? Math.round(((antes.entro - antes.salio) / antes.entro) * 100) : null;
  const gananciaAntes = antes.entro - antes.salio;
  const sinGastosDeAntes = `Sin gastos ${vs.replace(/^vs\. /, "de ")}`;
  return (
    <>
      {/* Las tarjetas de número del panel (las del Inicio), sin enlace: aquí solo se leen */}
      <section aria-label="Resumen del período" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <TarjetaNumero icono={BanknoteIcon} titulo="Ingresos" valor={bsRedondo(entro)} nota={<Cambio cambio={cambioPorcentual(entro, antes.entro)} contra={vs} />} />
        <TarjetaNumero icono={ReceiptTextIcon} titulo="Gastos" valor={bsRedondo(salio)} aviso={sinGastos} nota={sinGastos ? "Ninguno registrado" : <Cambio cambio={cambioPorcentual(salio, antes.salio)} contra={vs} subirEsMalo />} />
        {/* Con pérdida, sin %: "▼ 150 %" junto a una pérdida confunde */}
        <TarjetaNumero icono={PiggyBankIcon} titulo="Ganancia" valor={bsRedondo(ganancia)} nota={<Cambio cambio={ganancia < 0 || sinGastosAntes ? null : cambioPorcentual(ganancia, gananciaAntes)} contra={vs} sinCambio={sinGastosAntes ? sinGastosDeAntes : ganancia < 0 ? "Hubo pérdida" : gananciaAntes < 0 ? "Antes hubo pérdida" : undefined} />} />
        {/* Sin gastos el margen saldría 100 %: se muestra "—" hasta que se carguen */}
        <TarjetaNumero icono={PercentIcon} titulo="Margen" valor={margen === null || sinGastos ? "—" : `${margen} %`} nota={sinGastos ? "Faltan los gastos" : <Cambio cambio={margen !== null && margenAntes !== null ? margen - margenAntes : null} unidad="pts" contra={vs} sinCambio={sinGastosAntes ? sinGastosDeAntes : undefined} />} />
      </section>
      {/* Las secciones como en todo el panel: el título afuera, arriba de su tarjeta (Seccion) */}
      <div className="grid gap-x-4 gap-y-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.75fr)]">
        <Seccion id="neto" titulo="Lo neto">
          <div className="flex h-full flex-col justify-center gap-3">
            {entro === 0 && salio === 0 ? (
              <p className="py-10 text-center text-sm text-tinta-suave">Sin ingresos ni gastos en estas fechas.</p>
            ) : sinGastos ? (
              <p className="py-10 text-center text-sm text-tinta-suave">Faltan los gastos de estas fechas para ver qué parte quedó.</p>
            ) : (
              <>
                <p className="text-[0.8125rem] text-tinta-suave">De los {bsRedondo(entro)} que entraron</p>
                <TortaNeto entro={entro} salio={salio} />
              </>
            )}
          </div>
        </Seccion>
        {/* La tendencia sigue las fechas: por día, semana o mes */}
        <Seccion id="tendencia" titulo={`Ingresos y gastos, ${POR_UNIDAD[unidad]}`}>
          {entro === 0 && salio === 0 ? (
            <p className="py-10 text-center text-sm text-tinta-suave">Sin ingresos ni gastos en estas fechas.</p>
          ) : (
            <GraficoIngresosGastos tramos={tramos.map((t, i) => ({ corto: t.corto, nombre: t.nombre, entro: entroPorTramo[i], salio: salioPorTramo[i] }))} />
          )}
        </Seccion>
      </div>
    </>
  );
}

/** El cambio frente al mes anterior, para la nota de una tarjeta: "▲ 12 % vs. oct.", en verde si es bueno y rojo si es malo. */
function Cambio(props: { cambio: number | null; contra: string; subirEsMalo?: boolean; unidad?: string; sinCambio?: string }) {
  const { cambio, contra, subirEsMalo, unidad = "%", sinCambio } = props;
  // Sin comparación: por qué ("Sin gastos de oct.", "Antes hubo pérdida") o, si no se sabe, que no hay datos
  if (cambio === null) return <>{sinCambio ?? `Sin datos ${contra.replace(/^vs\. /, "de ")}`}</>;
  const bueno = subirEsMalo ? cambio <= 0 : cambio >= 0;
  return (
    <>
      <span className={cn("font-semibold", bueno ? "text-exito" : "text-peligro")}>
        {cambio >= 0 ? "▲" : "▼"} {Math.abs(cambio)} {unidad}
      </span>{" "}
      {contra}
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// Ingresos

async function Ingresos({ ctx }: { ctx: Contexto }) {
  const { periodo } = ctx;
  const comparar = comparacionDelAcumulado(periodo);
  // El anterior y la línea punteada: una sola consulta cuando son el mismo rango (mes pasado, 6 meses, un rango)
  const lineaP = ingresosEntre(comparar.inicio, comparar.fin);
  const antesP = mismoRango(comparar, periodo.antes) ? lineaP : ingresosEntre(periodo.antes.inicio, periodo.antes.fin);
  const [este, antes, linea, entregados, entregadosAntes, saldos] = await Promise.all([
    ingresosEntre(periodo.inicio, periodo.fin),
    antesP,
    lineaP,
    entregadosEntre(periodo.inicio, periodo.fin),
    entregadosEntre(periodo.antes.inicio, periodo.antes.fin),
    saldosPendientes(),
  ]);
  const porCobrar = saldos.reduce((s, x) => s + Number(x.saldo), 0);
  const promedio = entregados.vehiculos > 0 ? entregados.monto / entregados.vehiculos : null;
  const promedioAntes = entregadosAntes.vehiculos > 0 ? entregadosAntes.monto / entregadosAntes.vehiculos : 0;
  const vs = periodo.vs;
  return (
    <>
      {/* Las mismas tarjetas que Resumen; "Por cobrar hoy" no depende de las fechas y lleva a Saldos pendientes */}
      <section aria-label="Ingresos del período" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <TarjetaNumero icono={BanknoteIcon} titulo="Ingresos" valor={bsRedondo(este.total)} nota={<Cambio cambio={cambioPorcentual(este.total, antes.total)} contra={vs} />} />
        <TarjetaNumero icono={CarFrontIcon} titulo="Vehículos entregados" valor={entregados.vehiculos} nota={<Cambio cambio={cambioPorcentual(entregados.vehiculos, entregadosAntes.vehiculos)} contra={vs} />} />
        <TarjetaNumero icono={CalculatorIcon} titulo="Promedio por vehículo" valor={promedio === null ? "—" : bsRedondo(promedio)} nota={promedio === null ? "Sin entregas en estas fechas" : <Cambio cambio={cambioPorcentual(promedio, promedioAntes)} contra={vs} />} />
        <TarjetaNumero href="/panel/pagos" icono={HandCoinsIcon} titulo="Por cobrar hoy" valor={bsRedondo(porCobrar)} aviso={saldos.length > 0} nota={saldos.length > 0 ? `En ${cantidad(saldos.length, "orden", "órdenes")}` : "Nadie debe"} />
      </section>
      <div className="grid gap-x-4 gap-y-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <ComoVan de="ingresos" periodo={periodo} comparar={comparar} este={este.porDia} antes={linea.porDia} />
        <Seccion id="formas" titulo="Por forma de pago">
          {este.porMetodo.length === 0 ? (
            <p className="py-10 text-center text-sm text-tinta-suave">Sin pagos en estas fechas.</p>
          ) : (
            <BarrasHorizontales
              alta
              filas={este.porMetodo.map((m) => ({
                nombre: NOMBRE_METODO[m.metodo],
                valor: m.total,
                clase: "bg-grafico-ingreso",
                texto: (
                  <>
                    <span className="font-semibold">{bsRedondo(m.total)}</span>
                    <span className="text-tinta-suave"> · {Math.round((m.total / este.total) * 100)} %</span>
                  </>
                ),
              }))}
            />
          )}
        </Seccion>
      </div>
    </>
  );
}

const mismoRango = (a: { inicio: string; fin: string }, b: { inicio: string; fin: string }) => a.inicio === b.inicio && a.fin === b.fin;

/** Los nombres de las dos líneas del acumulado: "Noviembre" y "Octubre", "Esta semana" y "Semana pasada"… */
function nombresDelAcumulado(periodo: Periodo, comparar: { inicio: string }): [string, string] {
  const mes = (fecha: string) => tituloMes(mesDe(fecha)).replace(/ de \d+$/, "");
  if (periodo.clave === "mes" || periodo.clave === "mes-pasado") return [mes(periodo.inicio), mes(comparar.inicio)];
  if (periodo.clave === "semana") return ["Esta semana", "Semana pasada"];
  return ["Estas fechas", "Período anterior"];
}

/** Lo que cambia entre "Cómo van los ingresos" y "Cómo van los gastos": el color de la línea y las palabras. */
const ACUMULADO = {
  ingresos: { id: "acumulado", titulo: "Cómo van los ingresos", color: "var(--grafico-ingreso)", hecho: "Entraron", descripcion: "Ingresos acumulados día a día" },
  gastos: { id: "acumulado-gastos", titulo: "Cómo van los gastos", color: "var(--grafico-gasto)", hecho: "Se gastaron", descripcion: "Gastos acumulados día a día" },
} as const;

type PorDia = readonly { fecha: string; total: number }[];

/** La línea de lo que se va juntando, con una frase que dice cómo va frente al período con que se compara. */
function ComoVan({ de, periodo, comparar, este, antes }: { de: keyof typeof ACUMULADO; periodo: Periodo; comparar: { inicio: string; fin: string }; este: PorDia; antes: PorDia }) {
  const textos = ACUMULADO[de];
  const largoEste = diasEntre(periodo.inicio, periodo.fin);
  const largoAntes = diasEntre(comparar.inicio, comparar.fin);
  const acumEste = acumuladoDesde(este, periodo.inicio, largoEste);
  const acumAntes = acumuladoDesde(antes, comparar.inicio, largoAntes);
  const [nombreEste, nombreAntes] = nombresDelAcumulado(periodo, comparar);
  const dias: DiaAcumulado[] = Array.from({ length: Math.max(largoEste, largoAntes) }, (_, i) => ({
    dia: i + 1,
    este: i < largoEste ? acumEste[i] : null,
    antes: i < largoAntes ? acumAntes[i] : null,
    fechaEste: i < largoEste ? diaYMes(sumarDias(periodo.inicio, i)) : null,
    fechaAntes: i < largoAntes ? diaYMes(sumarDias(comparar.inicio, i)) : null,
  }));
  const van = acumEste.at(-1) ?? 0;
  // A esta altura: lo que se había juntado en el anterior el mismo día del período
  const aEstaAltura = acumAntes[Math.min(largoEste, largoAntes) - 1] ?? 0;
  const dif = cambioPorcentual(van, aEstaAltura);
  const enCurso = periodo.clave === "mes" || periodo.clave === "semana";
  const frase = enCurso
    ? `${periodo.clave === "mes" ? `Al día ${largoEste}` : "En lo que va de la semana"} van ${bsRedondo(van)}${dif === null ? "." : `: ${Math.abs(dif)} % ${dif >= 0 ? "más" : "menos"} que ${periodo.clave === "mes" ? `en ${nombreAntes.toLowerCase()}` : "la semana pasada"} a esta altura.`}`
    : `${textos.hecho} ${bsRedondo(van)}; en ${periodo.clave === "mes-pasado" ? nombreAntes.toLowerCase() : "el período anterior"}, ${bsRedondo(acumAntes.at(-1) ?? 0)}.`;
  return (
    <Seccion id={textos.id} titulo={textos.titulo}>
      <div className="flex flex-col gap-3">
        <GraficoAcumulado dias={dias} color={textos.color} nombreEste={nombreEste} nombreAntes={nombreAntes} descripcion={`${textos.descripcion}: ${nombreEste} ${bsRedondo(van)}, ${nombreAntes} ${bsRedondo(acumAntes.at(-1) ?? 0)}`} />
        <p className="text-[0.8125rem] text-tinta-media">{frase}</p>
      </div>
    </Seccion>
  );
}

// ---------------------------------------------------------------------------------------------
// Gastos

async function Gastos({ ctx }: { ctx: Contexto }) {
  const { periodo } = ctx;
  const comparar = comparacionDelAcumulado(periodo);
  const lineaP = gastosEntre(comparar.inicio, comparar.fin);
  const antesP = mismoRango(comparar, periodo.antes) ? lineaP : gastosEntre(periodo.antes.inicio, periodo.antes.fin);
  const [este, antes, linea, entregados, entregadosAntes] = await Promise.all([
    gastosEntre(periodo.inicio, periodo.fin),
    antesP,
    lineaP,
    entregadosEntre(periodo.inicio, periodo.fin),
    entregadosEntre(periodo.antes.inicio, periodo.antes.fin),
  ]);
  const porVehiculo = entregados.vehiculos > 0 ? este.total / entregados.vehiculos : null;
  const porVehiculoAntes = entregadosAntes.vehiculos > 0 ? antes.total / entregadosAntes.vehiculos : 0;
  const mayor = este.porCategoria[0];
  const parte = (monto: number) => Math.round((monto / este.total) * 100);
  const vs = periodo.vs;
  // La lista de gastos (buscar, anular, ver un comprobante) es su propia pantalla, por mes: la del mes en que termina el
  // período, y el período, para que "Volver" traiga las mismas fechas. Antes de enero del año pasado no se registran
  // gastos: sin enlace (llevaría a otro mes)
  const consulta = new URLSearchParams([...(ctx.pasado ? [["mes", ctx.mes] as [string, string]] : []), ...parametrosDelPeriodo(periodo)]).toString();
  const lista = periodo.fin >= primerDiaDeGastos(ctx.hoy) ? (`/panel/reportes/gastos${consulta ? `?${consulta}` : ""}` as Route) : null;
  return (
    <>
      <section aria-label="Gastos del período" className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <TarjetaNumero icono={ReceiptTextIcon} titulo="Gastos" valor={bsRedondo(este.total)} nota={<Cambio cambio={cambioPorcentual(este.total, antes.total)} contra={vs} subirEsMalo />} />
        <TarjetaNumero icono={CarFrontIcon} titulo="Gasto por vehículo" valor={porVehiculo === null ? "—" : bsRedondo(porVehiculo)} nota={porVehiculo === null ? "Sin entregas en estas fechas" : <Cambio cambio={cambioPorcentual(porVehiculo, porVehiculoAntes)} contra={vs} subirEsMalo />} />
        <TarjetaNumero className="col-span-2 lg:col-span-1" icono={ChartPieIcon} titulo="Lo que más pesa" valor={mayor ? bsRedondo(mayor.total) : "—"} nota={mayor ? `${mayor.nombre}, ${parte(mayor.total)} % del total` : "Sin gastos en estas fechas"} />
      </section>
      <div className="grid gap-x-4 gap-y-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <ComoVan de="gastos" periodo={periodo} comparar={comparar} este={este.porDia} antes={linea.porDia} />
        <Seccion
          id="categorias"
          titulo="Por categoría"
          accion={
            lista && (
              <Link href={lista} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold hover:underline">
                Ver la lista de gastos
                <ChevronRightIcon className="size-4" aria-hidden />
              </Link>
            )
          }
        >
          {este.porCategoria.length === 0 ? (
            <p className="py-10 text-center text-sm text-tinta-suave">Sin gastos en estas fechas.</p>
          ) : (
            <BarrasHorizontales
              alta
              filas={este.porCategoria.map((c) => ({
                nombre: c.nombre,
                valor: c.total,
                clase: "bg-grafico-gasto",
                texto: (
                  <>
                    <span className="font-semibold">{bsRedondo(c.total)}</span>
                    <span className="text-tinta-suave"> · {parte(c.total)} %</span>
                  </>
                ),
              }))}
            />
          )}
        </Seccion>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// Taller y clientes

async function TallerYClientes({ ctx }: { ctx: Contexto }) {
  const { periodo } = ctx;
  const { unidad, tramos } = tramosDe(periodo.inicio, periodo.fin);
  const [taller, tallerAntes, entregas] = await Promise.all([elTallerEntre(periodo.inicio, periodo.fin), elTallerEntre(periodo.antes.inicio, periodo.antes.fin), entregasHasta(periodo.fin)]);
  const [este, antes] = clientesPorTramo(entregas, [
    { desde: periodo.inicio, hasta: periodo.fin },
    { desde: periodo.antes.inicio, hasta: periodo.antes.fin },
  ]);
  const porTramo = clientesPorTramo(entregas, tramos);
  const { enviadas, aceptadas, reservadas, motivos } = taller.cotizaciones;
  const aceptadasPct = enviadas > 0 ? Math.round((aceptadas / enviadas) * 100) : null;
  const antesPct = tallerAntes.cotizaciones.enviadas > 0 ? Math.round((tallerAntes.cotizaciones.aceptadas / tallerAntes.cotizaciones.enviadas) * 100) : null;
  const clientes = este.nuevos + este.volvieron;
  const vs = periodo.vs;
  return (
    <>
      <section aria-label="El taller en el período" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <TarjetaNumero icono={CarFrontIcon} titulo="Vehículos entregados" valor={este.entregados} nota={<Cambio cambio={cambioPorcentual(este.entregados, antes.entregados)} contra={vs} />} />
        <TarjetaNumero icono={UsersIcon} titulo="Clientes" valor={clientes} nota={clientes === 0 ? "Ninguno en estas fechas" : `${cantidad(este.nuevos, "nuevo", "nuevos")}, ${este.volvieron} ${este.volvieron === 1 ? "volvió" : "volvieron"}`} />
        <TarjetaNumero icono={FileCheckIcon} titulo="Cotizaciones aceptadas" valor={aceptadasPct === null ? "—" : `${aceptadasPct} %`} nota={aceptadasPct === null ? "Ninguna enviada" : <Cambio cambio={antesPct === null ? null : aceptadasPct - antesPct} unidad="pts" contra={vs} />} />
        <TarjetaNumero icono={BellRingIcon} titulo="Mantenimientos avisados" valor={taller.avisados} nota={taller.avisados === 0 ? "Ninguno en estas fechas" : `${taller.reservaron} ya ${taller.reservaron === 1 ? "reservó" : "reservaron"}`} />
      </section>
      {/* La tendencia sigue las fechas: por día, semana o mes */}
      <Seccion id="clientes" titulo={`Clientes atendidos, ${POR_UNIDAD[unidad]}`}>
        {porTramo.every((t) => t.nuevos + t.volvieron === 0) ? (
          <p className="py-10 text-center text-sm text-tinta-suave">Sin vehículos entregados en estas fechas.</p>
        ) : (
          <GraficoClientes tramos={tramos.map((t, i) => ({ corto: t.corto, nombre: t.nombre, nuevos: porTramo[i].nuevos, volvieron: porTramo[i].volvieron }))} />
        )}
      </Seccion>
      <div className="grid gap-x-4 gap-y-6 lg:grid-cols-2">
        <Seccion id="servicios" titulo="Servicios más pedidos">
          {taller.servicios.length === 0 ? (
            <p className="py-10 text-center text-sm text-tinta-suave">Sin vehículos entregados en estas fechas.</p>
          ) : (
            <BarrasHorizontales filas={taller.servicios.map((s) => ({ nombre: s.nombre, valor: s.veces, clase: "bg-grafico-1", texto: <span className="font-semibold whitespace-nowrap">{cantidad(s.veces, "vez", "veces")}</span> }))} />
          )}
        </Seccion>
        <Seccion id="cotizaciones" titulo="Cotizaciones">
          {enviadas === 0 ? (
            <p className="py-10 text-center text-sm text-tinta-suave">Sin cotizaciones enviadas en estas fechas.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Sin la fila "Enviadas" (17/11): cada barra se mide contra las enviadas y dice su parte */}
              <BarrasHorizontales
                alta
                de={enviadas}
                filas={[
                  { nombre: "Aceptadas", valor: aceptadas },
                  { nombre: "Reservadas", valor: reservadas },
                ].map((f) => ({
                  ...f,
                  clase: "bg-grafico-1",
                  texto: (
                    <>
                      <span className="font-semibold">{f.valor}</span>
                      <span className="text-tinta-suave"> · {Math.round((f.valor / enviadas) * 100)} %</span>
                    </>
                  ),
                }))}
              />
              {motivos.length > 0 && (
                <p className="text-[0.8125rem] text-tinta-media">
                  Por qué no aceptaron: {motivos.map((m) => `${NOMBRE_MOTIVO[m.motivo].toLowerCase()} (${m.veces})`).join(", ")}.
                </p>
              )}
            </div>
          )}
        </Seccion>
      </div>
    </>
  );
}
