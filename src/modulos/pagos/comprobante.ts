import "server-only";
import { eliminarFoto, guardarFoto } from "@/lib/fotos";

// La foto del comprobante de un pago (HU-32): al registrar un pago o con el adelanto al agendar. Va al bucket privado
// (es un dato del cliente) y se sube antes de la transacción, para no tener la base esperando la subida.

export type Comprobante = { ok: true; archivoId: number | null } | { ok: false; error: string };

/** Guarda la foto, si vino. Sin foto, `archivoId` es null. */
export async function guardarComprobante(entrada: FormDataEntryValue | null, autorId: number): Promise<Comprobante> {
  if (!(entrada instanceof File) || entrada.size === 0) return { ok: true, archivoId: null };
  try {
    const foto = await guardarFoto(entrada, { carpeta: "comprobantes", miniatura: true, autorId, privado: true });
    if (!foto.ok) return { ok: false, error: "El comprobante debe ser una foto JPG, PNG o WebP de hasta 5 MB." };
    return { ok: true, archivoId: foto.archivoId };
  } catch (error) {
    // El almacenamiento no respondió: el formulario queda como estaba y se puede reintentar
    console.error("No se pudo guardar el comprobante", error);
    return { ok: false, error: "No se pudo subir el comprobante. Vuelve a intentar o regístralo sin la foto." };
  }
}

/** Borra el comprobante de un pago que no se guardó. Si el borrado falla, no tapa el error de verdad. */
export async function descartarComprobante(archivoId: number | null) {
  if (archivoId) await eliminarFoto(archivoId).catch((e) => console.error("No se pudo borrar el comprobante", e));
}
