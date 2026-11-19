import type { Metadata, Route } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { cn } from "cn";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { BarraLista, ResumenLista } from "@/componentes/panel/barra-lista";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { EstadoVacio } from "@/componentes/panel/estado-vacio";
import { Filtros } from "@/componentes/panel/filtros";
import { PaginaPanel } from "@/componentes/panel/pagina-panel";
import { buttonVariants } from "@/componentes/ui/button";
import { cantidad } from "@/lib/cantidad";
import { fechaEnBolivia } from "@/lib/fechas";
import { exigirModulo } from "@/lib/sesion";
import { AccionesDeGasto, celdasDeGasto, TarjetaGasto } from "@/modulos/reportes/componentes/fila-gasto";
import { TablaAcciones } from "@/componentes/panel/tabla-acciones";
import { ListaEnTarjeta } from "@/componentes/panel/fila-lista";
import { RegistrarGasto } from "@/modulos/reportes/componentes/registrar-gasto";
import { categoriasActivas, gastosDelMes } from "@/modulos/reportes/consultas";
import { bsExacto, esMes, mesDe, nombreMes, parametrosDelPeriodo, periodoDe, primerDiaDeGastos, sumarMeses, tituloMes } from "@/modulos/reportes/reglas";

export const metadata: Metadata = { title: "Gastos" };

// Pedido 16 (P16-reportes-y-gastos.md §5): los gastos de un mes (`?mes=AAAA-MM`, por defecto el de hoy), con su total y
// el filtro por categoría (`?categoria=`). Cada gasto con su comprobante y "Anular gasto" en su "⋯", como un pago. Solo
// el dueño.


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

  // Las fechas del reporte del que se vino (Reportes › Gastos): "Volver" regresa a ellas, también al cambiar de mes aquí
  const delReporte = parametros.periodo ? parametrosDelPeriodo(periodoDe(parametros, hoy)) : [];
  const volver = `/panel/reportes?${new URLSearchParams([["vista", "gastos"], ...delReporte]).toString()}` as Route;
  const enlace = (m: string, categoria?: number | null) => {
    const p = new URLSearchParams();
    if (m !== esteMes) p.set("mes", m);
    if (categoria) p.set("categoria", String(categoria));
    for (const [clave, valor] of delReporte) p.set(clave, valor);
    const texto = p.toString();
    return `/panel/reportes/gastos${texto ? `?${texto}` : ""}` as Route;
  };

  return (
    <>
      <EncabezadoPagina titulo="Gastos" volver={{ href: volver, texto: "Reportes" }} accion={<RegistrarGasto categorias={categorias} hoy={hoy} />} />
      <BarraLista
        // El mes entre sus flechas, a la derecha como la semana de la Agenda (C7 §4: nada centrado). Las dos flechas siempre
        // en su lugar: la que no se puede usar queda apagada (antes desaparecía y el mes quedaba corrido)
        derecha={
          <nav aria-label="Meses" className="flex w-full items-center gap-2 sm:w-auto">
            <FlechaMes href={mes > primerMes ? enlace(sumarMeses(mes, -1), filtro) : null} etiqueta="Mes anterior">
              <ChevronLeftIcon />
            </FlechaMes>
            <p className="min-w-0 flex-1 text-center tt-titulo-seccion sm:min-w-52" aria-live="polite">
              {tituloMes(mes)}
            </p>
            <FlechaMes href={mes < esteMes ? enlace(sumarMeses(mes, 1), filtro) : null} etiqueta="Mes siguiente">
              <ChevronRightIcon />
            </FlechaMes>
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
      {/* El total, como en las otras listas (Saldos): una línea arriba de la lista */}
      {visibles.length > 0 && (
        <ResumenLista>
          <strong className="font-semibold text-tinta tabular-nums">{bsExacto(total.toFixed(2))}</strong> en {cantidad(vigentes.length, "gasto", "gastos")} de {deQue}
          {vigentes.length < visibles.length && ` (y ${cantidad(visibles.length - vigentes.length, "anulado", "anulados")}, que no cuentan)`}
        </ResumenLista>
      )}

      {visibles.length === 0 ? (
        <EstadoVacio>{`Todavía no hay gastos en ${nombreMes(mes)}.`}</EstadoVacio>
      ) : (
        <>
          {/* En la computadora, una tabla como Saldos y Mantenimientos; más angosto, sus tarjetas */}
          <TablaAcciones
            etiqueta={`Gastos de ${nombreMes(mes)}`}
            columnas={[
              { titulo: "Fecha", ancho: "4.5rem" },
              { titulo: "Gasto", ancho: "minmax(0,1.6fr)" },
              { titulo: "Categoría", ancho: "minmax(0,1fr)" },
              { titulo: "Cómo se pagó", ancho: "8rem" },
              { titulo: "Monto", ancho: "7rem", alinear: "derecha" },
            ]}
            anchoAcciones="6rem"
            filas={visibles.map((g) => ({ clave: g.id, celdas: celdasDeGasto(g, hoy), acciones: <AccionesDeGasto g={g} /> }))}
          />
          <div className="@4xl:hidden">
            <ListaEnTarjeta etiqueta={`Gastos de ${nombreMes(mes)}`}>
              {visibles.map((g) => (
                <TarjetaGasto key={g.id} g={g} hoy={hoy} />
              ))}
            </ListaEnTarjeta>
          </div>
        </>
      )}
    </>
  );
}

/** Una flecha del mes: un enlace, o apagada en su mismo lugar si no hay a dónde ir (antes del primer mes o después de hoy). */
function FlechaMes({ href, etiqueta, children }: { href: Route | null; etiqueta: string; children: React.ReactNode }) {
  const clase = cn(buttonVariants({ variant: "outline", size: "icon" }), "shrink-0");
  return href ? (
    <Link href={href} className={clase} aria-label={etiqueta}>
      {children}
    </Link>
  ) : (
    <span aria-hidden className={cn(clase, "pointer-events-none opacity-40")}>
      {children}
    </span>
  );
}
