// Hallazgo 4 de la prueba en celulares (15/11): el panel no mostraba lo que había cambiado otra persona (un reclamo
// nuevo, un auto que recibió un encargado) hasta recargar. La app instalada queda abierta por días: al volver a ella
// después de un rato, la pantalla se pone al día sola. Puro: se prueba en tests/unit/actualizar-al-volver.test.ts.

/** Cuánto tiene que haber estado fuera (otra app, el celular bloqueado) para que valga la pena ponerse al día. */
export const FUERA_MINIMO_MS = 60_000;

export type AlVolver = {
  /** Cuánto hace que la pantalla trajo sus datos (al abrirse o en la última actualización), habiendo salido de la app. */
  fueraMs: number;
  /** Una pantalla con cambios sin guardar (AvisoAlSalir). */
  hayCambios: boolean;
  /** Un modal, un menú o una pregunta abierta: lo que se está haciendo no se toca. */
  hayAlgoAbierto: boolean;
};

/** Si al volver a la app la pantalla se actualiza: después de un rato fuera y sin nada a medio hacer. */
export function debeActualizar({ fueraMs, hayCambios, hayAlgoAbierto }: AlVolver): boolean {
  return fueraMs >= FUERA_MINIMO_MS && !hayCambios && !hayAlgoAbierto;
}
