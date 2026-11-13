import { BanknoteIcon, LandmarkIcon, QrCodeIcon, type LucideIcon } from "lucide-react";
import { OpcionesEnTarjetas } from "@/componentes/panel/opciones-en-tarjetas";
import type { MetodoPago } from "@/db/esquema/trabajos";
import { llevaComprobante, METODOS, NOMBRE_METODO } from "../reglas";
import { CampoComprobante } from "./campo-comprobante";

// Componente de cliente: se usa dentro de otros componentes de cliente (recibe funciones como props).
// Cómo pagó (pulido final de los pagos, 09/11): es lo único que siempre hay que elegir al cobrar, y eran círculos chicos de
// formulario ("Transferencia" caía sola a otra línea en el celular). Ahora, tres tarjetas iguales en una fila, con su
// ícono, como "Qué tiene" en Recibir (`OpcionesEnTarjetas`, que se tocan enteras desde la revisión del 13/11). Sin uno marcado de entrada: un método
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

function ElegirMetodo({ valor, cambiar, error }: { valor: MetodoPago | ""; cambiar: (metodo: MetodoPago) => void; error?: string }) {
  return (
    <OpcionesEnTarjetas
      id="metodo"
      titulo="¿Cómo pagó?"
      nombre="metodo"
      valor={valor}
      cambiar={cambiar}
      opciones={METODOS.map((m) => ({ valor: m, texto: NOMBRE_METODO[m], icono: ICONO[m] }))}
      error={error}
      className="grid-cols-3 sm:max-w-md"
    />
  );
}
