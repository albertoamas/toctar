import type { EstadoReclamo } from "@/db/esquema";

// El color siempre va con la palabra.
export function InsigniaEstado({ estado }: { estado: EstadoReclamo }) {
  return estado === "pendiente" ? (
    <span className="tt-estado tt-estado--aviso">Pendiente</span>
  ) : (
    <span className="tt-estado tt-estado--exito">Atendido</span>
  );
}
