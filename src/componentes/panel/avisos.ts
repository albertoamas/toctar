import { toast } from "sonner";
import type { EstadoFormulario } from "@/lib/formularios";

// Avisos del panel tras una acción: una sola regla para todas las pantallas.
// - Salió bien y hay mensaje → aviso de éxito.
// - Hay errores por campo → "Revisa los campos marcados." (el detalle va junto a cada campo).
// - Hay mensaje sin ok → aviso de error.

/** El éxito se lee de un vistazo; el error dura más, para que dé tiempo a leerlo. */
const DURACION = { exito: 3000, error: 6000 };

export function avisarResultado(r: EstadoFormulario) {
  if (r.ok) {
    if (r.mensaje) toast.success(r.mensaje, { duration: DURACION.exito });
  } else if (r.errores && Object.keys(r.errores).length > 0) {
    toast.error("Revisa los campos marcados.", { duration: DURACION.error });
  } else if (r.mensaje) {
    toast.error(r.mensaje, { duration: DURACION.error });
  }
}

type Accion = (previo: EstadoFormulario, datos: FormData) => Promise<EstadoFormulario>;

/**
 * La acción con su aviso, para useActionState. El aviso sale desde la acción y no desde un efecto:
 * si la página se recarga y el formulario se reemplaza, un efecto no alcanza a correr.
 */
export function conAviso(accion: Accion, alTerminar?: (r: EstadoFormulario) => void): Accion {
  return async (previo, datos) => {
    const resultado = await accion(previo, datos);
    avisarResultado(resultado);
    alTerminar?.(resultado);
    return resultado;
  };
}
