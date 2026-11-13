// Textos largos del sitio que se escriben en el panel (pedido 49, la política de privacidad): los datos del negocio entre
// llaves y un formato mínimo, sin editor. Funciones puras: las usan el sitio y las pruebas.

/** Los datos del negocio que un texto puede nombrar entre llaves. Salen de Configuración > Negocio. */
export type DatosParaTexto = { negocio: string; direccion: string; whatsapp: string | null; correo: string | null };

/** Los campos entre llaves que se completan: `{negocio}`, `{direccion}`, `{whatsapp}` y `{correo}`. */
type CampoDelNegocio = keyof DatosParaTexto;

/**
 * Completa los campos entre llaves con los datos del negocio, así el texto no queda desactualizado si cambian. Uno que
 * falta en Configuración (el correo, por ejemplo) queda vacío; unas llaves con otra cosa adentro quedan como están.
 */
export function conDatosDelNegocio(texto: string, datos: DatosParaTexto): string {
  return texto.replace(/\{(negocio|direccion|whatsapp|correo)\}/g, (_, campo: CampoDelNegocio) => datos[campo] ?? "");
}

export type BloqueTexto = { tipo: "parrafo"; texto: string } | { tipo: "lista"; items: string[] };

/**
 * El texto en párrafos y listas: un renglón vacío separa párrafos, y las líneas seguidas que empiezan con "- " forman una
 * lista. Dentro de un párrafo, un salto de línea se respeta.
 */
export function bloquesDeTexto(texto: string): BloqueTexto[] {
  const bloques: BloqueTexto[] = [];
  let parrafo: string[] = [];
  let lista: string[] = [];
  const cerrarParrafo = () => {
    if (parrafo.length) bloques.push({ tipo: "parrafo", texto: parrafo.join("\n") });
    parrafo = [];
  };
  const cerrarLista = () => {
    if (lista.length) bloques.push({ tipo: "lista", items: lista });
    lista = [];
  };
  for (const linea of texto.split(/\r?\n/).map((l) => l.trim())) {
    if (!linea) {
      cerrarParrafo();
      cerrarLista();
    } else if (/^-\s+/.test(linea)) {
      cerrarParrafo();
      lista.push(linea.replace(/^-\s+/, ""));
    } else {
      cerrarLista();
      parrafo.push(linea);
    }
  }
  cerrarParrafo();
  cerrarLista();
  return bloques;
}
