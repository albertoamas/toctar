import { readFile } from "node:fs/promises";
import path from "node:path";
import { notFound } from "next/navigation";
import { exigirSesion } from "@/lib/sesion";

// Pedido 44: el manual del panel (docs/10-lanzamiento/capacitacion.md), dentro del panel y con la sesión: el dueño y los
// encargados lo abren desde el menú ("Manual"). Es una página con su propio diseño (la portada de la marca, las capturas
// del celular por paso), así que se sirve tal cual desde `contenido/manual/`, con sus capturas, su logo y su PDF.
// Solo esos archivos: el nombre se compara con una lista y nunca se arma una ruta con lo que llega en la dirección.

const CARPETA = path.join(process.cwd(), "contenido", "manual");

const TIPOS: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
};

/** El archivo pedido, si es uno del manual: la página, el logo, el PDF o una captura. */
function archivoPedido(partes: string[] | undefined): string | null {
  const [primera, segunda, ...resto] = partes ?? [];
  if (resto.length > 0) return null;
  if (primera === undefined) return "manual.html";
  if (segunda === undefined) return primera === "logo.svg" || primera === "manual-del-panel-toctar.pdf" ? primera : null;
  return primera === "capturas" && /^\d{2}-[a-z0-9-]+\.jpg$/.test(segunda) ? `capturas/${segunda}` : null;
}

export async function GET(_peticion: Request, { params }: RouteContext<"/panel/manual/[[...archivo]]">) {
  // Cualquiera con sesión: el manual es para el dueño y para cada encargado
  await exigirSesion();
  const { archivo } = await params;
  const nombre = archivoPedido(archivo);
  if (!nombre) notFound();
  let contenido: Buffer;
  try {
    contenido = await readFile(path.join(CARPETA, nombre));
  } catch {
    notFound();
  }
  const encabezados: Record<string, string> = {
    "Content-Type": TIPOS[path.extname(nombre)],
    // Solo en el navegador de quien entró: no en cachés compartidas
    "Cache-Control": "private, max-age=3600",
    "X-Robots-Tag": "noindex",
  };
  if (nombre.endsWith(".pdf")) encabezados["Content-Disposition"] = 'attachment; filename="Manual del panel TocTar.pdf"';
  return new Response(new Uint8Array(contenido), { headers: encabezados });
}
