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

/** La punta redondeada (4) y la base recta, sobre la línea de 0. */
function barra(x: number, ancho: number, base: number, tope: number) {
  if (base - tope < 0.5) return "";
  const r = Math.min(4, (base - tope) / 2, ancho / 2);
  return `M${x} ${base}V${tope + r}Q${x} ${tope} ${x + r} ${tope}H${x + ancho - r}Q${x + ancho} ${tope} ${x + ancho} ${tope + r}V${base}Z`;
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

/**
 * Lo neto del mes: de lo que entró, qué parte quedó (esmeralda) y qué parte se fue en gastos (rojo). Una dona de dos
 * partes con el % que quedó en el centro. Con pérdida, toda la dona es gasto y lo dice.
 */
export function TortaNeto({ entro, salio }: { entro: number; salio: number }) {
  if (entro === 0 && salio === 0) return <p className="py-10 text-center text-sm text-tinta-suave">Sin ingresos ni gastos en el mes.</p>;
  const quedo = Math.max(0, entro - salio);
  const fraccion = entro > 0 ? quedo / entro : 0;
  const C = 2 * Math.PI * 76;
  const hueco = fraccion > 0 && fraccion < 1 ? 4 : 0;
  const largoQuedo = C * fraccion;
  const parte = Math.round(fraccion * 100);
  return (
    <div className="flex flex-col gap-4">
      <svg viewBox="0 0 200 200" role="img" aria-label={`De ${bsRedondo(entro)} que entraron, quedaron ${bsRedondo(quedo)} (${parte} %) y se gastaron ${bsRedondo(salio)}`} className="mx-auto block w-full max-w-48">
        <circle cx={100} cy={100} r={76} fill="none" strokeWidth={28} className="stroke-grafico-gasto" strokeDasharray={`${Math.max(C - largoQuedo - hueco, 0)} ${C}`} strokeDashoffset={-largoQuedo} transform="rotate(-90 100 100)" />
        {fraccion > 0 && <circle cx={100} cy={100} r={76} fill="none" strokeWidth={28} className="stroke-grafico-ingreso" strokeDasharray={`${Math.max(largoQuedo - hueco, 0)} ${C}`} transform="rotate(-90 100 100)" />}
        <text x={100} y={100} textAnchor="middle" fontSize={30} fontWeight={700} className="fill-tinta" style={FUENTE}>
          {parte} %
        </text>
        <text x={100} y={123} textAnchor="middle" fontSize={13} className="fill-tinta-media" style={FUENTE}>
          {entro - salio < 0 ? "hubo pérdida" : "quedó"}
        </text>
      </svg>
      <dl className="flex flex-col gap-2 text-sm">
        {[
          { nombre: "Quedó", monto: quedo, parte, clase: "bg-grafico-ingreso" },
          { nombre: "Gastos", monto: salio, parte: entro > 0 ? 100 - parte : 0, clase: "bg-grafico-gasto" },
        ].map((f) => (
          <div key={f.nombre} className="flex justify-between gap-3">
            <dt className="flex items-center gap-2">
              <span aria-hidden className={cn("size-2.5 rounded-[3px]", f.clase)} />
              {f.nombre}
            </dt>
            <dd className="tabular-nums">
              <span className="font-bold">{bsRedondo(f.monto)}</span>
              <span className="text-tinta-suave"> · {f.parte} %</span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export type MesConMontos = { mes: string; corto: string; nombre: string; entro: number; salio: number };

/**
 * Ingresos y gastos de cada mes en barras, con la línea de la ganancia encima (todo en Bs, en un solo eje). Dibujado en
 * dos medidas (angosta en el celular, ancha desde la tableta): el SVG se escala con su caja, y así la letra del eje queda
 * siempre en unos 11 a 13 px (Resumen, 17/11: en la tableta salía enorme y en el celular diminuta).
 */
export function BarrasConLinea(props: { meses: MesConMontos[]; elegido: string }) {
  return (
    <>
      <div className="md:hidden">
        <BarrasConLineaSvg {...props} ancho={340} alto={220} />
      </div>
      <div className="hidden md:block">
        <BarrasConLineaSvg {...props} ancho={640} alto={260} />
      </div>
    </>
  );
}

function BarrasConLineaSvg({ meses, elegido, ancho: w, alto: h }: { meses: MesConMontos[]; elegido: string; ancho: number; alto: number }) {
  const x0 = 44, x1 = w - 4, y0 = h - 28, yTope = 14;
  const e = eje(Math.max(...meses.flatMap((m) => [m.entro, m.salio])), y0, yTope);
  const grupo = (x1 - x0) / meses.length;
  const ancho = Math.min(22, grupo / 2 - 4);
  const xc = (i: number) => x0 + grupo * i + grupo / 2;
  // La ganancia; un mes con pérdida, en la línea de 0 y con su punto en rojo (el monto, en el detalle del mes)
  const ganancia = meses.map((m, i) => ({ x: xc(i), y: e.y(Math.max(0, m.entro - m.salio)), perdida: m.entro - m.salio < 0 }));
  return (
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`Ingresos, gastos y ganancia: ${meses.map((m) => `${m.nombre}, entró ${bsRedondo(m.entro)} y salió ${bsRedondo(m.salio)}`).join("; ")}`} className="block w-full">
      <Guias e={e} x0={x0} x1={x1} />
      {meses.map((m, i) => (
        <g key={m.mes}>
          <title>{`${m.nombre}: entró ${bsRedondo(m.entro)}, salió ${bsRedondo(m.salio)}, quedó ${bsRedondo(m.entro - m.salio)}`}</title>
          <rect x={x0 + grupo * i + 2} y={yTope - 6} width={grupo - 4} height={y0 - yTope + 6} rx={6} className={m.mes === elegido ? "fill-fondo-panel" : "fill-transparent"} />
          <path d={barra(xc(i) - ancho - 1, ancho, y0, e.y(m.entro))} className="fill-grafico-ingreso" />
          <path d={barra(xc(i) + 1, ancho, y0, e.y(m.salio))} className="fill-grafico-gasto" />
          <text x={xc(i)} y={y0 + 19} textAnchor="middle" fontSize={12} fontWeight={m.mes === elegido ? 700 : 500} className={m.mes === elegido ? "fill-tinta" : "fill-tinta-suave"} style={FUENTE}>
            {m.corto}
          </text>
        </g>
      ))}
      <path d={ganancia.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join("")} fill="none" strokeWidth={2} strokeLinejoin="round" className="stroke-tinta" pointerEvents="none" />
      {ganancia.map((p) => (
        <circle key={p.x} cx={p.x} cy={p.y} r={p.perdida ? 4.5 : 3.5} strokeWidth={2} className={cn(p.perdida ? "fill-peligro" : "fill-tinta", "stroke-fondo")} pointerEvents="none" />
      ))}
    </svg>
  );
}

/** Lo que entró acumulado día a día: este mes (hasta hoy) en esmeralda y el anterior entero, gris y punteado. */
export function LineasAcumuladas({ este, antes, descripcion }: { este: number[]; antes: number[]; descripcion: string }) {
  const x0 = 44, x1 = 416, y0 = 184, yTope = 14;
  const e = eje(Math.max(...este, ...antes, 0), y0, yTope);
  const x = (dia: number) => x0 + ((dia - 1) / 30) * (x1 - x0);
  const linea = (vals: number[]) => vals.map((v, i) => `${i ? "L" : "M"}${x(i + 1).toFixed(1)} ${e.y(v).toFixed(1)}`).join("");
  const fin = este.length;
  return (
    <svg viewBox="0 0 420 206" role="img" aria-label={descripcion} className="block w-full">
      <Guias e={e} x0={x0} x1={x1} />
      {[1, 8, 15, 22, 29].map((d) => (
        <text key={d} x={x(d)} y={y0 + 18} textAnchor="middle" fontSize={11} className="fill-tinta-suave" style={FUENTE}>
          Día {d}
        </text>
      ))}
      {antes.length > 0 && <path d={linea(antes)} fill="none" strokeWidth={2} strokeDasharray="5 4" className="stroke-tinta-suave" />}
      {fin > 0 && (
        <>
          <path d={linea(este)} fill="none" strokeWidth={2.5} strokeLinejoin="round" className="stroke-grafico-ingreso" />
          <circle cx={x(fin)} cy={e.y(este[fin - 1])} r={4.5} strokeWidth={2} className="fill-grafico-ingreso stroke-fondo" />
        </>
      )}
    </svg>
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
