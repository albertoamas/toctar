import { BellIcon, CalendarXIcon, CircleAlertIcon, ClockIcon, TriangleAlertIcon, WalletIcon } from "lucide-react";
import { Insignia } from "./insignia";

// Lo que pide hacer algo (23/11, recorrido visual): una insignia ámbar (o roja, si ya es un problema) con su ícono, que
// la distingue del estado sin depender del color. Cada cosa lleva un solo estado y, como mucho, una alerta.

const ICONO = {
  /** Falta darle fecha: "Sin fecha". */
  fecha: CalendarXIcon,
  /** Hace mucho que espera: "Sin respuesta hace 9 días". */
  tiempo: ClockIcon,
  /** Falta avisar al cliente: "Sin avisar". */
  avisar: BellIcon,
  /** Falta cobrar: "Debe 300 Bs". */
  dinero: WalletIcon,
  /** Ya pasó la fecha: "Atrasada", "Venció el 20 nov.". */
  atraso: TriangleAlertIcon,
  /** Falta cargar algo: "Faltan 3 precios". */
  falta: CircleAlertIcon,
};

export type TipoAlerta = keyof typeof ICONO;

export function Alerta({ tipo, grave = false, className, children }: { tipo: TipoAlerta; /** Rojo: ya es un problema. */ grave?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <Insignia tono={grave ? "peligro" : "aviso"} icono={ICONO[tipo]} className={className}>
      {children}
    </Insignia>
  );
}
