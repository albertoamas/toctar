import type { Metadata, Route } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { cn } from "cn";
import { BanknoteIcon, ChevronRightIcon, PercentIcon, PiggyBankIcon, ReceiptTextIcon } from "lucide-react";
import { CabeceraSeccion, Seccion } from "@/componentes/panel/cabecera-seccion";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { EstadoVacio } from "@/componentes/panel/estado-vacio";
import { Filtros } from "@/componentes/panel/filtros";
import { PaginaPanel } from "@/componentes/panel/pagina-panel";
import { Pestanas } from "@/componentes/panel/pestanas";
import { TarjetaNumero } from "@/componentes/panel/tarjeta-numero";
import { cantidad } from "@/lib/cantidad";
import { fechaEnBolivia } from "@/lib/fechas";
import { exigirModulo } from "@/lib/sesion";
import { NOMBRE_MOTIVO } from "@/modulos/cotizaciones/reglas";
import { saldosPendientes } from "@/modulos/pagos/consultas";
import { NOMBRE_METODO } from "@/modulos/pagos/reglas";
import { FilaGasto } from "@/modulos/reportes/componentes/fila-gasto";
import { BarrasApiladas, BarrasConLinea, BarrasHorizontales, Leyenda, LineasAcumuladas, LineasMeses, TortaNeto, type MesConMontos } from "@/modulos/reportes/componentes/graficos";
import { RegistrarGasto } from "@/modulos/reportes/componentes/registrar-gasto";
import {
  categoriasActivas,
  elTallerEnElMes,
  entregasHasta,
  gastosDelMes,
  gastosPorCategoriaYMes,
  ingresosDelMes,
  movimientosPorMes,
  resumenDelMes,
} from "@/modulos/reportes/consultas";
import { acumularPorDia, bsRedondo, cambioPorcentual, diasDelMes, entregasPorMes, mesCorto, mesDe, nombreMes, nombreMesSolo, sumarMeses, tituloMes } from "@/modulos/reportes/reglas";

export const metadata: Metadata = { title: "Reportes" };

// Pedido 16 (P16-reportes-y-gastos.md; prototipo aprobado el 16/11 con la opción A, registro-de-cambios.md): cuatro
// pestañas (?vista=) para el mes elegido (?mes=pasado o este): Resumen (lo neto en una torta y los 6 meses en barras con
// la línea de la ganancia), Ingresos (lo acumulado día a día frente al mes anterior y por forma de pago), Gastos (por
// categoría, sus 6 meses apilados y la lista) y Taller y clientes (entregados, servicios, cotizaciones, clientes y
// mantenimientos). Solo el dueño. Lo que entró sale de los pagos sin anular, por su día; lo que salió, de los gastos.

const VISTAS = ["resumen", "ingresos", "gastos", "taller"] as const;
type Vista = (typeof VISTAS)[number];
const NOMBRE_VISTA: Record<Vista, string> = { resumen: "Resumen", ingresos: "Ingresos", gastos: "Gastos", taller: "Taller y clientes" };

/** Los colores de las series, en orden fijo: la quinta categoría en adelante se junta en "Las demás". */
const SERIES = ["bg-grafico-1", "bg-grafico-2", "bg-grafico-3", "bg-grafico-4"] as const;
const SERIES_SVG = ["fill-grafico-1", "fill-grafico-2", "fill-grafico-3", "fill-grafico-4"] as const;

export default function PaginaReportes({ searchParams }: PageProps<"/panel/reportes">) {
  return (
    <PaginaPanel tipo="lista">
      <Suspense fallback={<Cargando />}>
        <Contenido searchParams={searchParams} />
      </Suspense>
    </PaginaPanel>
  );
}

type Contexto = { mes: string; anterior: string; hoy: string; pasado: boolean };

async function Contenido({ searchParams }: Pick<PageProps<"/panel/reportes">, "searchParams">) {
  await exigirModulo("reportes");
  const parametros = await searchParams;
  const hoy = fechaEnBolivia();
  const pasado = parametros.mes === "pasado";
  const mes = pasado ? sumarMeses(mesDe(hoy), -1) : mesDe(hoy);
  const vista: Vista = VISTAS.includes(parametros.vista as Vista) ? (parametros.vista as Vista) : "resumen";
  const ctx: Contexto = { mes, anterior: sumarMeses(mes, -1), hoy, pasado };
  const enlace = (v: Vista, conPasado = pasado) => {
    const p = new URLSearchParams();
    if (v !== "resumen") p.set("vista", v);
    if (conPasado) p.set("mes", "pasado");
    const texto = p.toString();
    return `/panel/reportes${texto ? `?${texto}` : ""}` as Route;
  };
  const categorias = await categoriasActivas();

  return (
    <>
      <EncabezadoPagina titulo="Reportes" accion={<RegistrarGasto categorias={categorias} hoy={hoy} />}>
        {tituloMes(mes)}
      </EncabezadoPagina>
      <Pestanas etiqueta="Partes de los reportes" activa={enlace(vista)} pestanas={VISTAS.map((v) => ({ href: enlace(v), texto: NOMBRE_VISTA[v] }))} />
      <Filtros
        etiqueta="Mes"
        filtros={[
          { href: enlace(vista, false), texto: "Este mes", activo: !pasado },
          { href: enlace(vista, true), texto: "Mes pasado", activo: pasado },
        ]}
      />
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
  const meses = seisMeses(ctx.mes);
  const [movimientos, categorias] = await Promise.all([movimientosPorMes(meses[0].mes, ctx.mes), categoriasActivas()]);
  const { entro, salio } = movimientos[5];
  const antes = movimientos[4];
  if (movimientos.every((m) => m.entro === 0 && m.salio === 0)) return <EstadoVacio>{`Todavía no hay movimientos en ${nombreMes(ctx.mes)}.`}</EstadoVacio>;
  const ganancia = entro - salio;
  const sinGastos = salio === 0 && entro > 0;
  const margen = entro > 0 ? Math.round((ganancia / entro) * 100) : null;
  const margenAntes = antes.entro > 0 ? Math.round(((antes.entro - antes.salio) / antes.entro) * 100) : null;
  // Corto, así entra en una línea en el celular: "vs. oct."
  const vsAnterior = `vs. ${nombreMesSolo(ctx.anterior).slice(0, 3)}.`;
  const conMontos: MesConMontos[] = meses.map((m, i) => ({ ...m, entro: movimientos[i].entro, salio: movimientos[i].salio }));
  return (
    <>
      {/* Las tarjetas de número del panel (las del Inicio), sin enlace: aquí solo se leen */}
      <section aria-label="Resumen del mes" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <TarjetaNumero icono={BanknoteIcon} titulo="Ingresos" valor={bsRedondo(entro)} nota={<Cambio cambio={cambioPorcentual(entro, antes.entro)} contra={vsAnterior} />} />
        <TarjetaNumero icono={ReceiptTextIcon} titulo="Gastos" valor={bsRedondo(salio)} aviso={sinGastos} nota={sinGastos ? "Ninguno registrado" : <Cambio cambio={cambioPorcentual(salio, antes.salio)} contra={vsAnterior} subirEsMalo />} />
        {/* Con pérdida, sin %: "▼ 150 %" junto a una pérdida confunde */}
        <TarjetaNumero icono={PiggyBankIcon} titulo="Ganancia" valor={bsRedondo(ganancia)} nota={<Cambio cambio={ganancia < 0 ? null : cambioPorcentual(ganancia, antes.entro - antes.salio)} contra={vsAnterior} />} />
        {/* Sin gastos el margen saldría 100 %: se muestra "—" hasta que se carguen */}
        <TarjetaNumero icono={PercentIcon} titulo="Margen" valor={margen === null || sinGastos ? "—" : `${margen} %`} nota={sinGastos ? "Faltan los gastos" : <Cambio cambio={margen !== null && margenAntes !== null ? margen - margenAntes : null} unidad="pts" contra={vsAnterior} />} />
      </section>
      {/* Sin gastos registrados, la ganancia y el margen salen iguales a lo que entró: se avisa, con cómo arreglarlo */}
      {sinGastos && (
        <div role="status" className="flex flex-col items-start gap-3 rounded-sm border border-aviso bg-aviso-fondo p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-aviso">Todavía no hay gastos registrados en {nombreMesSolo(ctx.mes)}. Sin ellos, la ganancia y el margen salen iguales a lo que entró.</p>
          <RegistrarGasto categorias={categorias} hoy={ctx.hoy} variante="outline" />
        </div>
      )}
      {/* Las secciones como en todo el panel: el título afuera, arriba de su tarjeta (Seccion) */}
      <div className="grid gap-x-4 gap-y-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.75fr)]">
        <Seccion id="neto" titulo="Lo neto del mes">
          <div className="flex h-full flex-col justify-center gap-3">
            {salio > 0 && <p className="text-[0.8125rem] text-tinta-suave">De los {bsRedondo(entro)} que entraron</p>}
            <TortaNeto entro={entro} salio={salio} />
          </div>
        </Seccion>
        <Seccion id="meses" titulo="Ingresos y gastos, últimos 6 meses">
          <div className="flex flex-col gap-3">
            <BarrasConLinea meses={conMontos} elegido={ctx.mes} />
          </div>
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

/** Una tarjeta de número: su nombre, el valor y cuánto cambió (verde si es bueno, rojo si es malo, con flecha). */
function Tarjeta({ etiqueta, valor, cambio, contra, marca, subirEsMalo, unidad = "%" }: { etiqueta: string; valor: string; cambio: number | null; contra: string; marca?: string; subirEsMalo?: boolean; unidad?: string }) {
  const bueno = cambio !== null && (subirEsMalo ? cambio <= 0 : cambio >= 0);
  return (
    <li className="tt-tarjeta-panel flex flex-col gap-1.5 p-4 lg:p-5">
      <span className="flex items-center gap-2 text-[0.8125rem] font-medium text-tinta-media">
        {marca && <span aria-hidden className={cn("size-2.5 rounded-[3px]", marca)} />}
        {etiqueta}
      </span>
      <span className="text-[1.375rem] font-bold whitespace-nowrap tabular-nums lg:text-[1.75rem]">{valor}</span>
      {cambio !== null && (
        <span className="text-xs text-tinta-suave">
          <span className={cn("font-semibold", bueno ? "text-exito" : "text-peligro")}>
            {cambio >= 0 ? "▲" : "▼"} {Math.abs(cambio)} {unidad}
          </span>{" "}
          {contra}
        </span>
      )}
    </li>
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
  const [este, antes, saldos] = await Promise.all([ingresosDelMes(ctx.mes), ingresosDelMes(ctx.anterior), saldosPendientes()]);
  const total = este.porMetodo.reduce((s, m) => s + m.total, 0);
  const porCobrar = saldos.reduce((s, x) => s + Number(x.saldo), 0);
  // Este mes, hasta hoy; un mes pasado, entero. El anterior, entero
  const hastaDia = ctx.pasado ? diasDelMes(ctx.mes) : Number(ctx.hoy.slice(8));
  const acumEste = acumularPorDia(este.porDia, hastaDia);
  const acumAntes = acumularPorDia(antes.porDia, diasDelMes(ctx.anterior));
  const aEstaAltura = acumAntes[Math.min(hastaDia, acumAntes.length) - 1] ?? 0;
  const dif = cambioPorcentual(acumEste[hastaDia - 1] ?? 0, aEstaAltura);
  return (
    <>
      <ul aria-label="Ingresos del mes" className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4">
        <Tarjeta etiqueta="Ingresos del mes" marca="bg-grafico-ingreso" valor={bsRedondo(total)} cambio={null} contra="" />
        <Tarjeta etiqueta="Promedio por vehículo" valor={este.vehiculos > 0 ? bsRedondo(total / este.vehiculos) : "—"} cambio={null} contra="" />
        <li className="col-span-2 lg:col-span-1">
          <Link href="/panel/pagos" className="tt-tarjeta-panel flex h-full flex-col gap-1.5 p-4 hover:bg-superficie/40 lg:p-5">
            {/* Los saldos de hoy, también en "Mes pasado": no es de un mes */}
            <span className="text-[0.8125rem] font-medium text-tinta-media">Por cobrar hoy</span>
            <span className="text-[1.375rem] font-bold tabular-nums lg:text-[1.75rem]">{bsRedondo(porCobrar)}</span>
            <span className="flex items-center gap-1 text-xs font-semibold">
              En {cantidad(saldos.length, "orden", "órdenes")}. Ver saldos
              <ChevronRightIcon className="size-3.5" aria-hidden />
            </span>
          </Link>
        </li>
      </ul>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Bloque id="acumulado" titulo="Ingresos acumulados, día a día">
          <Leyenda
            items={[
              { nombre: tituloMes(ctx.mes).replace(/ de \d+$/, ""), clase: "bg-grafico-ingreso", linea: true },
              { nombre: tituloMes(ctx.anterior).replace(/ de \d+$/, ""), clase: "border-tinta-suave", linea: true, punteada: true },
            ]}
          />
          <LineasAcumuladas este={acumEste} antes={acumAntes} descripcion={`Ingresos acumulados día a día de ${nombreMes(ctx.mes)} frente a ${nombreMes(ctx.anterior)}`} />
          <p className="text-[0.8125rem] text-tinta-media">
            {ctx.pasado
              ? `En ${nombreMesSolo(ctx.mes)} entraron ${bsRedondo(acumEste.at(-1) ?? 0)}; en ${nombreMesSolo(ctx.anterior)}, ${bsRedondo(acumAntes.at(-1) ?? 0)}.`
              : `Al día ${hastaDia} entraron ${bsRedondo(acumEste.at(-1) ?? 0)}${dif === null ? "." : `: ${Math.abs(dif)} % ${dif >= 0 ? "más" : "menos"} que en ${nombreMesSolo(ctx.anterior)} a esta altura.`}`}
          </p>
        </Bloque>
        <Bloque id="formas" titulo="Por forma de pago">
          {este.porMetodo.length === 0 ? (
            <p className="text-sm text-tinta-suave">Sin pagos en {nombreMes(ctx.mes)}.</p>
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
                    <span className="text-tinta-suave"> · {Math.round((m.total / total) * 100)} %</span>
                  </>
                ),
              }))}
            />
          )}
        </Bloque>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// Gastos

async function Gastos({ ctx }: { ctx: Contexto }) {
  const meses = seisMeses(ctx.mes);
  const [resumen, porMes, lista] = await Promise.all([resumenDelMes(ctx.mes), gastosPorCategoriaYMes(meses[0].mes, ctx.mes), gastosDelMes(ctx.mes)]);
  // Las categorías de los 6 meses, de la que más se gastó a la que menos: cada una con su color fijo; desde la quinta,
  // juntas en "Las demás" (un color nunca se repite ni se inventa)
  const totales = new Map<string, number>();
  for (const f of porMes) totales.set(f.categoria, (totales.get(f.categoria) ?? 0) + f.total);
  const orden = [...totales.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n);
  const grupos = orden.length > 4 ? [...orden.slice(0, 3), "Las demás"] : orden;
  const grupoDe = (categoria: string) => (grupos.includes(categoria) ? categoria : "Las demás");
  const claseDe = (categoria: string) => SERIES[grupos.indexOf(grupoDe(categoria))] ?? SERIES[3];
  const totalMes = resumen.porCategoria.reduce((s, c) => s + c.total, 0);
  const visibles = lista.slice(0, 8);
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Bloque id="categorias" titulo="Por categoría" detalle={`${bsRedondo(totalMes)} en ${cantidad(resumen.cuantosGastos, "gasto", "gastos")}`}>
          {resumen.porCategoria.length === 0 ? (
            <p className="text-sm text-tinta-suave">Sin gastos en {nombreMes(ctx.mes)}.</p>
          ) : (
            <BarrasHorizontales
              filas={resumen.porCategoria.map((c) => ({
                nombre: c.nombre,
                valor: c.total,
                clase: claseDe(c.nombre),
                texto: (
                  <>
                    <span className="font-semibold">{bsRedondo(c.total)}</span>
                    <span className="text-tinta-suave"> · {Math.round((c.total / totalMes) * 100)} %</span>
                  </>
                ),
              }))}
            />
          )}
        </Bloque>
        <Bloque id="categorias-meses" titulo="Gastos de los últimos 6 meses">
          {grupos.length > 0 && <Leyenda items={grupos.map((g, k) => ({ nombre: g, clase: SERIES[k] }))} />}
          <BarrasApiladas
            categorias={grupos.map((g, k) => ({ nombre: g, clase: SERIES_SVG[k] }))}
            meses={meses.map((m) => ({ ...m, partes: grupos.map((g) => porMes.filter((f) => f.mes === m.mes && grupoDe(f.categoria) === g).reduce((s, f) => s + f.total, 0)) }))}
          />
        </Bloque>
      </div>
      <section aria-labelledby="lista-titulo" className="flex flex-col gap-2">
        <CabeceraSeccion id="lista" titulo={`Gastos de ${nombreMes(ctx.mes)}`}>
          <Link href={`/panel/reportes/gastos${ctx.pasado ? `?mes=${ctx.mes}` : ""}` as Route} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold hover:underline">
            Ver todos y filtrar
            <ChevronRightIcon className="size-4" aria-hidden />
          </Link>
        </CabeceraSeccion>
        {lista.length === 0 ? (
          <EstadoVacio>{`Todavía no hay gastos en ${nombreMes(ctx.mes)}.`}</EstadoVacio>
        ) : (
          <ul aria-label={`Gastos de ${nombreMes(ctx.mes)}`} className="tt-tarjeta-panel divide-y divide-border">
            {visibles.map((g) => (
              <FilaGasto key={g.id} g={g} />
            ))}
          </ul>
        )}
        {lista.length > visibles.length && <p className="text-sm text-tinta-suave">Se ven los últimos {visibles.length}; los demás, en «Ver todos y filtrar».</p>}
      </section>
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
