import type { Metadata, Route } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { cn } from "cn";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "lucide-react";
import { Cargando } from "@/componentes/panel/cargando";
import { buttonVariants } from "@/componentes/ui/button";
import { fechaEnBolivia, fechaExiste, sumarDias } from "@/lib/fechas";
import { exigirModulo } from "@/lib/sesion";
import { AgendaDelDia, TableroSemana } from "@/modulos/agenda/componentes/tablero";
import { semanaDeAgenda } from "@/modulos/agenda/consultas";
import { DIA_CORTO, diasDeLaSemana, lunesDeLaSemana, numeroDia, textoDia, textoSemana } from "@/modulos/agenda/reglas";

export const metadata: Metadata = { title: "Agenda" };

// HU-29: el tablero de la agenda (RF-38). `?semana=` (cualquier día de la semana; se toma su lunes) y, en el celular,
// `?dia=` (el día que se ve). Dueño o encargado con "Agenda"; el técnico nunca (sus órdenes llegan en C4).
export default function PaginaAgenda({ searchParams }: PageProps<"/panel/agenda">) {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading text-4xl font-extrabold italic">Agenda</h1>
        {/* Enlace con forma de botón: lleva a otra pantalla */}
        <Link href="/panel/agenda/nueva" className={cn(buttonVariants())}>
          <PlusIcon />
          Nueva reserva
        </Link>
      </div>
      <Suspense fallback={<Cargando />}>
        <Tablero searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

const enlaceSemana = (lunes: string, dia?: string) => `/panel/agenda?semana=${lunes}${dia ? `&dia=${dia}` : ""}` as Route;

async function Tablero({ searchParams }: Pick<PageProps<"/panel/agenda">, "searchParams">) {
  await exigirModulo("agenda");
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
      <nav aria-label="Semanas" className="flex flex-wrap items-center gap-2">
        <Link href={enlaceSemana(sumarDias(lunes, -7))} className={cn(buttonVariants({ variant: "outline", size: "icon" }))} aria-label="Semana anterior">
          <ChevronLeftIcon />
        </Link>
        <Link href={enlaceSemana(sumarDias(lunes, 7))} className={cn(buttonVariants({ variant: "outline", size: "icon" }))} aria-label="Semana siguiente">
          <ChevronRightIcon />
        </Link>
        <p className="font-heading text-2xl font-bold italic" aria-live="polite">
          {textoSemana(lunes)}
        </p>
        {!estaSemana && (
          <Link href="/panel/agenda" className={cn(buttonVariants({ variant: "outline" }), "sm:ml-auto")}>
            Hoy
          </Link>
        )}
      </nav>

      {semana.espacios.length === 0 ? (
        <p className="text-tinta-suave">No hay espacios activos. Agrégalos en Configuración, «Taller».</p>
      ) : (
        <>
          <TableroSemana semana={semana} dias={dias} hoy={hoy} />

          {/* Celular: los siete días como pestañas (enlaces: el día va en la dirección) */}
          <nav aria-label="Días de la semana" className="-mx-4 overflow-x-auto px-4 md:hidden">
            <ul className="grid min-w-max grid-cols-7 gap-1">
              {dias.map((d, i) => (
                <li key={d}>
                  <Link
                    href={enlaceSemana(lunes, d)}
                    aria-current={d === dia ? "date" : undefined}
                    aria-label={`${textoDia(d)}${d === hoy ? ", hoy" : ""}`}
                    className={cn(
                      "flex min-h-11 min-w-11 flex-col items-center justify-center border-b-2 px-1 text-xs",
                      d === dia ? "border-rojo font-semibold text-tinta" : "border-transparent text-tinta-suave",
                    )}
                  >
                    <span>{DIA_CORTO[i]}</span>
                    <span className={cn("text-base", d === hoy && "font-bold text-rojo-texto")}>{numeroDia(d)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <p className="font-semibold md:hidden">
            {textoDia(dia)}
            {dia === hoy && <span className="text-rojo-texto">, hoy</span>}
          </p>
          <AgendaDelDia semana={semana} dia={dia} hoy={hoy} />
        </>
      )}
    </>
  );
}
