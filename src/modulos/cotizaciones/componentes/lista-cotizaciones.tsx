import { ListaFilas } from "@/componentes/panel/fila-lista";
import { cantidad } from "@/lib/cantidad";
import type { FilaCotizacion } from "../consultas";
import { bs, diasDesde, NOMBRE_ESTADO, sinRespuesta, textoDias, TONO_ESTADO } from "../reglas";

// Cotizaciones en lista (pedido 23): en Cotizaciones y en la ficha del cliente. La fila de un toque: el cliente arriba (o
// la placa, grande, en la ficha: ya se sabe de quién son), el total en negrita y, en tinta suave, la placa, el número
// y hace cuánto. Desde `umbral` días (Configuración) una pendiente espera respuesta y lo dice en una insignia de aviso.

type Props = {
  cotizaciones: FilaCotizacion[];
  umbral: number;
  sinCliente?: boolean;
  /** El estado en cada fila. Sin él, en una pestaña que ya lo dice: no se repite. */
  conEstado?: boolean;
};

export function ListaCotizaciones({ cotizaciones, umbral, sinCliente = false, conEstado = true }: Props) {
  const hoy = new Date();
  return (
    <ListaFilas
      etiqueta="Cotizaciones"
      filas={cotizaciones.map((c) => {
        const dias = diasDesde(c.ultimoMovimientoAt, hoy);
        const esperando = sinRespuesta(c.estado, dias, umbral);
        return {
          href: `/panel/cotizaciones/${c.id}`,
          titulo: sinCliente ? c.placa : c.cliente,
          tituloGrande: sinCliente,
          dato: bs(c.total),
          // Esperando respuesta, los días van en el aviso: no se repiten abajo
          detalles: [...(sinCliente ? [] : [c.placa]), c.numero, ...(esperando ? [] : [textoDias(dias)])],
          aviso: esperando ? `Sin respuesta hace ${cantidad(dias, "día", "días")}` : null,
          estado: conEstado ? NOMBRE_ESTADO[c.estado] : undefined,
          tonoEstado: TONO_ESTADO[c.estado],
        };
      })}
    />
  );
}
