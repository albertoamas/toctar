import type { EstadoReclamo } from "@/db/esquema";

// El color siempre va con la palabra.
export function InsigniaEstado({ estado }: { estado: EstadoReclamo }) {
  return estado === "pendiente" ? (
    <span className="tt-insignia tt-insignia--aviso">Pendiente</span>
  ) : (
    <span className="tt-insignia tt-insignia--exito">Atendido</span>
  );
}
