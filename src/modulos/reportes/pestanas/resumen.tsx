import "server-only";
import Link from "next/link";
import { BanknoteIcon, CalculatorIcon, CarFrontIcon, ReceiptTextIcon } from "lucide-react";
import { cn } from "cn";
import { Seccion } from "@/componentes/panel/cabecera-seccion";
import { cobradoPorServicio } from "../calculos";
import { Dona, GraficoSerie, ListaProgreso } from "../componentes/graficos";
import { bsRedondo } from "../reglas";
import { Cambio, cambioDe, colorDeServicio, Indicadores, porciento, puntosDe, SinDatos, type Cargado } from "./comun";

// Resumen (Reportes v2, 19/11): cuánto se cobró, cuánto se gastó, qué quedó y las órdenes completadas. Debajo, el
// resultado en una dona con su desglose, los 3 servicios que más cobraron y la evolución de ingresos y gastos.

export function Resumen({ c }: { c: Cargado }) {
  const { act, ant, periodo } = c;
  const vs = periodo.vs;
  const esHoy = periodo.clave === "hoy";
  const servicios = cobradoPorServicio(c.datos.cobros, c.datos.lineas);
  const margen = act.ingresos > 0 ? Math.round((act.resultado / act.ingresos) * 100) : null;
  const perdida = act.resultado < 0;
  return (
    <>
      <Indicadores
        etiqueta="Resumen del período"
        items={[
          { icono: BanknoteIcon, titulo: "Ingresos cobrados", valor: bsRedondo(act.ingresos), nota: <Cambio cambio={cambioDe(act.ingresos, ant.ingresos)} contra={vs} /> },
          { icono: ReceiptTextIcon, titulo: "Gastos", valor: bsRedondo(act.gastos), nota: <Cambio cambio={cambioDe(act.gastos, ant.gastos)} contra={vs} subirEsMalo /> },
          {
            icono: CalculatorIcon,
            titulo: "Resultado",
            valor: bsRedondo(act.resultado),
            // Con una pérdida, el % confunde: se dice con palabras
            nota: <Cambio cambio={perdida || ant.resultado <= 0 ? null : cambioDe(act.resultado, ant.resultado)} contra={vs} sinCambio={perdida ? "Salió más de lo que entró" : ant.resultado < 0 ? "Antes salió más de lo que entró" : undefined} />,
          },
          { icono: CarFrontIcon, titulo: "Órdenes completadas", valor: String(act.completadas), nota: <Cambio cambio={cambioDe(act.completadas, ant.completadas)} contra={vs} /> },
        ]}
      />
      <div className="grid gap-x-4 gap-y-6 lg:grid-cols-2">
        <Seccion id="resultado" titulo="Resultado del período" descripcion="Cuánto de lo cobrado queda después de los gastos.">
          {act.ingresos === 0 && act.gastos === 0 ? (
            <SinDatos>Sin cobros ni gastos en estas fechas.</SinDatos>
          ) : (
            <div className="flex flex-col items-center gap-5 sm:flex-row">
              <div className="w-48 shrink-0">
                <Dona
                  formato="bs"
                  porciones={[
                    { nombre: "Queda", valor: Math.max(0, act.resultado), color: "var(--grafico-ingreso)" },
                    { nombre: "Gastos", valor: act.gastos, color: "var(--grafico-gasto)" },
                  ]}
                  centro={margen === null ? "—" : `${margen} %`}
                  centroTexto={perdida ? "de pérdida" : "de margen"}
                  centroColor={perdida ? "var(--peligro)" : "var(--exito)"}
                />
              </div>
              <dl className="flex w-full flex-col text-sm">
                <div className="flex justify-between gap-3 py-2">
                  <dt>Ingresos cobrados</dt>
                  <dd className="tabular-nums">{bsRedondo(act.ingresos)}</dd>
                </div>
                <div className="flex justify-between gap-3 border-t border-border/60 py-2">
                  <dt className="flex items-center gap-2">
                    <span aria-hidden className="size-2.5 rounded-[3px] bg-grafico-gasto" />
                    Gastos
                  </dt>
                  <dd className="tabular-nums">−{bsRedondo(act.gastos)}</dd>
                </div>
                <div className="flex justify-between gap-3 border-t border-border py-2 font-bold">
                  <dt>Resultado</dt>
                  <dd className={cn("tabular-nums", perdida ? "text-peligro" : "text-exito")}>{bsRedondo(act.resultado)}</dd>
                </div>
              </dl>
            </div>
          )}
        </Seccion>
        <Seccion
          id="servicios"
          titulo="Ingresos por servicio"
          descripcion="Lo cobrado, repartido por servicio. Los 3 primeros."
          accion={
            <Link href={c.enlace("ingresos")} className="text-sm font-semibold text-info hover:underline">
              Ver todos
            </Link>
          }
        >
          {servicios.length ? (
            <ListaProgreso
              etiqueta="Ingresos por servicio"
              inicial={3}
              filas={servicios.slice(0, 3).map((s) => ({ clave: String(s.servicioId), nombre: s.nombre, sub: `${s.veces} ${s.veces === 1 ? "orden" : "órdenes"}`, valor: bsRedondo(s.total), extra: `${porciento(s.total, act.ingresos)} %`, parte: porciento(s.total, servicios[0].total), color: colorDeServicio(c, s.servicioId) }))}
            />
          ) : (
            <SinDatos>Sin cobros en estas fechas.</SinDatos>
          )}
        </Seccion>
      </div>
      <Seccion
        id="evolucion"
        titulo={esHoy ? "Ingresos de hoy" : `Ingresos y gastos, ${c.por}`}
        descripcion={esHoy ? `Por hora, en Bs. Los gastos se registran por día, sin hora: hoy van ${bsRedondo(act.gastos)}.` : "En bolivianos (Bs)."}
      >
        {c.tramos.length === 0 || (act.ingresos === 0 && act.gastos === 0) ? (
          <SinDatos>{esHoy ? "Todavía no hay cobros hoy." : "Sin cobros ni gastos en estas fechas."}</SinDatos>
        ) : esHoy ? (
          <GraficoSerie formato="bs" series={[{ nombre: "Ingresos", color: "var(--grafico-ingreso)", area: true }]} puntos={puntosDe(c, (p) => [p.ingresos])} />
        ) : (
          <GraficoSerie
            formato="bs"
            series={[
              { nombre: "Ingresos", color: "var(--grafico-ingreso)" },
              { nombre: "Gastos", color: "var(--grafico-gasto)" },
            ]}
            puntos={puntosDe(c, (p) => [p.ingresos, p.gastos])}
          />
        )}
      </Seccion>
    </>
  );
}
