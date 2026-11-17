import { Campo } from "@/componentes/panel/campo";
import { CampoMonto } from "@/componentes/panel/campo-monto";
import { SeccionFormulario } from "@/componentes/panel/seccion-formulario";
import { Checkbox } from "@/componentes/ui/checkbox";
import type { MetodoPago } from "@/db/esquema/trabajos";
import { MetodoYComprobante } from "@/modulos/pagos/componentes/elegir-metodo";

// "Adelanto" de una reserva (RN-04): solo para quien ve pagos. "Sin adelanto", o el monto, cómo se pagó y, con QR o
// transferencia, el comprobante (como "Registrar pago"). El estado es del formulario (FormularioReserva): aquí solo se
// muestra y se avisa cada cambio (17/11, al partir el formulario).

type Props = {
  sinAdelanto: boolean;
  alCambiarSinAdelanto: (sin: boolean) => void;
  adelanto: string;
  alCambiarAdelanto: (valor: string) => void;
  metodo: MetodoPago | "";
  alCambiarMetodo: (metodo: MetodoPago | "") => void;
  alCambiarComprobante: (archivo: File | null) => void;
  errores: Partial<Record<string, string>>;
  /** El error de la foto del comprobante al prepararla en el navegador (manda sobre el del servidor). */
  errorFoto: string | null | undefined;
};

export function SeccionAdelanto({ sinAdelanto, alCambiarSinAdelanto, adelanto, alCambiarAdelanto, metodo, alCambiarMetodo, alCambiarComprobante, errores: e, errorFoto }: Props) {
  return (
    <SeccionFormulario titulo="Adelanto">
      {sinAdelanto && <input type="hidden" name="sinAdelanto" value="on" />}
      <label htmlFor="sinAdelanto" className="flex min-h-11 cursor-pointer items-center gap-3">
        <Checkbox
          id="sinAdelanto"
          checked={sinAdelanto}
          onCheckedChange={(si) => {
            alCambiarSinAdelanto(si === true);
            // El campo de la foto se va y vuelve vacío: la elegida no queda escondida para subirse igual
            if (si === true) alCambiarComprobante(null);
          }}
        />
        <span className="font-medium">Sin adelanto</span>
      </label>
      {!sinAdelanto && (
        <>
          <Campo id="adelanto" etiqueta="Monto" error={e.adelanto}>
            <CampoMonto id="adelanto" name="adelanto" value={adelanto} onChange={(ev) => alCambiarAdelanto(ev.target.value)} aria-invalid={!!e.adelanto} />
          </Campo>
          {/* Lo mismo que "Registrar pago" (pulido final de los pagos, 09/11): el comprobante, solo con QR o transferencia */}
          <MetodoYComprobante metodo={metodo} alCambiarMetodo={alCambiarMetodo} alCambiarComprobante={alCambiarComprobante} errorMetodo={e.metodo} errorComprobante={errorFoto ?? e.comprobante} />
        </>
      )}
    </SeccionFormulario>
  );
}
