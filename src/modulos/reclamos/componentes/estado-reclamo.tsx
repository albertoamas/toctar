import type { EstadoReclamo } from "@/db/esquema";
import { Insignia } from "@/componentes/panel/insignia";

// El color siempre va con la palabra.
export function InsigniaEstado({ estado }: { estado: EstadoReclamo }) {
  return estado === "pendiente" ? <Insignia tono="aviso">Pendiente</Insignia> : <Insignia tono="exito">Atendido</Insignia>;
}
