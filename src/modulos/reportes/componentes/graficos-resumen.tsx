"use client";

import { Bar, BarChart, CartesianGrid, Label, Pie, PieChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/componentes/ui/chart";
import { bsRedondo, escalaBonita, textoEje } from "../reglas";
import { ANIMACION, FilaDetalle, mayuscula } from "./grafico-comun";

// Los gráficos de Resumen con shadcn/ui Charts (Recharts, 17/11): el componente de gráficos del mismo shadcn que usa el
// panel. Recharts mide en píxeles (la letra no se agranda ni se achica con la pantalla), trae el detalle al pasar el
// mouse o tocar y la leyenda. Al cargar, una sola animación corta (las barras suben; la torta se dibuja); con "reducir
// movimiento" en el equipo, Recharts no anima ("auto").

const configMeses = {
  entro: { label: "Ingresos", color: "var(--grafico-ingreso)" },
  salio: { label: "Gastos", color: "var(--grafico-gasto)" },
} satisfies ChartConfig;

/** La leyenda en el orden de lectura: lo que entró y lo que salió. */
const ORDEN = ["entro", "salio"];

export type TramoDelGrafico = { corto: string; nombre: string; entro: number; salio: number };

/**
 * Ingresos y gastos de cada tramo (día, semana o mes, según las fechas), en barras lado a lado. Sin la línea de la
 * ganancia (17/11, a pedido del dueño): lo que quedó ya está en la tarjeta y en la torta.
 */
export function GraficoIngresosGastos({ tramos: meses }: { tramos: TramoDelGrafico[] }) {
  // Un eje con números redondos (0, 10 mil, 20 mil, 30 mil), no los que elige Recharts (6,5 mil, 19,5 mil)
  const { tope, paso } = escalaBonita(Math.max(...meses.map((m) => Math.max(m.entro, m.salio))));
  const marcas = Array.from({ length: Math.round(tope / paso) + 1 }, (_, i) => i * paso);
  return (
    <ChartContainer config={configMeses} className="aspect-auto h-64 w-full sm:h-72" aria-label={`Ingresos y gastos: ${meses.map((m) => `${m.nombre}, entró ${bsRedondo(m.entro)} y salió ${bsRedondo(m.salio)}`).join("; ")}`}>
      <BarChart data={meses} margin={{ top: 12, right: 4, left: 0, bottom: 0 }} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="corto" tickLine={false} axisLine={false} tickMargin={8} interval="preserveStartEnd" minTickGap={8} />
        <YAxis tickLine={false} axisLine={false} width={56} domain={[0, tope]} ticks={marcas} interval={0} tickFormatter={(v: number) => textoEje(v)} />
        <ChartTooltip cursor={{ fill: "var(--fondo-panel)" }} content={<ChartTooltipContent labelFormatter={(_, p) => mayuscula(String(p?.[0]?.payload?.nombre ?? ""))} formatter={(valor, nombre) => <FilaDetalle color={configMeses[String(nombre) as keyof typeof configMeses]?.color} nombre={configMeses[String(nombre) as keyof typeof configMeses]?.label ?? String(nombre)} valor={bsRedondo(Number(valor))} />} />} />
        <ChartLegend content={<ChartLegendContent className="font-medium" />} itemSorter={(item) => ORDEN.indexOf(String(item.dataKey))} />
        <Bar dataKey="entro" fill="var(--color-entro)" radius={[4, 4, 0, 0]} maxBarSize={28} {...ANIMACION} />
        <Bar dataKey="salio" fill="var(--color-salio)" radius={[4, 4, 0, 0]} maxBarSize={28} {...ANIMACION} />
      </BarChart>
    </ChartContainer>
  );
}

const configTorta = {
  quedo: { label: "Quedó", color: "var(--grafico-ingreso)" },
  gastos: { label: "Gastos", color: "var(--grafico-gasto)" },
} satisfies ChartConfig;

/** Lo neto del período: de lo que entró, qué parte quedó y qué parte se fue en gastos, con el % que quedó al centro. */
export function TortaNeto({ entro, salio }: { entro: number; salio: number }) {
  const quedo = Math.max(0, entro - salio);
  const parte = entro > 0 ? Math.round((quedo / entro) * 100) : 0;
  const datos = [
    { clave: "quedo", valor: quedo, fill: "var(--color-quedo)" },
    { clave: "gastos", valor: Math.min(salio, entro), fill: "var(--color-gastos)" },
  ].filter((d) => d.valor > 0);
  return (
    <div className="flex flex-col gap-4">
      <ChartContainer config={configTorta} className="mx-auto aspect-square w-full max-w-52" aria-label={`De ${bsRedondo(entro)} que entraron, quedaron ${bsRedondo(quedo)} (${parte} %) y se gastaron ${bsRedondo(salio)}`}>
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="clave" formatter={(valor, _n, item) => <FilaDetalle color={configTorta[String(item.payload.clave) as keyof typeof configTorta]?.color} nombre={configTorta[String(item.payload.clave) as keyof typeof configTorta]?.label} valor={bsRedondo(Number(valor))} />} />} />
          <Pie data={datos} dataKey="valor" nameKey="clave" innerRadius="62%" outerRadius="92%" paddingAngle={datos.length > 1 ? 2 : 0} strokeWidth={0} {...ANIMACION}>
            <Label
              content={({ viewBox }) => {
                if (!viewBox || !("cx" in viewBox)) return null;
                return (
                  <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                    <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) - 6} className="fill-tinta text-3xl font-bold">
                      {parte} %
                    </tspan>
                    <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 20} className="fill-tinta-media text-sm">
                      {entro - salio < 0 ? "hubo pérdida" : "quedó"}
                    </tspan>
                  </text>
                );
              }}
            />
          </Pie>
        </PieChart>
      </ChartContainer>
      <dl className="flex flex-col gap-2 text-sm">
        {[
          { nombre: "Quedó", monto: quedo, parte, color: "var(--grafico-ingreso)" },
          { nombre: "Gastos", monto: salio, parte: entro > 0 ? 100 - parte : 0, color: "var(--grafico-gasto)" },
        ].map((f) => (
          <div key={f.nombre} className="flex justify-between gap-3">
            <dt className="flex items-center gap-2 font-medium">
              <span aria-hidden className="size-2.5 rounded-[3px]" style={{ background: f.color }} />
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
