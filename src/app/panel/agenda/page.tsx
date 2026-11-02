import type { Metadata, Route } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { cn } from "cn";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "lucide-react";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { buttonVariants } from "@/componentes/ui/button";
import { fechaEnBolivia, fechaExiste, sumarDias } from "@/lib/fechas";
import { puedeVerModulo } from "@/lib/permisos";
import { exigirModulo } from "@/lib/sesion";
import { AgendaDelDia, TableroSemana } from "@/modulos/agenda/componentes/tablero";
import { semanaDeAgenda } from "@/modulos/agenda/consultas";
import { DIA_CORTO, diasDeLaSemana, lunesDeLaSemana, numeroDia, textoDia, textoSemana, textoSemanaCorto } from "@/modulos/agenda/reglas";

export const metadata: Metadata = { title: "Agenda" };

// HU-29: el tablero de la agenda (RF-38). `?semana=` (cualquier día de la semana; se toma su lunes) y, en el celular,
// `?dia=` (el día que se ve). Dueño o encargado con "Agenda"; el técnico nunca (sus órdenes llegan en C4).
// Pulido 10.1: el tablero de la semana desde 1024 px (en la tableta las cintas no se leían); hasta ahí, un día a la vez.
// La semana se recorre en un renglón: flecha, la semana (corta en el celular), flecha y "Hoy".
export default function PaginaAgenda({ searchParams }: PageProps<"/panel/agenda">) {
  return (
    <section className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Agenda"
        accion={
          // Enlace con forma de botón: lleva a otra pantalla
          <Link href="/panel/agenda/nueva" className={cn(buttonVariants())}>
            <PlusIcon />
            Nueva reserva
          </Link>
        }
      />
      <Suspense fallback={<Cargando />}>
        <Tablero searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

const enlaceSemana = (lunes: string, dia?: string) => `/panel/agenda?semana=${lunes}${dia ? `&dia=${dia}` : ""}` as Route;

async function Tablero({ searchParams }: Pick<PageProps<"/panel/agenda">, "searchParams">) {
  const usuario = await exigirModulo("agenda");
  const conOrdenes = puedeVerModulo(usuario, "ordenes");
  const { semana: pedida, dia: diaPedido } = await searchParams;
  const hoy = fechaEnBolivia();
  // Del 2000 al 2100: con años extremos las fechas dejan de tener cuatro cifras y la base las rechaza
  const valida = typeof pedida === "string" && fechaExiste(pedida) && pedida >= "2000-01-01" && pedida <= "2100-12-31";
  const lunes = lunesDeLaSemana(valida ? pedida : hoy);
  const dias = diasDeLaSemana(lunes);
  // En el celular: el día pedido si es de esta semana; si no, hoy (si cae en ella) o el lunes
  const dia = typeof diaPedido === "string" && dias.includes(diaPedido) ? diaPedido : dias.includes(hoy) ? hoy : lunes;
  const semana = await semanaDeAgenda(lunes, dias[6]);
  const estaSemana = dias.includes(hoy);

  return (
    <>
      {/* Un renglón: la semana entre las flechas; en el celular, corta ("26 oct al 1 nov") para que entre */}
      <nav aria-label="Semanas" className="flex items-center gap-2">
        <Link href={enlaceSemana(sumarDias(lunes, -7))} className={cn(buttonVariants({ variant: "outline", size: "icon" }), "shrink-0")} aria-label="Semana anterior">
          <ChevronLeftIcon />
        </Link>
        <p className="min-w-0 text-center tt-titulo-seccion" aria-live="polite">
          <span className="sm:hidden">{textoSemanaCorto(lunes)}</span>
          <span className="hidden sm:inline">{textoSemana(lunes)}</span>
        </p>
        <Link href={enlaceSemana(sumarDias(lunes, 7))} className={cn(buttonVariants({ variant: "outline", size: "icon" }), "shrink-0")} aria-label="Semana siguiente">
          <ChevronRightIcon />
        </Link>
        {!estaSemana && (
          <Link href="/panel/agenda" className={cn(buttonVariants({ variant: "outline" }), "ml-auto shrink-0")}>
            Hoy
          </Link>
        )}
      </nav>

      {semana.espacios.length === 0 ? (
        <p className="text-tinta-suave">No hay espacios activos. Agrégalos en Configuración, «Taller».</p>
      ) : (
        <>
          <TableroSemana semana={semana} dias={dias} hoy={hoy} conOrdenes={conOrdenes} />

          {/* Celular y tableta: los siete días como pestañas (enlaces: el día va en la dirección). La marcada dice qué
              día se ve y, si es hoy, su número va en rojo */}
          <nav aria-label="Días de la semana" className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0 lg:hidden">
            <ul className="grid min-w-max grid-cols-7 gap-1">
              {dias.map((d, i) => (
                <li key={d}>
                  <Link
                    href={enlaceSemana(lunes, d)}
                    aria-current={d === dia ? "date" : undefined}
                    aria-label={`${textoDia(d)}${d === hoy ? ", hoy" : ""}`}
                    className={cn(
                      "flex min-h-11 min-w-11 flex-col items-center justify-center border-b-2 px-1 text-xs",
                      d === dia ? "border-tinta font-semibold text-tinta" : "border-transparent text-tinta-suave",
                    )}
                  >
                    <span>{DIA_CORTO[i]}</span>
                    <span className={cn("text-base", d === hoy && "font-bold text-info")}>{numeroDia(d)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <AgendaDelDia semana={semana} dia={dia} hoy={hoy} conOrdenes={conOrdenes} />
        </>
      )}
    </>
  );
}
