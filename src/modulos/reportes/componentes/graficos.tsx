import { cn } from "cn";
import { bsRedondo, escalaBonita, textoEje } from "../reglas";

// Los gráficos de Reportes (pedido 16, prototipo aprobado el 16/11). SVG simples, dibujados en el servidor, sin librería:
// eje con números redondos, líneas guía suaves, la punta de las barras redondeada sobre su base y el valor escrito en las
// marcas (el color nunca es lo único que dice algo). Cada gráfico lleva su descripción para el lector de pantalla y, al
// pasar el mouse o tocar, el detalle de cada mes (<title>). Colores: los tokens grafico-* de globals.css.
// Medidas: un viewBox de ~420 de ancho, que se ve bien de 320 px (celular) a 600 px (media computadora).

const FUENTE = { fontFamily: "Montserrat, system-ui, sans-serif" } as const;

/** "6,8 mil", "950": el total arriba de una barra apilada, con un decimal como mucho. */
const totalCorto = (v: number) => (v >= 1000 ? `${(Math.round(v / 100) / 10).toString().replace(".", ",")} mil` : String(Math.round(v)));

type Eje = { y: (v: number) => number; lineas: { v: number; y: number }[] };

function eje(maximo: number, y0: number, yTope: number, entero = false): Eje {
  const { tope, paso } = escalaBonita(maximo, 4, entero);
  const y = (v: number) => y0 - (v / tope) * (y0 - yTope);
  const lineas = [];
  for (let v = 0; v <= tope; v += paso) lineas.push({ v, y: y(v) });
  return { y, lineas };
}

function Guias({ e, x0, x1, formato = textoEje }: { e: Eje; x0: number; x1: number; formato?: (v: number) => string }) {
  return (
    <g aria-hidden>
      {e.lineas.map((l) => (
        <g key={l.v}>
          <line x1={x0} x2={x1} y1={l.y} y2={l.y} className={l.v === 0 ? "stroke-grafico-eje" : "stroke-grafico-guia"} strokeWidth={1} />
          <text x={x0 - 6} y={l.y + 4} textAnchor="end" fontSize={11} className="fill-tinta-suave" style={FUENTE}>
            {formato(l.v)}
          </text>
        </g>
      ))}
    </g>
  );
}

/** La leyenda: un cuadrito (o una raya, para una línea) con su nombre. */
export function Leyenda({ items }: { items: { nombre: string; clase: string; linea?: boolean; punteada?: boolean }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-tinta-media">
      {items.map((i) => (
        <li key={i.nombre} className="flex items-center gap-1.5">
          <span aria-hidden className={cn(i.linea ? (i.punteada ? "h-0 w-4 border-t-2 border-dashed" : "h-0.5 w-4 rounded-full") : "size-2.5 rounded-[3px]", i.clase)} />
          {i.nombre}
        </li>
      ))}
    </ul>
  );
}

/** Varias series en líneas con puntos, una por mes (los entregados; los clientes nuevos y los que volvieron). */
export function LineasMeses({ meses, series, elegido, conValores }: { meses: { mes: string; corto: string }[]; series: { nombre: string; clase: string; claseRelleno: string; valores: number[] }[]; elegido: string; conValores?: boolean }) {
  const x0 = 36, x1 = 416, y0 = 170, yTope = 18;
  // Cantidades (vehículos, clientes): el eje va de a enteros, nunca "0,25 vehículos"
  const e = eje(Math.max(...series.flatMap((s) => s.valores), 0), y0, yTope, true);
  const grupo = (x1 - x0) / meses.length;
  const x = (i: number) => x0 + grupo * i + grupo / 2;
  return (
    <svg viewBox="0 0 420 194" role="img" aria-label={series.map((s) => `${s.nombre}: ${meses.map((m, i) => `${m.corto} ${s.valores[i]}`).join(", ")}`).join("; ")} className="block w-full">
      <Guias e={e} x0={x0} x1={x1} formato={String} />
      {meses.map((m, i) => (
        <text key={m.mes} x={x(i)} y={y0 + 18} textAnchor="middle" fontSize={13} fontWeight={m.mes === elegido ? 700 : 500} className={m.mes === elegido ? "fill-tinta" : "fill-tinta-suave"} style={FUENTE}>
          {m.corto}
        </text>
      ))}
      {series.map((s) => (
        <g key={s.nombre}>
          <path d={s.valores.map((v, i) => `${i ? "L" : "M"}${x(i)} ${e.y(v)}`).join("")} fill="none" strokeWidth={2.5} strokeLinejoin="round" className={s.clase} />
          {s.valores.map((v, i) => (
            <g key={i}>
              <circle cx={x(i)} cy={e.y(v)} r={4} strokeWidth={2} className={cn(s.claseRelleno, "stroke-fondo")} />
              {conValores && (
                <text x={x(i)} y={e.y(v) - 10} textAnchor="middle" fontSize={11} fontWeight={600} className="fill-tinta" style={FUENTE}>
                  {v}
                </text>
              )}
            </g>
          ))}
        </g>
      ))}
    </svg>
  );
}

/** Barras apiladas por mes (los gastos de cada categoría), con el total arriba; 2 px entre partes. */
export function BarrasApiladas({ meses, categorias }: { meses: { mes: string; corto: string; nombre: string; partes: number[] }[]; categorias: { nombre: string; clase: string }[] }) {
  const x0 = 44, x1 = 416, y0 = 184, yTope = 22;
  const e = eje(Math.max(...meses.map((m) => m.partes.reduce((a, b) => a + b, 0)), 0), y0, yTope);
  const grupo = (x1 - x0) / meses.length;
  const ancho = Math.min(34, grupo - 12);
  return (
    <svg viewBox="0 0 420 206" role="img" aria-label={`Gastos por categoría: ${meses.map((m) => `${m.nombre}, ${categorias.map((c, k) => `${c.nombre} ${bsRedondo(m.partes[k])}`).join(", ")}`).join("; ")}`} className="block w-full">
      <Guias e={e} x0={x0} x1={x1} />
      {meses.map((m, i) => {
        const xc = x0 + grupo * i + grupo / 2;
        let base = y0;
        const total = m.partes.reduce((a, b) => a + b, 0);
        return (
          <g key={m.mes}>
            <title>{`${m.nombre}: ${categorias.map((c, k) => `${c.nombre} ${bsRedondo(m.partes[k])}`).join(", ")}`}</title>
            {m.partes.map((v, k) => {
              const alto = y0 - e.y(v);
              if (alto <= 0) return null;
              const rect = <rect key={k} x={xc - ancho / 2} y={base - alto + 1} width={ancho} height={Math.max(alto - 2, 1)} rx={2} className={categorias[k].clase} />;
              base -= alto;
              return rect;
            })}
            {total > 0 && (
              <text x={xc} y={e.y(total) - 7} textAnchor="middle" fontSize={11} fontWeight={600} className="fill-tinta" style={FUENTE}>
                {totalCorto(total)}
              </text>
            )}
            <text x={xc} y={y0 + 18} textAnchor="middle" fontSize={13} className="fill-tinta-suave" style={FUENTE}>
              {m.corto}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Barras horizontales con su nombre y su valor escritos (formas de pago, categorías, servicios, el embudo). */
export function BarrasHorizontales({ filas, alta }: { filas: { nombre: string; valor: number; texto: React.ReactNode; clase: string }[]; alta?: boolean }) {
  const maximo = Math.max(...filas.map((f) => f.valor), 0);
  return (
    <ul className="flex flex-col gap-3.5">
      {filas.map((f) => (
        <li key={f.nombre} className="flex flex-col gap-1.5">
          <span className="flex justify-between gap-3 text-sm">
            <span>{f.nombre}</span>
            <span className="tabular-nums">{f.texto}</span>
          </span>
          <span aria-hidden className={cn("block rounded-full bg-fondo-panel", alta ? "h-3" : "h-2")}>
            <span className={cn("block h-full rounded-full", f.clase)} style={{ width: `${maximo > 0 ? Math.max((f.valor / maximo) * 100, f.valor > 0 ? 2 : 0) : 0}%` }} />
          </span>
        </li>
      ))}
    </ul>
  );
}
