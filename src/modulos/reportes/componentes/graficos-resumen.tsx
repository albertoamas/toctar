"use client";

import { Bar, CartesianGrid, ComposedChart, Label, Line, Pie, PieChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/componentes/ui/chart";
import { bsRedondo, escalaBonita, textoEje } from "../reglas";

// Los gráficos de Resumen con shadcn/ui Charts (Recharts, 17/11): el componente de gráficos del mismo shadcn que usa el
// panel. Recharts mide en píxeles (la letra no se agranda ni se achica con la pantalla), trae el detalle al pasar el
// mouse o tocar y la leyenda. Sin animación al cargar: los números se leen enseguida (y así no se mueve nada para quien
// prefiere menos movimiento). Colores: los tokens grafico-* de globals.css, por la config de ChartContainer.

const configMeses = {
  entro: { label: "Ingresos", color: "var(--grafico-ingreso)" },
  salio: { label: "Gastos", color: "var(--grafico-gasto)" },
  ganancia: { label: "Ganancia", color: "var(--tinta)" },
} satisfies ChartConfig;

/** La leyenda en el orden de lectura: lo que entró, lo que salió y lo que quedó. */
const ORDEN = ["entro", "salio", "ganancia"];

export type MesDelGrafico = { corto: string; nombre: string; entro: number; salio: number };

/**
 * Ingresos y gastos de cada mes en barras, con la línea de la ganancia encima (todo en Bs, en un solo eje). Un mes sin
 * ningún movimiento no tiene punto de ganancia (la línea se corta), y sin gastos en los 6 meses no hay línea: repetiría
 * los ingresos.
 */
export function GraficoMeses({ meses }: { meses: MesDelGrafico[] }) {
  const conGastos = meses.some((m) => m.salio > 0);
  const datos = meses.map((m) => ({ ...m, ganancia: conGastos && (m.entro > 0 || m.salio > 0) ? m.entro - m.salio : null }));
  // Un eje con números redondos (0, 10 mil, 20 mil, 30 mil), no los que elige Recharts (6,5 mil, 19,5 mil)
  const { tope, paso } = escalaBonita(Math.max(...meses.map((m) => Math.max(m.entro, m.salio))));
  const marcas = Array.from({ length: Math.round(tope / paso) + 1 }, (_, i) => i * paso);
  return (
    <ChartContainer config={configMeses} className="aspect-auto h-64 w-full sm:h-72" aria-label={`Ingresos y gastos: ${meses.map((m) => `${m.nombre}, entró ${bsRedondo(m.entro)} y salió ${bsRedondo(m.salio)}`).join("; ")}`}>
      <ComposedChart data={datos} margin={{ top: 12, right: 4, left: 0, bottom: 0 }} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="corto" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} width={56} domain={[0, tope]} ticks={marcas} interval={0} tickFormatter={(v: number) => textoEje(v)} />
        <ChartTooltip cursor={{ fill: "var(--fondo-panel)" }} content={<ChartTooltipContent labelFormatter={(_, p) => mayuscula(String(p?.[0]?.payload?.nombre ?? ""))} formatter={(valor, nombre) => <FilaDetalle nombre={nombre} valor={valor} />} />} />
        <ChartLegend content={<ChartLegendContent />} itemSorter={(item) => ORDEN.indexOf(String(item.dataKey))} />
        <Bar dataKey="entro" fill="var(--color-entro)" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
        <Bar dataKey="salio" fill="var(--color-salio)" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
        {conGastos && <Line dataKey="ganancia" type="monotone" stroke="var(--color-ganancia)" strokeWidth={2} dot={{ r: 3.5, fill: "var(--color-ganancia)" }} connectNulls={false} isAnimationActive={false} />}
      </ComposedChart>
    </ChartContainer>
  );
}

const mayuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

/** Una fila del detalle: el color, el nombre y el monto en Bs. */
function FilaDetalle({ nombre, valor }: { nombre: unknown; valor: unknown }) {
  const clave = String(nombre) as keyof typeof configMeses;
  return (
    <span className="flex w-full items-center justify-between gap-4">
      <span className="flex items-center gap-1.5">
        <span aria-hidden className="size-2.5 rounded-[3px]" style={{ background: configMeses[clave]?.color }} />
        {configMeses[clave]?.label ?? String(nombre)}
      </span>
      <span className="font-semibold tabular-nums">{bsRedondo(Number(valor))}</span>
    </span>
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
          <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="clave" formatter={(valor, _n, item) => <FilaTorta clave={String(item.payload.clave)} valor={Number(valor)} />} />} />
          <Pie data={datos} dataKey="valor" nameKey="clave" innerRadius="62%" outerRadius="92%" paddingAngle={datos.length > 1 ? 2 : 0} strokeWidth={0} isAnimationActive={false}>
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
            <dt className="flex items-center gap-2">
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

function FilaTorta({ clave, valor }: { clave: string; valor: number }) {
  const c = configTorta[clave as keyof typeof configTorta];
  return (
    <span className="flex w-full items-center justify-between gap-4">
      <span className="flex items-center gap-1.5">
        <span aria-hidden className="size-2.5 rounded-[3px]" style={{ background: c?.color }} />
        {c?.label ?? clave}
      </span>
      <span className="font-semibold tabular-nums">{bsRedondo(valor)}</span>
    </span>
  );
}
