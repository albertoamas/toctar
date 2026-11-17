import type { Metadata, Route } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { cn } from "cn";
import { BanknoteIcon, CalculatorIcon, CarFrontIcon, ChartPieIcon, ChevronRightIcon, HandCoinsIcon, PercentIcon, PiggyBankIcon, ReceiptTextIcon } from "lucide-react";
import { CabeceraSeccion, Seccion } from "@/componentes/panel/cabecera-seccion";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { EstadoVacio } from "@/componentes/panel/estado-vacio";
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
import { BarrasHorizontales, Leyenda, LineasMeses } from "@/modulos/reportes/componentes/graficos";
import { GraficoAcumulado, type DiaAcumulado } from "@/modulos/reportes/componentes/grafico-acumulado";
import { GraficoMeses, TortaNeto } from "@/modulos/reportes/componentes/graficos-resumen";
import { RegistrarGasto } from "@/modulos/reportes/componentes/registrar-gasto";
import {
  categoriasActivas,
  elTallerEnElMes,
  entregasHasta,
  entregadosEntre,
  gastosEntre,
  ingresosEntre,
  movimientosPorMes,
  totalesEntre,
} from "@/modulos/reportes/consultas";
import { acumuladoDesde, bsRedondo, cambioPorcentual, comparacionDelAcumulado, diaYMes, diasEntre, entregasPorMes, mesCorto, mesDe, nombreMes, nombreMesSolo, periodoDe, sumarMeses, tituloMes, type ClavePeriodo, type Periodo } from "@/modulos/reportes/reglas";

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

/** Las opciones de fechas, en el orden en que se usan: lo de hoy primero. */
const OPCIONES_PERIODO: { clave: ClavePeriodo; texto: string }[] = [
  { clave: "hoy", texto: "Hoy" },
  { clave: "semana", texto: "Esta semana" },
  { clave: "mes", texto: "Este mes" },
  { clave: "mes-pasado", texto: "Mes pasado" },
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
    const p = new URLSearchParams();
    if (v !== "resumen") p.set("vista", v);
    if (clave !== "mes") p.set("periodo", clave);
    if (clave === "rango") {
      p.set("desde", periodo.clave === "rango" ? periodo.inicio : sumarDias(hoy, -29));
      p.set("hasta", periodo.clave === "rango" ? periodo.fin : hoy);
    }
    const texto = p.toString();
    return `/panel/reportes${texto ? `?${texto}` : ""}` as Route;
  };
  const categorias = await categoriasActivas();

  return (
    <>
      <EncabezadoPagina titulo="Reportes" accion={<RegistrarGasto categorias={categorias} hoy={hoy} />}>
        {periodo.titulo}
      </EncabezadoPagina>
      <Pestanas etiqueta="Partes de los reportes" activa={enlace(vista)} pestanas={VISTAS.map((v) => ({ href: enlace(v), texto: NOMBRE_VISTA[v] }))} />
      <div className="flex flex-col gap-3">
        {/* Como en BarraLista: en el celular se desliza; el py-1 deja lugar al foco del teclado, que si no se recorta */}
        <div className="-mx-4 -my-1 overflow-x-auto px-4 py-1 sm:mx-0 sm:overflow-visible sm:px-0">
          <Filtros etiqueta="Fechas" filtros={OPCIONES_PERIODO.map((o) => ({ href: enlace(vista, o.clave), texto: o.texto, activo: periodo.clave === o.clave }))} />
        </div>
        {/* Un rango: desde y hasta, con "Ver" (un formulario GET: la dirección se comparte y Atrás funciona) */}
        {periodo.clave === "rango" && (
          <ElegirFechas vista={vista === "resumen" ? null : vista} desde={periodo.inicio} hasta={periodo.fin} hoy={hoy} />
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

/** Los últimos 6 meses hasta el elegido, con su nombre. */
function seisMeses(mes: string) {
  return Array.from({ length: 6 }, (_, i) => sumarMeses(mes, i - 5)).map((m) => ({ mes: m, corto: mesCorto(m), nombre: nombreMes(m) }));
}

// ---------------------------------------------------------------------------------------------
// Resumen

async function Resumen({ ctx }: { ctx: Contexto }) {
  const { periodo } = ctx;
  const meses = seisMeses(ctx.mes);
  const [movimientos, total, antes] = await Promise.all([
    movimientosPorMes(meses[0].mes, ctx.mes),
    totalesEntre(periodo.inicio, periodo.fin),
    totalesEntre(periodo.antes.inicio, periodo.antes.fin),
  ]);
  if (movimientos.every((m) => m.entro === 0 && m.salio === 0) && total.entro === 0 && total.salio === 0) {
    return <EstadoVacio>{`Todavía no hay ingresos ni gastos registrados en los últimos 6 meses.`}</EstadoVacio>;
  }
  const { entro, salio } = total;
  const ganancia = entro - salio;
  const sinGastos = salio === 0 && entro > 0;
  const margen = entro > 0 ? Math.round((ganancia / entro) * 100) : null;
  const margenAntes = antes.entro > 0 ? Math.round(((antes.entro - antes.salio) / antes.entro) * 100) : null;
  const vs = periodo.vs;
  return (
    <>
      {/* Las tarjetas de número del panel (las del Inicio), sin enlace: aquí solo se leen */}
      <section aria-label="Resumen del período" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <TarjetaNumero icono={BanknoteIcon} titulo="Ingresos" valor={bsRedondo(entro)} nota={<Cambio cambio={cambioPorcentual(entro, antes.entro)} contra={vs} />} />
        <TarjetaNumero icono={ReceiptTextIcon} titulo="Gastos" valor={bsRedondo(salio)} aviso={sinGastos} nota={sinGastos ? "Ninguno registrado" : <Cambio cambio={cambioPorcentual(salio, antes.salio)} contra={vs} subirEsMalo />} />
        {/* Con pérdida, sin %: "▼ 150 %" junto a una pérdida confunde */}
        <TarjetaNumero icono={PiggyBankIcon} titulo="Ganancia" valor={bsRedondo(ganancia)} nota={<Cambio cambio={ganancia < 0 ? null : cambioPorcentual(ganancia, antes.entro - antes.salio)} contra={vs} />} />
        {/* Sin gastos el margen saldría 100 %: se muestra "—" hasta que se carguen */}
        <TarjetaNumero icono={PercentIcon} titulo="Margen" valor={margen === null || sinGastos ? "—" : `${margen} %`} nota={sinGastos ? "Faltan los gastos" : <Cambio cambio={margen !== null && margenAntes !== null ? margen - margenAntes : null} unidad="pts" contra={vs} />} />
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
        <Seccion id="meses" titulo="Ingresos y gastos, últimos 6 meses">
          <GraficoMeses meses={meses.map((m, i) => ({ corto: m.corto, nombre: m.nombre, entro: movimientos[i].entro, salio: movimientos[i].salio }))} />
        </Seccion>
      </div>
    </>
  );
}

/** El cambio frente al mes anterior, para la nota de una tarjeta: "▲ 12 % vs. oct.", en verde si es bueno y rojo si es malo. */
function Cambio({ cambio, contra, subirEsMalo, unidad = "%" }: { cambio: number | null; contra: string; subirEsMalo?: boolean; unidad?: string }) {
  if (cambio === null) return <>Sin datos {contra.replace(/^vs\. /, "de ")}</>;
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

/** Una sección del reporte: su título (y un detalle) arriba de su tarjeta. */
function Bloque({ id, titulo, detalle, accion, children, className }: { id: string; titulo: string; detalle?: string; accion?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section aria-labelledby={`${id}-titulo`} className={cn("tt-tarjeta-panel flex flex-col gap-3 p-4 lg:p-5", className)}>
      <CabeceraSeccion id={id} titulo={titulo} nivel={3} compacta>
        {accion}
      </CabeceraSeccion>
      {detalle && <p className="-mt-1 text-[0.8125rem] text-tinta-suave">{detalle}</p>}
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------------------------
// Ingresos

async function Ingresos({ ctx }: { ctx: Contexto }) {
  const { periodo } = ctx;
  const comparar = comparacionDelAcumulado(periodo);
  const [este, antes, linea, entregados, entregadosAntes, saldos] = await Promise.all([
    ingresosEntre(periodo.inicio, periodo.fin),
    totalesEntre(periodo.antes.inicio, periodo.antes.fin),
    ingresosEntre(comparar.inicio, comparar.fin),
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
        <TarjetaNumero icono={BanknoteIcon} titulo="Ingresos" valor={bsRedondo(este.total)} nota={<Cambio cambio={cambioPorcentual(este.total, antes.entro)} contra={vs} />} />
        <TarjetaNumero icono={CarFrontIcon} titulo="Vehículos entregados" valor={entregados.vehiculos} nota={<Cambio cambio={cambioPorcentual(entregados.vehiculos, entregadosAntes.vehiculos)} contra={vs} />} />
        <TarjetaNumero icono={CalculatorIcon} titulo="Promedio por vehículo" valor={promedio === null ? "—" : bsRedondo(promedio)} nota={promedio === null ? "Sin entregas en estas fechas" : <Cambio cambio={cambioPorcentual(promedio, promedioAntes)} contra={vs} />} />
        <TarjetaNumero href="/panel/pagos" icono={HandCoinsIcon} titulo="Por cobrar hoy" valor={bsRedondo(porCobrar)} aviso={saldos.length > 0} nota={saldos.length > 0 ? `En ${cantidad(saldos.length, "orden", "órdenes")}` : "Nadie debe"} />
      </section>
      <div className={cn("grid gap-x-4 gap-y-6", periodo.clave !== "hoy" && "lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]")}>
        {/* Un solo día no tiene recorrido: con "Hoy" no hay línea, y la forma de pago ocupa todo el ancho */}
        {periodo.clave !== "hoy" && <ComoVan de="ingresos" periodo={periodo} comparar={comparar} este={este.porDia} antes={linea.porDia} />}
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
  const [este, antes, linea, entregados, entregadosAntes] = await Promise.all([
    gastosEntre(periodo.inicio, periodo.fin),
    totalesEntre(periodo.antes.inicio, periodo.antes.fin),
    gastosEntre(comparar.inicio, comparar.fin),
    entregadosEntre(periodo.inicio, periodo.fin),
    entregadosEntre(periodo.antes.inicio, periodo.antes.fin),
  ]);
  const porVehiculo = entregados.vehiculos > 0 ? este.total / entregados.vehiculos : null;
  const porVehiculoAntes = entregadosAntes.vehiculos > 0 ? antes.salio / entregadosAntes.vehiculos : 0;
  const mayor = este.porCategoria[0];
  const parte = (monto: number) => Math.round((monto / este.total) * 100);
  const vs = periodo.vs;
  // La lista de gastos (buscar, anular, ver un comprobante) es su propia pantalla, por mes: la del mes en que termina el período
  const lista = `/panel/reportes/gastos${ctx.pasado ? `?mes=${ctx.mes}` : ""}` as Route;
  return (
    <>
      <section aria-label="Gastos del período" className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <TarjetaNumero icono={ReceiptTextIcon} titulo="Gastos" valor={bsRedondo(este.total)} nota={<Cambio cambio={cambioPorcentual(este.total, antes.salio)} contra={vs} subirEsMalo />} />
        <TarjetaNumero icono={CarFrontIcon} titulo="Gasto por vehículo" valor={porVehiculo === null ? "—" : bsRedondo(porVehiculo)} nota={porVehiculo === null ? "Sin entregas en estas fechas" : <Cambio cambio={cambioPorcentual(porVehiculo, porVehiculoAntes)} contra={vs} subirEsMalo />} />
        <TarjetaNumero className="col-span-2 lg:col-span-1" icono={ChartPieIcon} titulo="Lo que más pesa" valor={mayor ? bsRedondo(mayor.total) : "—"} nota={mayor ? `${mayor.nombre}, ${parte(mayor.total)} % del total` : "Sin gastos en estas fechas"} />
      </section>
      <div className={cn("grid gap-x-4 gap-y-6", periodo.clave !== "hoy" && "lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]")}>
        {/* Un solo día no tiene recorrido: con "Hoy" no hay línea, y las categorías ocupan todo el ancho */}
        {periodo.clave !== "hoy" && <ComoVan de="gastos" periodo={periodo} comparar={comparar} este={este.porDia} antes={linea.porDia} />}
        <Seccion
          id="categorias"
          titulo="Por categoría"
          accion={
            <Link href={lista} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold hover:underline">
              Ver la lista de gastos
              <ChevronRightIcon className="size-4" aria-hidden />
            </Link>
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
  const meses = seisMeses(ctx.mes);
  const [taller, entregas] = await Promise.all([elTallerEnElMes(ctx.mes), entregasHasta(ctx.mes)]);
  const porMes = entregasPorMes(
    entregas,
    meses.map((m) => m.mes),
  );
  const delMes = porMes[5];
  const { enviadas, aceptadas, reservadas, motivos } = taller.cotizaciones;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Bloque id="entregados" titulo="Vehículos entregados, últimos 6 meses" detalle={`${cantidad(delMes.entregados, "vehículo", "vehículos")} en ${nombreMesSolo(ctx.mes)}`}>
        <LineasMeses meses={meses} elegido={ctx.mes} conValores series={[{ nombre: "Entregados", clase: "stroke-grafico-1", claseRelleno: "fill-grafico-1", valores: porMes.map((m) => m.entregados) }]} />
      </Bloque>
      <Bloque id="servicios" titulo="Servicios más pedidos" detalle={`De los vehículos entregados en ${nombreMesSolo(ctx.mes)}`}>
        {taller.servicios.length === 0 ? (
          <p className="text-sm text-tinta-suave">Sin vehículos entregados en {nombreMes(ctx.mes)}.</p>
        ) : (
          <BarrasHorizontales filas={taller.servicios.map((s) => ({ nombre: s.nombre, valor: s.veces, clase: "bg-grafico-1", texto: <span className="font-semibold">{cantidad(s.veces, "vez", "veces")}</span> }))} />
        )}
      </Bloque>
      <Bloque id="cotizaciones" titulo="Cotizaciones" detalle={enviadas > 0 ? `${Math.round((aceptadas / enviadas) * 100)} % aceptadas` : undefined}>
        {enviadas === 0 ? (
          <p className="text-sm text-tinta-suave">Sin cotizaciones enviadas en {nombreMes(ctx.mes)}.</p>
        ) : (
          <>
            <BarrasHorizontales
              alta
              filas={[
                { nombre: "Enviadas", valor: enviadas },
                { nombre: "Aceptadas", valor: aceptadas },
                { nombre: "Reservadas", valor: reservadas },
              ].map((f) => ({ ...f, clase: "bg-grafico-1", texto: <span className="font-semibold">{f.valor}</span> }))}
            />
            {motivos.length > 0 && (
              <p className="text-[0.8125rem] text-tinta-media">
                Por qué no aceptaron: {motivos.map((m) => `${NOMBRE_MOTIVO[m.motivo].toLowerCase()} (${m.veces})`).join(", ")}.
              </p>
            )}
          </>
        )}
      </Bloque>
      <Bloque id="clientes" titulo="Clientes, últimos 6 meses" detalle={`En ${nombreMesSolo(ctx.mes)}: ${cantidad(delMes.nuevos, "nuevo", "nuevos")} y ${delMes.volvieron} ${delMes.volvieron === 1 ? "volvió" : "volvieron"}`}>
        <Leyenda
          items={[
            { nombre: "Nuevos", clase: "bg-grafico-1" },
            { nombre: "Volvieron", clase: "bg-grafico-3" },
          ]}
        />
        <LineasMeses
          meses={meses}
          elegido={ctx.mes}
          series={[
            { nombre: "Nuevos", clase: "stroke-grafico-1", claseRelleno: "fill-grafico-1", valores: porMes.map((m) => m.nuevos) },
            { nombre: "Volvieron", clase: "stroke-grafico-3", claseRelleno: "fill-grafico-3", valores: porMes.map((m) => m.volvieron) },
          ]}
        />
        <p className="text-[0.8125rem] text-tinta-media">
          Mantenimientos: <strong>{taller.avisados}</strong> {taller.avisados === 1 ? "avisado" : "avisados"}, <strong>{taller.reservaron}</strong> ya {taller.reservaron === 1 ? "reservó" : "reservaron"}.
        </p>
      </Bloque>
    </div>
  );
}
