import { CopyIcon, PlusIcon, XIcon } from "lucide-react";
import { MensajeError } from "@/componentes/panel/campo";
import { Button } from "@/componentes/ui/button";
import { Checkbox } from "@/componentes/ui/checkbox";
import { Input } from "@/componentes/ui/input";
import { NOMBRE_DIA, type DiaHorario } from "@/lib/horarios";

// Horario de atención: una fila por día, con hasta dos turnos (mañana y tarde).
// Se usa dentro de FormularioNegocio (componente de cliente). El valor viaja al servidor como JSON en un campo oculto "horarios".

const TURNO_NUEVO = [
  { desde: "08:00", hasta: "12:00" },
  { desde: "14:00", hasta: "18:00" },
];

type Props = {
  valor: DiaHorario[];
  onChange: (dias: DiaHorario[]) => void;
  /** Errores por día: "horarios.0" es el lunes. */
  errores: Partial<Record<string, string>>;
};

export function EditorHorarios({ valor, onChange, errores }: Props) {
  const cambiarDia = (i: number, dia: DiaHorario) => onChange(valor.map((d, j) => (j === i ? dia : d)));
  const copiarLunes = () =>
    onChange(valor.map((d) => (d.dia >= 2 && d.dia <= 6 ? { ...d, turnos: valor[0].turnos.map((t) => ({ ...t })) } : d)));

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name="horarios" value={JSON.stringify(valor)} />
      <ul className="flex flex-col divide-y divide-border rounded-sm border border-border">
        {valor.map((d, i) => {
          const nombre = NOMBRE_DIA[d.dia - 1];
          const abierto = d.turnos.length > 0;
          const error = errores[`horarios.${i}`];
          return (
            <li key={d.dia} className="flex flex-col gap-2 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
                <label className="flex h-9 w-32 shrink-0 cursor-pointer items-center gap-2 font-semibold pointer-coarse:h-11">
                  <Checkbox
                    checked={abierto}
                    onCheckedChange={(marcado) =>
                      cambiarDia(i, { ...d, turnos: marcado ? TURNO_NUEVO.map((t) => ({ ...t })) : [] })
                    }
                    aria-label={`${nombre} abierto`}
                  />
                  {nombre}
                </label>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  {!abierto && <span className="flex h-9 items-center text-sm text-tinta-suave pointer-coarse:h-11">Cerrado</span>}
                  {d.turnos.map((t, k) => (
                    // Las horas se achican si no hay lugar: con ancho fijo, a 360 px el renglón ensanchaba todo el formulario (pulido 6.1)
                    <div key={k} className="flex items-center gap-2">
                      <Input
                        type="time"
                        step={900}
                        value={t.desde}
                        onChange={(e) => cambiarDia(i, { ...d, turnos: d.turnos.map((x, y) => (y === k ? { ...x, desde: e.target.value } : x)) })}
                        aria-label={`${nombre}, turno ${k + 1}, desde`}
                        aria-invalid={!!error}
                        className="w-full max-w-32 min-w-0"
                      />
                      <span aria-hidden className="text-tinta-suave">a</span>
                      <Input
                        type="time"
                        step={900}
                        value={t.hasta}
                        onChange={(e) => cambiarDia(i, { ...d, turnos: d.turnos.map((x, y) => (y === k ? { ...x, hasta: e.target.value } : x)) })}
                        aria-label={`${nombre}, turno ${k + 1}, hasta`}
                        aria-invalid={!!error}
                        className="w-full max-w-32 min-w-0"
                      />
                      {k === 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => cambiarDia(i, { ...d, turnos: d.turnos.slice(0, 1) })}
                          aria-label={`Quitar el segundo turno del ${nombre.toLowerCase()}`}
                        >
                          <XIcon />
                        </Button>
                      )}
                      {/* El lugar de la ✕ también en el primer turno: así las horas de los dos renglones quedan alineadas */}
                      {k === 0 && <span aria-hidden className="size-9 shrink-0 pointer-coarse:size-11" />}
                    </div>
                  ))}
                  {d.turnos.length === 1 && (
                    <div>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => cambiarDia(i, { ...d, turnos: [...d.turnos, { ...TURNO_NUEVO[1] }] })}
                      >
                        <PlusIcon />
                        Segundo turno
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              {error && <MensajeError id={`horarios-${i}-error`}>{error}</MensajeError>}
            </li>
          );
        })}
      </ul>
      <div>
        <Button type="button" variant="outline" onClick={copiarLunes}>
          <CopyIcon />
          Copiar el lunes de martes a sábado
        </Button>
      </div>
    </div>
  );
}
