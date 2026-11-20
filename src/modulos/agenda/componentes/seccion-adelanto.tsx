import { Campo } from "@/componentes/panel/campo";
import { CampoMonto } from "@/componentes/panel/campo-monto";
import { OpcionesEnTarjetas } from "@/componentes/panel/opciones-en-tarjetas";
import { SeccionFormulario } from "@/componentes/panel/seccion-formulario";
import type { MetodoPago } from "@/db/esquema/trabajos";
import { MetodoYComprobante } from "@/modulos/pagos/componentes/elegir-metodo";

// "Adelanto" de una reserva (RN-04): solo para quien ve pagos, en su propio paso (20/11). Primero, "¿Dejó adelanto?",
// sin respuesta elegida: antes venía "con adelanto" y el sugerido puesto, y un "Reservar" apurado registraba un pago que
// el cliente no hizo. Con "Sí", el monto (el sugerido), cómo pagó y, con QR o transferencia, el comprobante (como
// "Registrar pago"). El estado es del formulario (FormularioReserva): aquí solo se muestra y se avisa cada cambio.

export type DejoAdelanto = "si" | "no";

type Props = {
  dejo: DejoAdelanto | "";
  alCambiarDejo: (dejo: DejoAdelanto) => void;
  adelanto: string;
  alCambiarAdelanto: (valor: string) => void;
  metodo: MetodoPago | "";
  alCambiarMetodo: (metodo: MetodoPago | "") => void;
  alCambiarComprobante: (archivo: File | null) => void;
  errores: Partial<Record<string, string>>;
  /** El error de la foto del comprobante al prepararla en el navegador (manda sobre el del servidor). */
  errorFoto: string | null | undefined;
};

export function SeccionAdelanto({ dejo, alCambiarDejo, adelanto, alCambiarAdelanto, metodo, alCambiarMetodo, alCambiarComprobante, errores: e, errorFoto }: Props) {
  return (
    <SeccionFormulario titulo="Adelanto">
      {dejo === "no" && <input type="hidden" name="sinAdelanto" value="on" />}
      <OpcionesEnTarjetas<DejoAdelanto>
        id="dejoAdelanto"
        titulo="¿Dejó adelanto?"
        nombre="dejoAdelanto"
        valor={dejo}
        cambiar={(nuevo) => {
          alCambiarDejo(nuevo);
          // El campo de la foto se va y vuelve vacío: la elegida no queda escondida para subirse igual
          if (nuevo === "no") alCambiarComprobante(null);
        }}
        opciones={[
          { valor: "si", texto: "Sí, dejó adelanto" },
          { valor: "no", texto: "No, sin adelanto" },
        ]}
        error={e.dejoAdelanto}
        className="grid-cols-2"
      />
      {dejo === "si" && (
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
