"use client";

import { useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Label, Pie, PieChart, XAxis, YAxis } from "recharts";
import { ChevronDownIcon } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/componentes/ui/chart";
import { cn } from "cn";
import { bsRedondo, escalaBonita, textoEje } from "../reglas";
import { ANIMACION, FilaDetalle, mayuscula } from "./grafico-comun";

// Los gráficos de Reportes v2 (19/11, prototipo aprobado), con shadcn/ui Charts (Recharts): una serie en el tiempo (área
// o líneas), barras dobles, la dona y la lista con barras de progreso (los rankings). Los datos llegan ya calculados
// (calculos.ts); aquí solo se dibujan. El detalle aparece al pasar el mouse o tocar.

export type PuntoSerie = { corto: string; nombre: string; valores: number[] };
export type Serie = { nombre: string; color: string; area?: boolean };
type Formato = "bs" | "cantidad";

const escribir = (v: number, formato: Formato) => (formato === "bs" ? bsRedondo(v) : String(Math.round(v)));

/** Una o dos series en el tiempo: con relleno suave (área) o solo la línea. */
export function GraficoSerie({ puntos, series, formato }: { puntos: PuntoSerie[]; series: Serie[]; formato: Formato }) {
  const datos = puntos.map((p) => ({ corto: p.corto, nombre: p.nombre, ...Object.fromEntries(p.valores.map((v, i) => [`s${i}`, v])) }));
  const config = Object.fromEntries(series.map((s, i) => [`s${i}`, { label: s.nombre, color: s.color }])) satisfies ChartConfig;
  const { tope, paso } = escalaBonita(Math.max(1, ...puntos.flatMap((p) => p.valores)), 4, formato === "cantidad");
  const marcas = Array.from({ length: Math.round(tope / paso) + 1 }, (_, i) => i * paso);
  const pocos = puntos.length <= 12;
  return (
    <ChartContainer
      config={config}
      className="aspect-auto h-52 w-full sm:h-60"
      aria-label={puntos.map((p) => `${p.nombre}: ${series.map((s, i) => `${s.nombre} ${escribir(p.valores[i], formato)}`).join(", ")}`).join("; ")}
    >
      <AreaChart data={datos} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} accessibilityLayer>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="corto" tickLine={false} axisLine={false} tickMargin={8} interval="preserveStartEnd" minTickGap={20} />
        <YAxis tickLine={false} axisLine={false} width={formato === "bs" ? 52 : 32} allowDecimals={false} domain={[0, tope]} ticks={marcas} interval={0} tickFormatter={(v: number) => (formato === "bs" ? textoEje(v) : String(v))} />
        <ChartTooltip
          cursor={{ stroke: "var(--grafico-eje)" }}
          content={
            <ChartTooltipContent
              labelFormatter={(_, p) => mayuscula(String(p?.[0]?.payload?.nombre ?? ""))}
              formatter={(valor, clave) => <FilaDetalle color={config[String(clave)]?.color} nombre={config[String(clave)]?.label ?? String(clave)} valor={escribir(Number(valor), formato)} />}
            />
          }
        />
        {series.map((s, i) => (
          <Area
            key={s.nombre}
            dataKey={`s${i}`}
            type="monotone"
            stroke={`var(--color-s${i})`}
            strokeWidth={2.25}
            fill={`var(--color-s${i})`}
            fillOpacity={s.area ? 0.12 : 0}
            dot={pocos ? { r: 3, strokeWidth: 0, fill: `var(--color-s${i})` } : false}
            activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--fondo)" }}
            {...ANIMACION}
          />
        ))}
      </AreaChart>
    </ChartContainer>
  );
}

/** Dos cantidades por tramo, lado a lado (recibidas y completadas). Barras finas: sin barras gordas con pocos datos. */
export function GraficoBarrasDobles({ puntos, series }: { puntos: PuntoSerie[]; series: [Serie, Serie] }) {
  const datos = puntos.map((p) => ({ corto: p.corto, nombre: p.nombre, s0: p.valores[0], s1: p.valores[1] }));
  const config = { s0: { label: series[0].nombre, color: series[0].color }, s1: { label: series[1].nombre, color: series[1].color } } satisfies ChartConfig;
  const { tope, paso } = escalaBonita(Math.max(1, ...puntos.flatMap((p) => p.valores)), 4, true);
  const marcas = Array.from({ length: Math.round(tope / paso) + 1 }, (_, i) => i * paso);
  return (
    <ChartContainer config={config} className="aspect-auto h-52 w-full sm:h-60" aria-label={puntos.map((p) => `${p.nombre}: ${series[0].nombre} ${p.valores[0]}, ${series[1].nombre} ${p.valores[1]}`).join("; ")}>
      <BarChart data={datos} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barGap={2} accessibilityLayer>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="corto" tickLine={false} axisLine={false} tickMargin={8} interval="preserveStartEnd" minTickGap={20} />
        <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} domain={[0, tope]} ticks={marcas} interval={0} />
        <ChartTooltip
          cursor={{ fill: "var(--fondo-panel)" }}
          content={<ChartTooltipContent labelFormatter={(_, p) => mayuscula(String(p?.[0]?.payload?.nombre ?? ""))} formatter={(valor, clave) => <FilaDetalle color={config[clave as "s0" | "s1"]?.color} nombre={config[clave as "s0" | "s1"]?.label} valor={String(valor)} />} />}
        />
        <Bar dataKey="s0" fill="var(--color-s0)" radius={[3, 3, 0, 0]} maxBarSize={14} {...ANIMACION} />
        <Bar dataKey="s1" fill="var(--color-s1)" radius={[3, 3, 0, 0]} maxBarSize={14} {...ANIMACION} />
      </BarChart>
    </ChartContainer>
  );
}

export type PorcionDona = { nombre: string; valor: number; color: string };

/** La dona, con su cifra al centro. Su desglose va al lado, escrito (lo arma la pestaña). */
export function Dona({ porciones, centro, centroTexto, centroColor, formato }: { porciones: PorcionDona[]; centro: string; centroTexto: string; centroColor?: string; formato: Formato }) {
  const datos = porciones.filter((p) => p.valor > 0).map((p) => ({ ...p, fill: p.color }));
  const config = Object.fromEntries(datos.map((p) => [p.nombre, { label: p.nombre, color: p.color }])) satisfies ChartConfig;
  const total = datos.reduce((s, p) => s + p.valor, 0);
  return (
    <ChartContainer config={config} className="mx-auto aspect-square w-full max-w-48" aria-label={`${centro} ${centroTexto}: ${datos.map((p) => `${p.nombre} ${escribir(p.valor, formato)}`).join(", ")}`}>
      <PieChart>
        <ChartTooltip
          content={<ChartTooltipContent hideLabel nameKey="nombre" formatter={(valor, _n, item) => <FilaDetalle color={item.payload.fill} nombre={item.payload.nombre} valor={`${escribir(Number(valor), formato)} · ${total > 0 ? Math.round((Number(valor) / total) * 100) : 0} %`} />} />}
        />
        <Pie data={datos} dataKey="valor" nameKey="nombre" innerRadius="68%" outerRadius="96%" paddingAngle={datos.length > 1 ? 2 : 0} strokeWidth={0} {...ANIMACION}>
          <Label
            content={({ viewBox }) => {
              if (!viewBox || !("cx" in viewBox)) return null;
              return (
                <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                  <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) - 6} className="text-2xl font-bold" style={{ fill: centroColor ?? "var(--tinta)" }}>
                    {centro}
                  </tspan>
                  <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 18} className="fill-tinta-suave text-xs">
                    {centroTexto}
                  </tspan>
                </text>
              );
            }}
          />
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}

export type FilaProgreso = { clave: string; nombre: string; sub?: string; valor: string; extra?: string; parte: number; color?: string };

/**
 * Una lista con barras de progreso: un ranking (con su puesto; el primero en color, los demás en gris) o una
 * distribución (cada barra con su color). Muestra `inicial` y "Ver los N restantes" despliega el resto.
 */
export function ListaProgreso({ filas, ranking = false, color, inicial = 5, etiqueta }: { filas: FilaProgreso[]; ranking?: boolean; color?: string; inicial?: number; etiqueta: string }) {
  const [abierta, setAbierta] = useState(false);
  const visibles = abierta ? filas : filas.slice(0, inicial);
  const resto = filas.length - inicial;
  return (
    <div className="flex flex-col">
      <ol aria-label={etiqueta} className="flex flex-col gap-1">
        {visibles.map((f, i) => {
          const tinta = f.color ?? (ranking ? (i === 0 ? color : "var(--grafico-otros)") : color);
          return (
            <li key={f.clave} className="flex items-start gap-3 py-1.5">
              {ranking && (
                <span aria-hidden className={cn("mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold", i === 0 ? "bg-neutro-fondo text-tinta" : "bg-fondo-panel text-tinta-suave")}>
                  {i + 1}
                </span>
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{f.nombre}</span>
                    {f.sub && <span className="block text-xs text-tinta-suave">{f.sub}</span>}
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-sm font-semibold tabular-nums">{f.valor}</span>
                    {f.extra && <span className="block text-xs text-tinta-suave tabular-nums">{f.extra}</span>}
                  </span>
                </div>
                <div aria-hidden className="h-1.5 rounded-full bg-neutro-fondo">
                  <div className="h-1.5 rounded-full" style={{ width: `${Math.max(f.parte, f.parte > 0 ? 1.5 : 0)}%`, background: tinta }} />
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      {resto > 0 && (
        <button type="button" onClick={() => setAbierta(!abierta)} aria-expanded={abierta} className="mt-2 flex min-h-9 items-center gap-1.5 self-center rounded-md px-3 text-sm font-semibold hover:bg-fondo-panel pointer-coarse:min-h-11">
          {abierta ? "Ver menos" : `Ver ${resto === 1 ? "el restante" : `los ${resto} restantes`}`}
          <ChevronDownIcon aria-hidden className={cn("size-4 transition-transform", abierta && "rotate-180")} />
        </button>
      )}
    </div>
  );
}
