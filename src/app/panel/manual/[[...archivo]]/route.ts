import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { notFound } from "next/navigation";
import { exigirSesion } from "@/lib/sesion";

// Pedido 44: el manual del panel (docs/10-lanzamiento/capacitacion.md), dentro del panel y con la sesión: el dueño y los
// encargados lo abren con el libro "Manual del panel", junto a "Cerrar sesión". Es una página con su propio diseño (la
// portada de la marca, las capturas del celular por paso), así que se sirve tal cual desde `contenido/manual/`, con sus
// capturas y su PDF; el logo es el de public/marca. Solo esos archivos: el nombre se compara con una lista y nunca se arma
// una ruta con lo que llega en la dirección.

const CARPETA = path.join(process.cwd(), "contenido", "manual");

const TIPOS: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".pdf": "application/pdf",
};

/** El archivo pedido, si es uno del manual: la página, el PDF o una captura. */
function archivoPedido(partes: string[] | undefined): string | null {
  const [primera, segunda, ...resto] = partes ?? [];
  if (resto.length > 0) return null;
  if (primera === undefined) return "manual.html";
  if (segunda === undefined) return primera === "manual-del-panel-toctar.pdf" ? primera : null;
  return primera === "capturas" && /^\d{2}-[a-z0-9-]+\.jpg$/.test(segunda) ? `capturas/${segunda}` : null;
}

export async function GET(peticion: Request, { params }: RouteContext<"/panel/manual/[[...archivo]]">) {
  // Cualquiera con sesión: el manual es para el dueño y para cada encargado
  await exigirSesion();
  const { archivo } = await params;
  const nombre = archivoPedido(archivo);
  if (!nombre) notFound();
  const ruta = path.join(CARPETA, nombre);
  const datos = await stat(ruta).catch(() => null);
  if (!datos) notFound();
  const encabezados: Record<string, string> = {
    "Content-Type": TIPOS[path.extname(nombre)],
    // Se vuelve a pedir cada vez (y pasa por la sesión): después de cerrar sesión, "atrás" no lo muestra desde la caché.
    // La versión (ETag) evita bajar otra vez lo que no cambió; un despliegue con un manual nuevo cambia la versión
    "Cache-Control": "private, no-cache",
    ETag: `"${datos.size.toString(36)}-${Math.floor(datos.mtimeMs).toString(36)}"`,
    "X-Robots-Tag": "noindex",
  };
  if (peticion.headers.get("if-none-match") === encabezados.ETag) return new Response(null, { status: 304, headers: encabezados });
  if (nombre.endsWith(".pdf")) encabezados["Content-Disposition"] = 'attachment; filename="Manual del panel TocTar.pdf"';
  // Un Buffer ya es un Uint8Array: sin otra copia
  return new Response((await readFile(ruta)) as Uint8Array<ArrayBuffer>, { headers: encabezados });
}
