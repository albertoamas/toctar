import { erroresDe } from "@/lib/formularios";
import { esquemaCliente, esquemaVehiculo } from "@/modulos/clientes/esquemas";
import { camposConPrefijo, erroresConPrefijo, PREFIJO_VEHICULO } from "@/modulos/clientes/valores";
import { esquemaVehiculoElegido } from "./esquemas";
import { VEHICULO_OTRO } from "./reglas";

// Nueva cotización en pasos (pedido 40, etapas/P40-cotizacion-en-pasos.md): el cliente, su vehículo y los servicios con
// su precio. Cada paso se revisa al tocar "Siguiente" con los mismos esquemas que la acción; la acción vuelve a revisar
// todo al crear. Puro: se prueba en tests/unit/cotizacion-pasos.test.ts.

export const PASOS_NUEVA_COTIZACION = ["Cliente", "Vehículo", "Servicios y precio"] as const;

export const PASO_CLIENTE = 0;
export const PASO_VEHICULO = 1;
export const PASO_SERVICIOS = 2;

const CAMPOS_CLIENTE = new Set(["nombre", "telefono", "correo", "nit", "razonSocial", "notas"]);

/** En qué paso está el campo de un error que devolvió la acción: ahí vuelve la pantalla. */
export function pasoDeCampo(campo: string): number {
  if (CAMPOS_CLIENTE.has(campo)) return PASO_CLIENTE;
  if (campo === "vehiculo" || campo.startsWith(PREFIJO_VEHICULO)) return PASO_VEHICULO;
  return PASO_SERVICIOS;
}

/** El primer paso con un error, o null si no hay ninguno. */
export function primerPasoConError(errores: Partial<Record<string, string>>): number | null {
  const pasos = Object.keys(errores)
    .filter((c) => errores[c])
    .map(pasoDeCampo);
  return pasos.length > 0 ? Math.min(...pasos) : null;
}

/**
 * Los errores del paso que se quiere dejar, con lo escrito en el formulario. El cliente nuevo, con el esquema de
 * Clientes; el vehículo: uno del cliente o, si es otro (o el cliente es nuevo), el esquema del vehículo.
 */
export function erroresDelPaso(paso: number, valores: Record<string, string>, clienteNuevo: boolean): Record<string, string> {
  if (paso === PASO_CLIENTE) {
    if (!clienteNuevo) return {};
    const r = esquemaCliente.safeParse(valores);
    return r.success ? {} : erroresDe(r.error);
  }
  if (paso === PASO_VEHICULO) {
    const eleccion = clienteNuevo ? VEHICULO_OTRO : (valores.vehiculo ?? "");
    if (eleccion !== VEHICULO_OTRO) {
      const r = esquemaVehiculoElegido.safeParse(eleccion);
      return r.success ? {} : { vehiculo: r.error.issues[0].message };
    }
    const r = esquemaVehiculo.safeParse(camposConPrefijo(valores, PREFIJO_VEHICULO));
    return r.success ? {} : erroresConPrefijo(erroresDe(r.error), PREFIJO_VEHICULO);
  }
  return {};
}
