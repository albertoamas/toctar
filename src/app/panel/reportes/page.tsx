import type { Metadata, Route } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { cn } from "cn";
import { ChevronRightIcon } from "lucide-react";
import { Cargando } from "@/componentes/panel/cargando";
import { CabeceraSeccion } from "@/componentes/panel/cabecera-seccion";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { EstadoVacio } from "@/componentes/panel/estado-vacio";
import { Filtros } from "@/componentes/panel/filtros";
import { PaginaPanel } from "@/componentes/panel/pagina-panel";
import { cantidad, palabra } from "@/lib/cantidad";
import { fechaEnBolivia } from "@/lib/fechas";
import { exigirModulo } from "@/lib/sesion";
import { NOMBRE_MOTIVO } from "@/modulos/cotizaciones/reglas";
import { BarrasMeses } from "@/modulos/reportes/componentes/barras-meses";
import { RegistrarGasto } from "@/modulos/reportes/componentes/registrar-gasto";
import { categoriasActivas, elTallerEnElMes, movimientosPorMes, resumenDelMes } from "@/modulos/reportes/consultas";
import { bsRedondo, cambioFrenteAlAnterior, mesDe, nombreMes, nombreMesSolo, parteQueQuedo, quedo, sumarMeses, tituloMes } from "@/modulos/reportes/reglas";

export const metadata: Metadata = { title: "Reportes" };

// Pedido 16, opción B (P16-reportes-y-gastos.md §5, prototipo aprobado por el dueño): cuánto entró, cuánto salió y cuánto
// quedó en el mes, en qué se gastó y cómo le fue al taller. "Este mes" o "Mes pasado" (`?mes=pasado`). Solo el dueño.
// Lo que entró sale de los pagos registrados (sin los anulados), por su día; lo que salió, de los gastos.

export default function PaginaReportes({ searchParams }: PageProps<"/panel/reportes">) {
  return (
    <PaginaPanel tipo="lista">
      <Suspense fallback={<Cargando />}>
        <Contenido searchParams={searchParams} />
      </Suspense>
    </PaginaPanel>
  );
}

async function Contenido({ searchParams }: Pick<PageProps<"/panel/reportes">, "searchParams">) {
  await exigirModulo("reportes");
  const parametros = await searchParams;
  const hoy = fechaEnBolivia();
  const pasado = parametros.mes === "pasado";
  const mes = pasado ? sumarMeses(mesDe(hoy), -1) : mesDe(hoy);
  const anterior = sumarMeses(mes, -1);

  const [movimientos, resumen, taller, categorias] = await Promise.all([
    movimientosPorMes(sumarMeses(mes, -5), mes),
    resumenDelMes(mes),
    elTallerEnElMes(mes),
    categoriasActivas(),
  ]);
  const { entro, salio } = movimientos[movimientos.length - 1];
  const delAnterior = movimientos[movimientos.length - 2];
  const ganancia = quedo(entro, salio);
  const cambio = cambioFrenteAlAnterior(ganancia, quedo(delAnterior.entro, delAnterior.salio));
  const parte = parteQueQuedo(entro, salio);
  const sinNada = entro === 0 && salio === 0 && taller.entregados === 0 && taller.cotizaciones.enviadas === 0;
  const verGastos = `/panel/reportes/gastos${pasado ? `?mes=${mes}` : ""}` as Route;

  return (
    <>
      <EncabezadoPagina titulo="Reportes" accion={<RegistrarGasto categorias={categorias} hoy={hoy} />}>
        Cuánto entró, cuánto salió y cuánto quedó
      </EncabezadoPagina>
      <Filtros
        etiqueta="Mes"
        filtros={[
          { href: "/panel/reportes", texto: "Este mes", activo: !pasado },
          { href: "/panel/reportes?mes=pasado" as Route, texto: "Mes pasado", activo: pasado },
        ]}
      />

      {sinNada ? (
        <EstadoVacio>{`Todavía no hay movimientos en ${nombreMes(mes)}.`}</EstadoVacio>
      ) : (
        <>
          {/* Lo primero que se lee: cuánto le quedó, y de dónde sale */}
          <section aria-labelledby="ganancia-titulo" className="tt-tarjeta-panel flex flex-col gap-5 p-5">
            <div className="flex flex-col gap-1">
              <p className="text-sm text-tinta-suave">{tituloMes(mes)}</p>
              <h2 id="ganancia-titulo" className="text-2xl leading-tight font-semibold sm:text-3xl">
                {ganancia >= 0 ? "Ganaste " : "Perdiste "}
                <span className={cn("font-bold tabular-nums", ganancia < 0 && "text-peligro")}>{bsRedondo(Math.abs(ganancia))}</span>
                {cambio && cambio.sentido !== "igual" ? `, ${cambio.porcentaje} % ${cambio.sentido} que en ${nombreMesSolo(anterior)}.` : "."}
              </h2>
            </div>
            <dl className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-start gap-x-2 gap-y-1 sm:gap-x-4">
              <Cuenta etiqueta="Entró" monto={entro} detalle={`de ${cantidad(resumen.vehiculosConPagos, "vehículo", "vehículos")}`} />
              <span aria-hidden className="pt-6 text-xl text-tinta-suave">−</span>
              <Cuenta etiqueta="Salió" monto={salio} detalle={`en ${cantidad(resumen.cuantosGastos, "gasto", "gastos")}`} />
              <span aria-hidden className="pt-6 text-xl text-tinta-suave">=</span>
              <Cuenta etiqueta="Quedó" monto={ganancia} detalle={parte !== null ? `${parte} % de lo que entró` : undefined} fuerte />
            </dl>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <Bloque id="meses" titulo="Últimos 6 meses">
              <BarrasMeses meses={movimientos} elegido={mes} />
            </Bloque>

            <Bloque
              id="gastos"
              titulo="En qué se gastó"
              accion={
                <Link href={verGastos} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold hover:underline">
                  Ver todos los gastos
                  <ChevronRightIcon className="size-4" aria-hidden />
                </Link>
              }
            >
              {resumen.porCategoria.length === 0 ? (
                <p className="text-sm text-tinta-suave">Sin gastos registrados en {nombreMes(mes)}.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {resumen.porCategoria.map((c) => (
                    <li key={c.nombre} className="flex flex-col gap-1">
                      <span className="flex justify-between gap-4 text-sm">
                        <span>{c.nombre}</span>
                        <span className="font-semibold tabular-nums">{bsRedondo(c.total)}</span>
                      </span>
                      <span aria-hidden className="h-2 overflow-hidden rounded-full bg-neutro-fondo">
                        <span className="block h-full rounded-full bg-peligro" style={{ width: `${Math.round((c.total / resumen.porCategoria[0].total) * 100)}%` }} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Bloque>

            <Bloque id="taller" titulo="El taller en el mes">
              <dl className="grid grid-cols-2 gap-4">
                <Numero n={taller.entregados} texto={palabra(taller.entregados, "vehículo entregado", "vehículos entregados")} />
                <Numero n={taller.volvieron} texto={palabra(taller.volvieron, "cliente volvió", "clientes volvieron")} />
                <Numero n={taller.nuevos} texto={palabra(taller.nuevos, "vino por primera vez", "vinieron por primera vez")} />
                <Numero n={taller.avisados} texto={palabra(taller.avisados, "mantenimiento avisado", "mantenimientos avisados")} detalle={taller.avisados > 0 ? `${taller.reservaron} ya ${palabra(taller.reservaron, "reservó", "reservaron")}` : undefined} />
              </dl>
            </Bloque>

            <Bloque id="servicios" titulo="Servicios más pedidos">
              {taller.servicios.length === 0 ? (
                <p className="text-sm text-tinta-suave">Sin vehículos entregados en {nombreMes(mes)}.</p>
              ) : (
                <ol className="flex flex-col divide-y divide-border">
                  {taller.servicios.map((s, i) => (
                    <li key={s.nombre} className="flex items-baseline justify-between gap-4 py-2 first:pt-0 last:pb-0">
                      <span className="text-sm">
                        {s.nombre}
                        {i === 0 && taller.servicios.length > 1 && <span className="ml-2 text-xs font-semibold text-exito">El más pedido</span>}
                      </span>
                      <span className="text-sm font-semibold tabular-nums">{cantidad(s.veces, "vez", "veces")}</span>
                    </li>
                  ))}
                </ol>
              )}
            </Bloque>

            <Bloque id="cotizaciones" titulo="Cotizaciones">
              {taller.cotizaciones.enviadas === 0 ? (
                <p className="text-sm text-tinta-suave">Sin cotizaciones enviadas en {nombreMes(mes)}.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  <p className="text-sm">
                    De <strong className="tabular-nums">{taller.cotizaciones.enviadas}</strong> que enviaste, aceptaron <strong className="tabular-nums">{taller.cotizaciones.aceptadas}</strong>.
                    {taller.cotizaciones.motivos[0] && ` La razón más común para no aceptar fue ${NOMBRE_MOTIVO[taller.cotizaciones.motivos[0].motivo].toLowerCase()}.`}
                  </p>
                  {taller.cotizaciones.motivos.length > 0 && (
                    <dl className="flex flex-col gap-1 text-sm">
                      {taller.cotizaciones.motivos.map((m) => (
                        <div key={m.motivo} className="flex justify-between gap-4">
                          <dt className="text-tinta-media">{NOMBRE_MOTIVO[m.motivo]}</dt>
                          <dd className="font-semibold tabular-nums">{m.veces}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              )}
            </Bloque>
          </div>
        </>
      )}
      <p className="text-xs text-tinta-suave">Lo que entró sale de los pagos registrados; lo que salió, de los gastos.</p>
    </>
  );
}

/** Una sección del reporte: su título arriba y su tarjeta, como en las fichas. */
function Bloque({ id, titulo, accion, children }: { id: string; titulo: string; accion?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`${id}-titulo`} className="flex flex-col gap-2">
      <CabeceraSeccion id={id} titulo={titulo}>
        {accion}
      </CabeceraSeccion>
      <div className="tt-tarjeta-panel flex-1 p-4">{children}</div>
    </section>
  );
}

/** Entró, salió o quedó: la etiqueta, el monto grande y de dónde sale. */
function Cuenta({ etiqueta, monto, detalle, fuerte }: { etiqueta: string; monto: number; detalle?: string; fuerte?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-sm text-tinta-suave">{etiqueta}</dt>
      <dd className={cn("text-base font-bold whitespace-nowrap tabular-nums sm:text-2xl", fuerte && monto < 0 && "text-peligro")}>{bsRedondo(monto)}</dd>
      {detalle && <dd className="text-xs text-tinta-suave">{detalle}</dd>}
    </div>
  );
}

/** Un número del taller con lo que cuenta. */
function Numero({ n, texto, detalle }: { n: number; texto: string; detalle?: string }) {
  return (
    <div className="flex flex-col">
      <dt className="sr-only">{texto}</dt>
      <dd className="text-2xl font-bold tabular-nums">{n}</dd>
      <dd className="text-sm text-tinta-media">{texto}</dd>
      {detalle && <dd className="text-xs text-tinta-suave">{detalle}</dd>}
    </div>
  );
}
