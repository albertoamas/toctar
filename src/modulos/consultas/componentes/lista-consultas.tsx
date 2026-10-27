import { ListaFilas } from "@/componentes/panel/fila-lista";
import type { EstadoConsulta } from "@/db/esquema/consultas";
import { cantidad } from "@/lib/cantidad";
import type { FilaConsulta } from "../consultas";
import { diasDesde, NOMBRE_ESTADO, seEnfria, textoDias } from "../reglas";

// Consultas en lista: en la página de Consultas y en la ficha del cliente (HU-24). Pulido 9.1: la fila de un toque
// compartida en todos los tamaños. El cliente arriba (o la placa, grande, en la ficha: ya se sabe de quién son), lo que
// quiere en negrita y, en tinta suave, la placa y hace cuánto. HU-28: desde `umbral` días (Configuración) una abierta
// se enfría y lo dice con palabras, en una insignia de aviso.

type Props = {
  consultas: FilaConsulta[];
  umbral: number;
  sinCliente?: boolean;
  /** El estado en cada fila. Sin él, en una pestaña que ya lo dice (Confirmadas, Perdidas): no se repite. */
  conEstado?: boolean;
};

const TONO: Partial<Record<EstadoConsulta, "exito" | "aviso">> = { confirmado: "exito", perdido: "aviso" };

export function ListaConsultas({ consultas, umbral, sinCliente = false, conEstado = true }: Props) {
  const hoy = new Date();
  return (
    <ListaFilas
      etiqueta="Consultas"
      filas={consultas.map((c) => {
        const dias = diasDesde(c.ultimoMovimientoAt, hoy);
        const fria = seEnfria(c.estado, dias, umbral);
        return {
          href: `/panel/consultas/${c.id}`,
          titulo: sinCliente ? c.placa : c.cliente,
          tituloGrande: sinCliente,
          dato: c.servicio ?? "Todavía no sabe",
          // Fría, los días van en el aviso: no se repiten abajo
          detalles: [...(sinCliente ? [] : [c.placa]), ...(fria ? [] : [textoDias(dias)])],
          aviso: fria ? `${cantidad(dias, "día", "días")} sin movimiento` : null,
          estado: conEstado ? NOMBRE_ESTADO[c.estado] : undefined,
          tonoEstado: TONO[c.estado],
        };
      })}
    />
  );
}
