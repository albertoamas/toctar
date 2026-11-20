import Link from "next/link";
import type { Route } from "next";
import { cn } from "cn";

// La bienvenida del inicio (recorrido visual del 19/11, prototipo 3 aprobado): el saludo según la hora, la fecha, el día
// en una frase (lo atrasado en rojo) y las dos tareas de todos los días; debajo, separados por líneas, hasta tres
// números: en el taller, por cobrar y lo cobrado en el mes con su curva. Cada número lleva a su lista. Cada parte solo
// si quien entra ve ese módulo (los montos, solo con Pagos o Reportes; RN-12). Los números sin esquinas redondeadas: sus
// líneas de separación son rectas.

export type Cifra = { href: Route; titulo: string; valor: string; nota: React.ReactNode };

export function Bienvenida({
  saludo,
  fecha,
  dia,
  atrasos,
  hayAtrasos,
  acciones,
  cifras,
  mes,
}: {
  saludo: string;
  fecha: string;
  dia: string | null;
  atrasos: string | null;
  hayAtrasos: boolean;
  acciones: React.ReactNode;
  cifras: Cifra[];
  /** Lo cobrado en el mes, con su acumulado día a día para la curva (solo con Reportes). */
  mes: (Cifra & { acumulado: number[] }) | null;
}) {
  const todas = mes ? [...cifras, mes] : cifras;
  return (
    <section aria-labelledby="bienvenida-titulo" className="tt-tarjeta-panel flex flex-col gap-5 p-5 sm:gap-6 sm:px-8 sm:py-7">
      <div className="flex flex-wrap items-start justify-between gap-x-5 gap-y-4">
        <div className="flex min-w-0 flex-[1_1_28rem] flex-col">
          <h1 id="bienvenida-titulo" className="text-[1.45rem] font-bold tracking-tight sm:text-[1.75rem]">
            {saludo}
          </h1>
          <p className="mt-1 text-sm text-tinta-suave">{fecha}</p>
          {(dia || atrasos) && (
            <p className="mt-3 max-w-[52ch] leading-relaxed sm:text-[1.05rem]">
              {dia}
              {dia && atrasos && " "}
              {atrasos && <span className={cn(hayAtrasos && "font-semibold text-peligro")}>{atrasos}</span>}
            </p>
          )}
        </div>
        {acciones}
      </div>
      {todas.length > 0 && (
        <div
          className={cn(
            "grid grid-cols-2 gap-y-4 border-t border-border pt-4 sm:pt-5",
            // En la computadora, en una fila; lo del mes, más ancho por su curva
            todas.length === 3 && mes ? "@3xl:grid-cols-[1fr_1fr_1.6fr]" : todas.length === 3 ? "@3xl:grid-cols-3" : "",
          )}
        >
          {cifras.map((c, n) => (
            <Link
              key={c.titulo}
              href={c.href}
              className={cn(
                "flex min-w-0 flex-col gap-0.5 px-3.5 focus-visible:outline-offset-4 @3xl:px-6",
                // Una línea entre los números de la misma fila
                n % 2 === 0 ? "pl-0 @3xl:pl-0" : "border-l border-border",
                n > 0 && "@3xl:border-l @3xl:border-border",
                n === 0 && "@3xl:pl-0",
              )}
            >
              <CifraTextos c={c} />
            </Link>
          ))}
          {mes && (
            <Link
              href={mes.href}
              className={cn(
                "col-span-2 grid min-w-0 grid-cols-[auto_1fr] items-end gap-x-5 focus-visible:outline-offset-4 @3xl:col-span-1 @3xl:px-6",
                cifras.length > 0 && "border-t border-border pt-3.5 @3xl:border-t-0 @3xl:border-l @3xl:pt-0",
                cifras.length === 0 && "@3xl:pl-0",
              )}
            >
              <span className="flex flex-col gap-0.5">
                <CifraTextos c={mes} />
              </span>
              <Curva valores={mes.acumulado} />
            </Link>
          )}
        </div>
      )}
    </section>
  );
}

function CifraTextos({ c }: { c: Cifra }) {
  return (
    <>
      <span className="text-[0.8125rem] text-tinta-suave">{c.titulo}</span>
      <span className="text-xl font-bold tabular-nums sm:text-2xl">{c.valor}</span>
      <span className="text-[0.8125rem] text-tinta-suave">{c.nota}</span>
    </>
  );
}

/** La curva de lo cobrado en el mes, chica y sin ejes: solo la forma (el número ya está escrito al lado). */
function Curva({ valores }: { valores: number[] }) {
  if (valores.length < 2) return null;
  const ancho = 260;
  const alto = 44;
  const tope = Math.max(...valores, 1);
  const x = (i: number) => 2 + (i / (valores.length - 1)) * (ancho - 10);
  const y = (v: number) => 4 + (1 - v / tope) * (alto - 8);
  const puntos = valores.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const ultimo = valores.length - 1;
  return (
    <svg viewBox={`0 0 ${ancho} ${alto}`} className="block h-11 w-full max-w-[260px] justify-self-end" aria-hidden>
      <polygon points={`${x(0)},${alto} ${puntos} ${x(ultimo)},${alto}`} className="fill-grafico-ingreso" fillOpacity={0.1} />
      <polyline points={puntos} fill="none" className="stroke-grafico-ingreso" strokeWidth={2} strokeLinejoin="round" />
      <circle cx={x(ultimo)} cy={y(valores[ultimo])} r={3.5} className="fill-fondo stroke-grafico-ingreso" strokeWidth={2} />
    </svg>
  );
}
