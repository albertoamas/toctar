/**
 * Lo que tiene un formulario ahora, para saber si cambió. Los archivos, por nombre y tamaño. Ordenado: el orden de campos
 * repetidos no es un cambio (desmarcar y volver a marcar un permiso lo manda al final). El de las filas de una lista sí
 * cuenta: va adentro de un solo campo. Lo usan la barra de guardar (cambios-sin-guardar) y el modal (modal-formulario).
 */
export function contenidoFormulario(formulario: HTMLFormElement): string {
  const pares: string[] = [];
  for (const [campo, valor] of new FormData(formulario)) pares.push(JSON.stringify([campo, valor instanceof File ? `archivo:${valor.name}:${valor.size}` : valor]));
  return pares.sort().join();
}
