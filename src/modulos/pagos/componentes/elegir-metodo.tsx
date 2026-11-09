import { BanknoteIcon, LandmarkIcon, QrCodeIcon, type LucideIcon } from "lucide-react";
import { MensajeError } from "@/componentes/panel/campo";
import { RadioGroup, RadioGroupItem } from "@/componentes/ui/radio-group";
import type { MetodoPago } from "@/db/esquema/trabajos";
import { llevaComprobante, METODOS, NOMBRE_METODO } from "../reglas";
import { CampoComprobante } from "./campo-comprobante";

// Componente de cliente: se usa dentro de otros componentes de cliente (recibe funciones como props).
// Cómo pagó (pulido final de los pagos, 09/11): es lo único que siempre hay que elegir al cobrar, y eran círculos chicos de
// formulario ("Transferencia" caía sola a otra línea en el celular). Ahora, tres botones iguales en una fila, con su
// ícono, como "Qué tiene" en Recibir; por dentro siguen siendo opciones de radio. Sin uno marcado de entrada: un método
// equivocado no se guarda sin darse cuenta. Lo usan "Registrar pago" y el adelanto de Nueva reserva, con su comprobante
// (`MetodoYComprobante`).

const ICONO: Record<MetodoPago, LucideIcon> = { efectivo: BanknoteIcon, qr: QrCodeIcon, transferencia: LandmarkIcon };

/**
 * Cómo pagó y, con QR o transferencia, el comprobante (`llevaComprobante`). Al pasar a efectivo, la foto elegida se
 * descarta (`alCambiarComprobante(null)`): no queda escondida para subirse igual.
 */
export function MetodoYComprobante(props: {
  metodo: MetodoPago | "";
  alCambiarMetodo: (metodo: MetodoPago) => void;
  alCambiarComprobante: (archivo: File | null) => void;
  errorMetodo?: string;
  errorComprobante?: string;
}) {
  return (
    <>
      <ElegirMetodo
        valor={props.metodo}
        cambiar={(m) => {
          props.alCambiarMetodo(m);
          if (!llevaComprobante(m)) props.alCambiarComprobante(null);
        }}
        error={props.errorMetodo}
      />
      {llevaComprobante(props.metodo) && <CampoComprobante onChange={props.alCambiarComprobante} error={props.errorComprobante} />}
    </>
  );
}

function ElegirMetodo({ valor, cambiar, error }: { valor: string; cambiar: (metodo: MetodoPago) => void; error?: string }) {
  return (
    <div className="flex flex-col gap-3">
      <p id="metodo-titulo" className="text-sm font-medium">
        ¿Cómo pagó?
      </p>
      {/* El valor en un campo oculto propio: los radios de base-ui se vaciaban al reiniciarse el formulario */}
      <input type="hidden" name="metodo" value={valor} />
      <RadioGroup
        value={valor}
        onValueChange={(v) => cambiar(v as MetodoPago)}
        aria-labelledby="metodo-titulo"
        aria-describedby={error ? "metodo-error" : undefined}
        className="grid grid-cols-3 gap-2 sm:max-w-md"
      >
        {METODOS.map((m, i) => {
          const Icono = ICONO[m];
          return (
            <label
              key={m}
              htmlFor={`metodo-${m}`}
              className="relative flex min-h-20 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-border bg-fondo px-1 pt-4 pb-3 text-center transition-colors hover:bg-superficie has-data-checked:border-tinta has-data-checked:bg-neutro-fondo has-data-checked:ring-1 has-data-checked:ring-tinta"
            >
              <RadioGroupItem id={`metodo-${m}`} value={m} className="absolute top-2 left-2" data-invalido={(!!error && i === 0) || undefined} />
              <Icono className="size-6" aria-hidden />
              <span className="text-sm font-semibold">{NOMBRE_METODO[m]}</span>
            </label>
          );
        })}
      </RadioGroup>
      {error && <MensajeError id="metodo-error">{error}</MensajeError>}
    </div>
  );
}
