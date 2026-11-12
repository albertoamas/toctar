import { revalidatePath, revalidateTag } from "next/cache";
import { BYTES_MAXIMOS_VIDEO, MENSAJE_NO_ES_VIDEO, MENSAJE_VIDEO_PESADO, tipoDeVideo } from "@/lib/formato-videos";
import { puedeVerModulo } from "@/lib/permisos";
import { usuarioDeLaSesion } from "@/lib/sesion";
import { ETIQUETA_CONTENIDO } from "@/modulos/sitio/consultas";
import { guardarVideoDePortada } from "@/modulos/sitio/video";

// Sube el video de "Mira cómo trabajamos" (pedido 48, `etapas/P48-video-tiktok.md` §5). Es una ruta y no una server
// action porque las acciones tienen un tope de 6 MB para todo el sitio (next.config.ts), y subirlo valdría también para
// los formularios públicos. El cuerpo es el archivo crudo, no un formulario.
// Seguridad: la sesión y el permiso de Sitio web (con 401 o 403 en JSON: ante una redirección, el navegador volvería a
// mandar el video entero), el mismo origen (lo que las server actions revisan solas) y el tope contado con lo que
// llega, no con lo que dice el navegador. No pasa por el proxy (src/proxy.ts), que corta los cuerpos a los 10 MB.

type Respuesta = { ok: boolean; mensaje: string };

const responder = (cuerpo: Respuesta, status = 200) => Response.json(cuerpo, { status, headers: { "Cache-Control": "no-store" } });

/** El pedido viene de una página de este mismo sitio (como las server actions: Origin contra el host de la petición). */
function mismoOrigen(peticion: Request): boolean {
  const origen = peticion.headers.get("origin");
  const host = peticion.headers.get("x-forwarded-host") ?? peticion.headers.get("host");
  if (!origen || !host) return false;
  try {
    return new URL(origen).host === host;
  } catch {
    return false;
  }
}

/** Lee el cuerpo hasta el tope; si lo pasa, corta sin leer el resto y devuelve null. */
async function leerConTope(peticion: Request, tope: number): Promise<Uint8Array | null> {
  if (!peticion.body) return new Uint8Array();
  const lector = peticion.body.getReader();
  const partes: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    total += value.byteLength;
    if (total > tope) {
      await lector.cancel();
      return null;
    }
    partes.push(value);
  }
  const todo = new Uint8Array(total);
  let desde = 0;
  for (const p of partes) {
    todo.set(p, desde);
    desde += p.byteLength;
  }
  return todo;
}

export async function POST(peticion: Request) {
  const autor = await usuarioDeLaSesion();
  if (!autor) return responder({ ok: false, mensaje: "Tu sesión terminó. Vuelve a ingresar." }, 401);
  if (!puedeVerModulo(autor, "sitio")) return responder({ ok: false, mensaje: "No tienes permiso para cambiar el sitio web." }, 403);
  if (!mismoOrigen(peticion)) return responder({ ok: false, mensaje: "Pedido no permitido." }, 403);

  const declarado = Number(peticion.headers.get("content-length") ?? 0);
  if (declarado > BYTES_MAXIMOS_VIDEO) return responder({ ok: false, mensaje: MENSAJE_VIDEO_PESADO }, 413);
  const contenido = await leerConTope(peticion, BYTES_MAXIMOS_VIDEO);
  if (!contenido) return responder({ ok: false, mensaje: MENSAJE_VIDEO_PESADO }, 413);
  if (contenido.byteLength === 0) return responder({ ok: false, mensaje: "Elige un video." }, 400);
  const tipo = tipoDeVideo(contenido.subarray(0, 12));
  if (!tipo) return responder({ ok: false, mensaje: MENSAJE_NO_ES_VIDEO }, 400);

  try {
    await guardarVideoDePortada(contenido, tipo, Number(autor.id));
  } catch (error) {
    // El almacenamiento o la base fallaron: que no parezca un problema de la conexión de quien sube
    console.error("No se pudo guardar el video de la portada", error);
    return responder({ ok: false, mensaje: "No se pudo guardar el video. Vuelve a intentar en un momento." }, 500);
  }
  // Como updateTag (que es solo de server actions): el contenido viejo no se sirve más, ni mientras se renueva. Con
  // "max", una visita justo después podía recibir el de antes, también el de otra página (la misma etiqueta)
  revalidateTag(ETIQUETA_CONTENIDO, { expire: 0 });
  revalidatePath("/panel/sitio/textos");
  return responder({ ok: true, mensaje: "Video guardado." });
}
