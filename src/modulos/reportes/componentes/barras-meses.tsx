import { cn } from "cn";
import type { MovimientoDelMes } from "../consultas";
import { bsRedondo, nombreMes, quedo } from "../reglas";

// Pedido 16: los últimos 6 meses en barras, lo que entró (tinta) y lo que salió (rojo de peligro) lado a lado, con lo que
// quedó escrito arriba de cada mes. Sin librería: barras de HTML con su alto en por ciento. Los colores se distinguen
// también por la leyenda escrita, y el lector de pantalla oye una lista con los números de cada mes.

const MES_CORTO = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export function BarrasMeses({ meses, elegido }: { meses: MovimientoDelMes[]; elegido: string }) {
  const tope = Math.max(1, ...meses.flatMap((m) => [m.entro, m.salio]));
  const alto = (v: number) => `${Math.max(v > 0 ? 2 : 0, Math.round((v / tope) * 100))}%`;
  return (
    <div className="flex flex-col gap-3">
      <ul aria-hidden className="flex flex-wrap gap-4 text-xs text-tinta-media">
        <li className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-tinta" /> Entró
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-peligro" /> Salió
        </li>
        <li>Arriba, lo que quedó</li>
      </ul>
      <div aria-hidden className="grid h-48 grid-cols-6 items-end gap-2">
        {meses.map((m) => (
          <div key={m.mes} className="flex h-full flex-col items-center justify-end gap-1">
            <span className={cn("text-[0.6875rem] font-semibold whitespace-nowrap tabular-nums", quedo(m.entro, m.salio) < 0 && "text-peligro")}>
              {m.entro || m.salio ? bsRedondo(quedo(m.entro, m.salio)).replace(" Bs", "") : ""}
            </span>
            <div className="flex h-full w-full items-end justify-center gap-1">
              <span className="w-full max-w-5 rounded-t-sm bg-tinta" style={{ height: alto(m.entro) }} />
              <span className="w-full max-w-5 rounded-t-sm bg-peligro" style={{ height: alto(m.salio) }} />
            </div>
            <span className={cn("text-xs", m.mes === elegido ? "font-bold text-tinta" : "text-tinta-suave")}>{MES_CORTO[Number(m.mes.slice(5)) - 1]}</span>
          </div>
        ))}
      </div>
      <ul className="sr-only">
        {meses.map((m) => (
          <li key={m.mes}>
            {nombreMes(m.mes)}: entró {bsRedondo(m.entro)}, salió {bsRedondo(m.salio)}, quedó {bsRedondo(quedo(m.entro, m.salio))}
          </li>
        ))}
      </ul>
    </div>
  );
}
