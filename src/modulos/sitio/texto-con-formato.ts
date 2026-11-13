// Textos largos del sitio que se escriben en el panel (pedido 49, la política de privacidad): los datos del negocio entre
// llaves y un formato mínimo, sin editor. Funciones puras: las usan el sitio y las pruebas.

/** Los datos del negocio que un texto puede nombrar entre llaves. Salen de Configuración > Negocio. */
export type DatosParaTexto = { negocio: string; direccion: string; whatsapp: string | null; correo: string | null };

/**
 * Cómo escribirles, con lo que haya en Configuración: "por WhatsApp al … o al correo …", uno solo, o, sin ninguno, el
 * taller. Así la frase no queda rota si falta el correo (`{contacto}`).
 */
export function formaDeContacto({ whatsapp, correo, direccion }: DatosParaTexto): string {
  if (whatsapp && correo) return `por WhatsApp al ${whatsapp} o al correo ${correo}`;
  if (whatsapp) return `por WhatsApp al ${whatsapp}`;
  if (correo) return `al correo ${correo}`;
  return `en el taller, en ${direccion}`;
}

/**
 * Completa los campos entre llaves con los datos del negocio, así el texto no queda desactualizado si cambian:
 * `{negocio}`, `{direccion}`, `{whatsapp}`, `{correo}` y `{contacto}` (`formaDeContacto`). Uno que falta en Configuración
 * queda vacío (por eso la frase de contacto va con `{contacto}`); unas llaves con otra cosa adentro quedan como están.
 */
export function conDatosDelNegocio(texto: string, datos: DatosParaTexto): string {
  return texto.replace(/\{(negocio|direccion|whatsapp|correo|contacto)\}/g, (_, campo: keyof DatosParaTexto | "contacto") =>
    campo === "contacto" ? formaDeContacto(datos) : (datos[campo] ?? ""),
  );
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
