"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/componentes/ui/chart";
import { bsRedondo, escalaBonita, textoEje } from "../reglas";

// "Cómo van los ingresos" y "Cómo van los gastos" (17/11): lo que se va juntando día a día en las fechas elegidas (línea llena) contra
// el período con que se compara (punteada), con shadcn/ui Charts como Resumen. El eje cuenta los días del período
// ("Día 1", "Día 8"…) y el detalle dice la fecha de cada uno. Una sola animación corta al cargar, sin ella con "reducir
// movimiento" (Recharts, "auto").

const ANIMACION = { isAnimationActive: "auto", animationDuration: 700, animationEasing: "ease-out" } as const;

export type DiaAcumulado = { dia: number; este: number | null; antes: number | null; fechaEste: string | null; fechaAntes: string | null };

/** `color`: el de las fechas elegidas (esmeralda para los ingresos, rojo para los gastos); el anterior va gris y punteado. */
export function GraficoAcumulado({ dias, color, nombreEste, nombreAntes, descripcion }: { dias: DiaAcumulado[]; color: string; nombreEste: string; nombreAntes: string; descripcion: string }) {
  const config = {
    este: { label: nombreEste, color },
    antes: { label: nombreAntes, color: "var(--tinta-suave)" },
  } satisfies ChartConfig;
  const { tope, paso } = escalaBonita(Math.max(0, ...dias.map((d) => Math.max(d.este ?? 0, d.antes ?? 0))));
  const marcas = Array.from({ length: Math.round(tope / paso) + 1 }, (_, i) => i * paso);
  // Unas 5 marcas en el eje de los días, cada 7 en un mes ("Día 1, 8, 15, 22, 29")
  const cada = dias.length <= 8 ? 1 : dias.length <= 35 ? 7 : Math.ceil(dias.length / 5);
  const marcasDia = dias.filter((d) => (d.dia - 1) % cada === 0).map((d) => d.dia);
  return (
    <ChartContainer config={config} className="aspect-auto h-64 w-full sm:h-72" aria-label={descripcion}>
      <LineChart data={dias} margin={{ top: 12, right: 12, left: 0, bottom: 0 }} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="dia" type="number" domain={[1, Math.max(dias.length, 2)]} ticks={marcasDia} tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(d: number) => `Día ${d}`} />
        <YAxis tickLine={false} axisLine={false} width={56} domain={[0, tope]} ticks={marcas} interval={0} tickFormatter={(v: number) => textoEje(v)} />
        <ChartTooltip
          cursor={{ stroke: "var(--grafico-eje)" }}
          // El de shadcn muestra los ítems como llegan (el orden de Recharts es solo para su detalle): primero las fechas elegidas
          content={({ active, payload, label }) => (
            <ChartTooltipContent
              active={active}
              label={label}
              payload={[...(payload ?? [])].sort((a, b) => (a.dataKey === "este" ? 0 : 1) - (b.dataKey === "este" ? 0 : 1))}
              labelFormatter={(_, p) => `Día ${p?.[0]?.payload?.dia ?? ""}`}
              formatter={(valor, nombre, item) => {
                const clave = String(nombre) as keyof typeof config;
                const fecha = clave === "este" ? item.payload.fechaEste : item.payload.fechaAntes;
                return (
                  <span className="flex w-full items-center justify-between gap-4">
                    <span className="flex items-center gap-1.5">
                      <span aria-hidden className="size-2.5 rounded-[3px]" style={{ background: config[clave]?.color }} />
                      {fecha ?? config[clave]?.label}
                    </span>
                    <span className="font-semibold tabular-nums">{bsRedondo(Number(valor))}</span>
                  </span>
                );
              }}
            />
          )}
        />
        <ChartLegend content={<ChartLegendContent />} itemSorter={(item) => (item.dataKey === "este" ? 0 : 1)} />
        <Line dataKey="antes" type="linear" stroke="var(--color-antes)" strokeWidth={2} strokeDasharray="5 4" dot={false} activeDot={{ r: 4, fill: "var(--color-antes)", stroke: "var(--fondo)", strokeWidth: 2 }} connectNulls={false} {...ANIMACION} />
        <Line dataKey="este" type="linear" stroke="var(--color-este)" strokeWidth={2.5} dot={false} activeDot={{ r: 4.5, fill: "var(--color-este)", stroke: "var(--fondo)", strokeWidth: 2 }} connectNulls={false} {...ANIMACION} />
      </LineChart>
    </ChartContainer>
  );
}
