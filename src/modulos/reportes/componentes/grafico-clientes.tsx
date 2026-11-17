"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/componentes/ui/chart";
import { cantidad } from "@/lib/cantidad";
import { escalaBonita } from "../reglas";

// Taller y clientes, "Clientes atendidos" (17/11): los clientes de cada tramo (día, semana o mes, según las fechas), en
// barras apiladas: los nuevos abajo y los que volvieron encima, con shadcn/ui Charts. Azul y violeta de los gráficos:
// el verde y el rojo son de los ingresos y los gastos. 2 px entre las partes; la animación, como las otras pestañas.

const ANIMACION = { isAnimationActive: "auto", animationDuration: 700, animationEasing: "ease-out" } as const;

const config = {
  nuevos: { label: "Nuevos", color: "var(--grafico-1)" },
  volvieron: { label: "Volvieron", color: "var(--grafico-3)" },
} satisfies ChartConfig;

const mayuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

export type TramoClientes = { corto: string; nombre: string; nuevos: number; volvieron: number };

export function GraficoClientes({ tramos }: { tramos: TramoClientes[] }) {
  const { tope, paso } = escalaBonita(Math.max(...tramos.map((t) => t.nuevos + t.volvieron)), 4, true);
  const marcas = Array.from({ length: Math.round(tope / paso) + 1 }, (_, i) => i * paso);
  return (
    <ChartContainer config={config} className="aspect-auto h-64 w-full sm:h-72" aria-label={`Clientes atendidos: ${tramos.map((t) => `${t.nombre}, ${t.nuevos} nuevos y ${t.volvieron} volvieron`).join("; ")}`}>
      <BarChart data={tramos} margin={{ top: 12, right: 4, left: 0, bottom: 0 }} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="corto" tickLine={false} axisLine={false} tickMargin={8} interval="preserveStartEnd" minTickGap={8} />
        <YAxis tickLine={false} axisLine={false} width={32} domain={[0, tope]} ticks={marcas} interval={0} allowDecimals={false} />
        <ChartTooltip
          cursor={{ fill: "var(--fondo-panel)" }}
          content={({ active, payload, label }) => (
            <ChartTooltipContent
              active={active}
              label={label}
              payload={payload}
              labelFormatter={(_, p) => {
                const t = p?.[0]?.payload as TramoClientes | undefined;
                return t ? `${mayuscula(t.nombre)}: ${cantidad(t.nuevos + t.volvieron, "cliente", "clientes")}` : "";
              }}
              formatter={(valor, nombre) => {
                const c = config[String(nombre) as keyof typeof config];
                return (
                  <span className="flex w-full items-center justify-between gap-4">
                    <span className="flex items-center gap-1.5">
                      <span aria-hidden className="size-2.5 rounded-[3px]" style={{ background: c?.color }} />
                      {c?.label ?? String(nombre)}
                    </span>
                    <span className="font-semibold tabular-nums">{Number(valor)}</span>
                  </span>
                );
              }}
            />
          )}
        />
        <ChartLegend content={<ChartLegendContent />} itemSorter={(item) => (item.dataKey === "nuevos" ? 0 : 1)} />
        {/* Las partes apiladas, con 2 px del fondo entre ellas; la de arriba, con la punta redondeada */}
        <Bar dataKey="nuevos" stackId="clientes" fill="var(--color-nuevos)" stroke="var(--fondo)" strokeWidth={2} maxBarSize={32} {...ANIMACION} />
        <Bar dataKey="volvieron" stackId="clientes" fill="var(--color-volvieron)" stroke="var(--fondo)" strokeWidth={2} radius={[4, 4, 0, 0]} maxBarSize={32} {...ANIMACION} />
      </BarChart>
    </ChartContainer>
  );
}
