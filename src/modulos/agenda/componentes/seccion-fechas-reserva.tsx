import { Campo } from "@/componentes/panel/campo";
import { MasDatos } from "@/componentes/panel/mas-datos";
import { SeccionFormulario } from "@/componentes/panel/seccion-formulario";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
import type { EspacioDisponible } from "../consultas/espacios";
import { CampoEspacio } from "./campo-espacio";

// "Fechas y espacio" de una reserva (HU-30): el ingreso, la entrega aproximada (sugerida por la duración de los
// servicios), el espacio libre en esas fechas y, plegadas, la hora y una nota. El estado es del formulario
// (FormularioReserva): aquí solo se muestra y se avisa cada cambio (17/11, al partir el formulario).

type Props = {
  hoy: string;
  fechaInicio: string;
  fechaFin: string;
  alCambiarIngreso: (valor: string) => void;
  alCambiarEntrega: (valor: string) => void;
  espacio: { valor: string; alCambiar: (valor: string) => void; libres: EspacioDisponible[]; buscando: boolean; ayuda: string };
  horaIngreso: string;
  alCambiarHora: (valor: string) => void;
  nota: string;
  alCambiarNota: (valor: string) => void;
  errores: Partial<Record<string, string>>;
};

export function SeccionFechasReserva({ hoy, fechaInicio, fechaFin, alCambiarIngreso, alCambiarEntrega, espacio, horaIngreso, alCambiarHora, nota, alCambiarNota, errores: e }: Props) {
  return (
    <SeccionFormulario titulo="Fechas y espacio">
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo id="fechaInicio" etiqueta="Ingresa el" error={e.fechaInicio}>
          <Input
            id="fechaInicio"
            name="fechaInicio"
            type="date"
            min={hoy}
            value={fechaInicio}
            onChange={(ev) => alCambiarIngreso(ev.target.value)}
            aria-invalid={!!e.fechaInicio}
            aria-describedby={e.fechaInicio ? "fechaInicio-error" : undefined}
          />
        </Campo>
        <Campo id="fechaFin" etiqueta="Entrega aproximada" error={e.fechaFin} ayuda="Se le da al cliente como aproximada.">
          <Input
            id="fechaFin"
            name="fechaFin"
            type="date"
            min={fechaInicio}
            value={fechaFin}
            onChange={(ev) => alCambiarEntrega(ev.target.value)}
            aria-invalid={!!e.fechaFin}
            aria-describedby={e.fechaFin ? "fechaFin-error" : "fechaFin-ayuda"}
          />
        </Campo>
      </div>
      <CampoEspacio valor={espacio.valor} alCambiar={espacio.alCambiar} libres={espacio.libres} buscando={espacio.buscando} ayuda={espacio.ayuda} error={e.espacioId} />
      {/* Se usan a veces: plegadas; se abren solas si traen algo escrito o un error */}
      <MasDatos texto="Agregar hora y nota" titulo="Hora y nota" abierto={!!horaIngreso || !!nota || !!e.horaIngreso || !!e.nota}>
        <Campo id="horaIngreso" etiqueta="Hora aproximada" opcional error={e.horaIngreso} ayuda="Como lo dijo el cliente: «a las 9», «en la tarde».">
          <Input id="horaIngreso" name="horaIngreso" autoComplete="off" value={horaIngreso} onChange={(ev) => alCambiarHora(ev.target.value)} className="max-w-xs" aria-invalid={!!e.horaIngreso} />
        </Campo>
        <Campo id="nota" etiqueta="Nota" opcional error={e.nota}>
          <Textarea id="nota" name="nota" rows={2} value={nota} onChange={(ev) => alCambiarNota(ev.target.value)} aria-invalid={!!e.nota} />
        </Campo>
      </MasDatos>
    </SeccionFormulario>
  );
}
