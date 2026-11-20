import { Campo } from "@/componentes/panel/campo";
import { MasDatos } from "@/componentes/panel/mas-datos";
import { SeccionFormulario } from "@/componentes/panel/seccion-formulario";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
import { ANCHO_DATO } from "@/componentes/panel/anchos";

// Las fechas de una reserva (HU-30): el ingreso, la entrega aproximada (sugerida por la duración de los servicios) y,
// plegada, una nota. Pedido 55: sin espacio; si algún día de esas fechas está lleno, lo dice junto al ingreso. El estado es del formulario
// (FormularioReserva): aquí solo se muestra y se avisa cada cambio (17/11, al partir el formulario).

type Props = {
  hoy: string;
  fechaInicio: string;
  fechaFin: string;
  alCambiarIngreso: (valor: string) => void;
  alCambiarEntrega: (valor: string) => void;
  /** "El viernes 21 ya tiene los 3 lugares ocupados.", o null si hay lugar. */
  lleno: string | null;
  nota: string;
  alCambiarNota: (valor: string) => void;
  errores: Partial<Record<string, string>>;
};

export function SeccionFechasReserva({ hoy, fechaInicio, fechaFin, alCambiarIngreso, alCambiarEntrega, lleno, nota, alCambiarNota, errores: e }: Props) {
  return (
    <SeccionFormulario titulo="Fechas">
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo id="fechaInicio" etiqueta="Ingresa el" error={e.fechaInicio ?? lleno ?? undefined}>
          <Input className={ANCHO_DATO.fecha}
            id="fechaInicio"
            name="fechaInicio"
            type="date"
            min={hoy}
            value={fechaInicio}
            onChange={(ev) => alCambiarIngreso(ev.target.value)}
            aria-invalid={!!(e.fechaInicio ?? lleno)}
            aria-describedby={e.fechaInicio ?? lleno ? "fechaInicio-error" : undefined}
          />
        </Campo>
        <Campo id="fechaFin" etiqueta="Entrega aproximada" error={e.fechaFin} ayuda="Se le da al cliente como aproximada.">
          <Input className={ANCHO_DATO.fecha}
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
      {/* Se usa a veces: plegada; se abre sola si trae algo escrito o un error. Sin hora (19/11, pedido del dueño): la
          agenda va por día y la hora de llegada queda en el historial al recibir */}
      <MasDatos texto="Agregar nota" titulo="Nota" abierto={!!nota || !!e.nota}>
        <Campo id="nota" etiqueta="Nota" opcional error={e.nota}>
          <Textarea id="nota" name="nota" rows={2} value={nota} onChange={(ev) => alCambiarNota(ev.target.value)} aria-invalid={!!e.nota} />
        </Campo>
      </MasDatos>
    </SeccionFormulario>
  );
}
