import type { Metadata, Route } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { cn } from "cn";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { BarraLista } from "@/componentes/panel/barra-lista";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { EstadoVacio } from "@/componentes/panel/estado-vacio";
import { Filtros } from "@/componentes/panel/filtros";
import { PaginaPanel } from "@/componentes/panel/pagina-panel";
import { buttonVariants } from "@/componentes/ui/button";
import { cantidad } from "@/lib/cantidad";
import { fechaEnBolivia } from "@/lib/fechas";
import { exigirModulo } from "@/lib/sesion";
import { mostrarMonto } from "@/modulos/catalogo/reglas";
import { FilaGasto } from "@/modulos/reportes/componentes/fila-gasto";
import { RegistrarGasto } from "@/modulos/reportes/componentes/registrar-gasto";
import { categoriasActivas, gastosDelMes } from "@/modulos/reportes/consultas";
import { esMes, mesDe, nombreMes, primerDiaDeGastos, sumarMeses, tituloMes } from "@/modulos/reportes/reglas";

export const metadata: Metadata = { title: "Gastos" };

// Pedido 16 (P16-reportes-y-gastos.md §5): los gastos de un mes (`?mes=AAAA-MM`, por defecto el de hoy), con su total y
// el filtro por categoría (`?categoria=`). Cada gasto con su comprobante y "Anular gasto" en su "⋯", como un pago. Solo
// el dueño.

// Como en todo el panel: "1180,50 Bs"
const bs = (monto: string) => `${mostrarMonto(monto)} Bs`;

export default function PaginaGastos({ searchParams }: PageProps<"/panel/reportes/gastos">) {
  return (
    <PaginaPanel tipo="lista">
      <Suspense fallback={<Cargando />}>
        <Contenido searchParams={searchParams} />
      </Suspense>
    </PaginaPanel>
  );
}

async function Contenido({ searchParams }: Pick<PageProps<"/panel/reportes/gastos">, "searchParams">) {
  await exigirModulo("reportes");
  const parametros = await searchParams;
  const hoy = fechaEnBolivia();
  const esteMes = mesDe(hoy);
  // Desde el mes más viejo en que se registra un gasto (enero del año pasado) hasta el de hoy; uno raro, el de hoy
  const primerMes = mesDe(primerDiaDeGastos(hoy));
  const mes = esMes(parametros.mes) && parametros.mes <= esteMes && parametros.mes >= primerMes ? parametros.mes : esteMes;
  const [gastos, categorias] = await Promise.all([gastosDelMes(mes), categoriasActivas()]);

  const categoriaPedida = Number(parametros.categoria);
  // Las categorías con algún gasto en el mes (también uno anulado, o una categoría ya desactivada). La cuenta de cada
  // filtro es la de filas que muestra; el total, solo lo que cuenta (sin los anulados) y de lo que se ve
  const enElMes = [...new Map(gastos.map((g) => [g.categoriaId, g.categoria])).entries()];
  const filtro = enElMes.some(([id]) => id === categoriaPedida) ? categoriaPedida : null;
  const visibles = filtro ? gastos.filter((g) => g.categoriaId === filtro) : gastos;
  const vigentes = visibles.filter((g) => !g.anulado);
  const total = vigentes.reduce((suma, g) => suma + Number(g.monto), 0);
  const deQue = filtro ? `${enElMes.find(([id]) => id === filtro)![1]} en ${nombreMes(mes)}` : nombreMes(mes);

  const enlace = (m: string, categoria?: number | null) => {
    const p = new URLSearchParams();
    if (m !== esteMes) p.set("mes", m);
    if (categoria) p.set("categoria", String(categoria));
    const texto = p.toString();
    return `/panel/reportes/gastos${texto ? `?${texto}` : ""}` as Route;
  };

  return (
    <>
      <EncabezadoPagina titulo="Gastos" volver={{ href: "/panel/reportes?vista=gastos", texto: "Reportes" }} accion={<RegistrarGasto categorias={categorias} hoy={hoy} />} />
      <BarraLista
        // El mes primero: es lo que decide qué se ve; los filtros, al lado
        buscador={
          <nav aria-label="Meses" className="flex w-full items-center gap-2">
            {mes > primerMes ? (
              // Al cambiar de mes, el filtro se queda (si en el otro mes no hay de esa categoría, se ven todos)
              <Link href={enlace(sumarMeses(mes, -1), filtro)} className={cn(buttonVariants({ variant: "outline", size: "icon" }), "shrink-0")} aria-label="Mes anterior">
                <ChevronLeftIcon />
              </Link>
            ) : (
              <span aria-hidden className="size-9 shrink-0 pointer-coarse:size-11" />
            )}
            <p className="min-w-0 flex-1 text-center tt-titulo-seccion" aria-live="polite">
              {tituloMes(mes)}
            </p>
            {mes < esteMes ? (
              <Link href={enlace(sumarMeses(mes, 1), filtro)} className={cn(buttonVariants({ variant: "outline", size: "icon" }), "shrink-0")} aria-label="Mes siguiente">
                <ChevronRightIcon />
              </Link>
            ) : (
              // El mes que viene todavía no tiene gastos: el lugar queda, así el mes no se mueve
              <span aria-hidden className="size-9 shrink-0 pointer-coarse:size-11" />
            )}
          </nav>
        }
        filtros={
          enElMes.length > 1 ? (
            <Filtros
              etiqueta="Filtrar por categoría"
              filtros={[
                { href: enlace(mes), texto: "Todos", cuenta: gastos.length, activo: filtro === null },
                ...enElMes.map(([id, nombre]) => ({ href: enlace(mes, id), texto: nombre, cuenta: gastos.filter((g) => g.categoriaId === id).length, activo: filtro === id })),
              ]}
            />
          ) : undefined
        }
      />

      <section aria-label="Total del mes" className="tt-tarjeta-panel flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-4 py-3">
        <span className="text-sm text-tinta-media">Total de {deQue}</span>
        <span className="text-2xl font-bold tabular-nums">
          {bs(total.toFixed(2))}
          <span className="ml-2 text-sm font-normal text-tinta-suave">en {cantidad(vigentes.length, "gasto", "gastos")}</span>
        </span>
      </section>

      {visibles.length === 0 ? (
        <EstadoVacio>{`Todavía no hay gastos en ${nombreMes(mes)}.`}</EstadoVacio>
      ) : (
        <ul aria-label={`Gastos de ${nombreMes(mes)}`} className="tt-tarjeta-panel divide-y divide-border">
          {visibles.map((g) => (
            <FilaGasto key={g.id} g={g} />
          ))}
        </ul>
      )}
    </>
  );
}
