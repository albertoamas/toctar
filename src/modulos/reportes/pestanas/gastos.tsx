import "server-only";
import type { Route } from "next";
import Link from "next/link";
import { HashIcon, PercentIcon, ReceiptTextIcon } from "lucide-react";
import { Seccion } from "@/componentes/panel/cabecera-seccion";
import { gastadoPorCategoria } from "../calculos";
import { GraficoSerie, ListaProgreso } from "../componentes/graficos";
import { bsRedondo, mesDe, parametrosDelPeriodo } from "../reglas";
import { Cambio, cambioDe, Indicadores, porciento, puntosDe, SinDatos, type Cargado } from "./comun";

// Gastos (Reportes v2, 19/11): lo gastado, cuántos gastos se registraron y qué parte de lo cobrado se fue en gastos.
// Lo gastado por tramo (un día sin gastos queda en cero) y por categoría. Los gastos se registran en Gastos (el menú),
// no aquí: Reportes solo se lee (19/11, a pedido del dueño).

export function Gastos({ c }: { c: Cargado }) {
  const { act, ant, periodo } = c;
  const vs = periodo.vs;
  const esHoy = periodo.clave === "hoy";
  const categorias = gastadoPorCategoria(c.datos.gastos);
  // La lista de gastos del mes en que terminan las fechas, que vuelve a Reportes con las mismas fechas
  const lista = `/panel/reportes/gastos?${new URLSearchParams([["mes", mesDe(periodo.fin)], ...parametrosDelPeriodo(periodo)]).toString()}` as Route;
  return (
    <>
      <Indicadores
        etiqueta="Gastos del período"
        items={[
          { icono: ReceiptTextIcon, titulo: "Total gastado", valor: bsRedondo(act.gastos), nota: <Cambio cambio={cambioDe(act.gastos, ant.gastos)} contra={vs} subirEsMalo /> },
          { icono: HashIcon, titulo: "Movimientos", valor: String(act.movimientos), nota: act.movimientos === 1 ? "gasto registrado" : "gastos registrados" },
          { icono: PercentIcon, titulo: "Sobre los ingresos", valor: act.ingresos > 0 ? `${porciento(act.gastos, act.ingresos)} %` : "—", nota: act.ingresos > 0 ? "Lo cobrado que se fue en gastos" : "Sin cobros en estas fechas" },
        ]}
      />
      <Seccion id="gastos-tramo" titulo={esHoy ? "Gastos de hoy" : `Gastos ${c.por}`} descripcion={esHoy ? "Se registran por día, sin hora: por eso no van en un gráfico por hora." : "En bolivianos (Bs). Los días sin gastos quedan en cero."}>
        {esHoy ? (
          <SinDatos>{act.gastos > 0 ? `Hoy van ${bsRedondo(act.gastos)} en ${act.movimientos} ${act.movimientos === 1 ? "gasto" : "gastos"}.` : "Todavía no se registró ningún gasto hoy."}</SinDatos>
        ) : act.gastos === 0 ? (
          <SinDatos>Sin gastos en estas fechas.</SinDatos>
        ) : (
          <GraficoSerie formato="bs" series={[{ nombre: "Gastos", color: "var(--grafico-gasto)", area: true }]} puntos={puntosDe(c, (p) => [p.gastos])} />
        )}
      </Seccion>
      <Seccion
        id="categorias"
        titulo="Gastos por categoría"
        descripcion={`Total: ${bsRedondo(act.gastos)}.`}
        accion={
          <Link href={lista} className="text-sm font-semibold text-info hover:underline">
            Ver la lista de gastos
          </Link>
        }
      >
        {categorias.length ? (
          <ListaProgreso
            etiqueta="Gastos por categoría"
            inicial={8}
            color="var(--grafico-gasto)"
            filas={categorias.map((g) => ({ clave: g.categoria, nombre: g.categoria, sub: `${g.movimientos} ${g.movimientos === 1 ? "gasto" : "gastos"}`, valor: bsRedondo(g.total), extra: `${porciento(g.total, act.gastos)} %`, parte: porciento(g.total, categorias[0].total) }))}
          />
        ) : (
          <SinDatos>Sin gastos en estas fechas.</SinDatos>
        )}
      </Seccion>
    </>
  );
}
