"use server";

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { contenidoPagina } from "@/db/esquema";
import { erroresDe, type EstadoFormulario } from "@/lib/formularios";
import { eliminarFoto, guardarFoto } from "@/lib/fotos";
import { exigirModulo } from "@/lib/sesion";
import { CLAVES_PAGINA, FOTOS_DE_PAGINA, PAGINAS, datosDelFormulario, esquemaPagina, esquemaPaginaConFoto, editaPorSeccion, seccionDePagina, type Pagina, type PaginaConFoto } from "../contenido";
import { cambiarArchivoDePagina } from "../archivo-de-pagina";
import { BORRAR_VIDEO_FALLO, cambiarVideoDePortada } from "../video";
import { ERROR_FOTO, despuesDeCambiarContenido } from "./comun";

// Sitio web (HU-07 a HU-09; RF-10 a RF-12). Entra el dueño o un encargado con el permiso "sitio". Al guardar se
// invalida lo que muestra el sitio, que se renueva sin volver a desplegar (B4).
// Aquí: los textos de las páginas, sus fotos y el video de la portada.

export async function guardarContenido(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const autor = await exigirModulo("sitio");
  const pagina = String(datos.get("pagina")) as Pagina;
  if (!CLAVES_PAGINA.includes(pagina)) return { mensaje: "Página desconocida. Recarga la página." };
  // Una página que se edita por sección no se guarda entera: pisaría la sección que otra persona acaba de guardar (una
  // pestaña abierta desde antes del pulido 13.60 todavía puede mandarla así)
  if (editaPorSeccion(pagina)) return { mensaje: "Esta página se edita por sección. Recarga la página." };

  const valores = Object.fromEntries(PAGINAS[pagina].campos.map((c) => [c.clave, String(datos.get(c.clave) ?? "")]));
  const entrada = esquemaPagina(pagina).safeParse(datosDelFormulario(pagina, valores));
  if (!entrada.success) return { errores: erroresDe(entrada.error), valores };

  const fila = { clave: pagina, datos: entrada.data, updatedAt: new Date(), updatedBy: Number(autor.id) };
  // Solo si cambió algo: guardar sin tocar nada no mueve la fecha (la "Última actualización" de la privacidad, pedido 49)
  await db
    .insert(contenidoPagina)
    .values(fila)
    .onConflictDoUpdate({ target: contenidoPagina.clave, set: fila, setWhere: sql`${contenidoPagina.datos} is distinct from excluded.datos` });

  despuesDeCambiarContenido("textos");
  return { ok: true, mensaje: `${PAGINAS[pagina].titulo}: cambios guardados.` };
}

/**
 * Una sección de una página que se edita por sección (la privacidad, pulido 13.60). Se junta con lo guardado en la base
 * en un solo paso (`datos || {clave: valor}`), sin leer antes: dos personas que editan secciones distintas a la vez no se
 * pisan. Solo si cambió el texto, como guardarContenido: así no se mueve la "Última actualización" de la privacidad.
 */
export async function guardarSeccionContenido(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const autor = await exigirModulo("sitio");
  const pagina = String(datos.get("pagina")) as Pagina;
  const clave = String(datos.get("seccion") ?? "");
  const seccion = CLAVES_PAGINA.includes(pagina) ? seccionDePagina(pagina, clave) : null;
  if (!seccion) return { mensaje: "Sección desconocida. Recarga la página." };
  const crudo = String(datos.get(clave) ?? "");
  const entrada = seccion.esquema.safeParse(crudo);
  if (!entrada.success) return { errores: { [clave]: entrada.error.issues[0].message }, valores: { [clave]: crudo } };
  const valor = entrada.data;

  const cambiadas = await db
    .update(contenidoPagina)
    .set({ datos: sql`${contenidoPagina.datos} || jsonb_build_object(${clave}::text, ${valor}::text)`, updatedAt: new Date(), updatedBy: Number(autor.id) })
    .where(and(eq(contenidoPagina.clave, pagina), sql`${contenidoPagina.datos} ->> ${clave} is distinct from ${valor}`))
    .returning({ clave: contenidoPagina.clave });
  if (cambiadas.length > 0) despuesDeCambiarContenido("textos");
  else {
    // Sin cambios, o sin la fila (entra por migración): lo segundo no es un guardado
    const [existe] = await db.select({ clave: contenidoPagina.clave }).from(contenidoPagina).where(eq(contenidoPagina.clave, pagina));
    if (!existe) return { mensaje: "Falta el texto de esta página en la base: aplica las migraciones." };
  }
  return { ok: true, mensaje: `${seccion.campo.etiqueta}: cambios guardados.` };
}

/** Pone la foto de una página (o ninguna) y devuelve la que tenía (`cambiarArchivoDePagina`). */
async function cambiarFotoDe(pagina: PaginaConFoto, fotoArchivoId: number | null, autorId: number): Promise<number | null> {
  const anterior = await cambiarArchivoDePagina(pagina, "fotoArchivoId", fotoArchivoId, autorId);
  despuesDeCambiarContenido("textos");
  return anterior;
}

const BORRAR_FOTO_PAGINA_FALLO = "No se pudo borrar del almacenamiento la foto de una página";

const PAGINA_SIN_FOTO = "Esa página no lleva foto. Recarga la página.";

/**
 * La foto de una página de textos (`FOTOS_DE_PAGINA`): el taller detrás del lema de la portada (HU-08) o el equipo en
 * Nosotros (24/10). Opcional. La anterior se borra: ningún otro registro la usa.
 */
export async function subirFotoDePagina(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const autor = await exigirModulo("sitio");
  const entrada = esquemaPaginaConFoto.safeParse(datos.get("pagina"));
  if (!entrada.success) return { mensaje: PAGINA_SIN_FOTO };
  const pagina = entrada.data;
  const foto = await guardarFoto(datos.get("foto"), { carpeta: FOTOS_DE_PAGINA[pagina].carpeta, miniatura: true, autorId: Number(autor.id) });
  if (!foto.ok) return { errores: { foto: foto.motivo === "vacia" ? "Elige una foto." : ERROR_FOTO } };

  let anterior: number | null;
  try {
    anterior = await cambiarFotoDe(pagina, foto.archivoId, Number(autor.id));
  } catch (error) {
    // No quedó guardada: la foto recién subida se borra para que no quede huérfana
    await eliminarFoto(foto.archivoId).catch((e) => console.error(BORRAR_FOTO_PAGINA_FALLO, e));
    throw error;
  }
  if (anterior) await eliminarFoto(anterior).catch((e) => console.error(BORRAR_FOTO_PAGINA_FALLO, e));
  return { ok: true, mensaje: "Foto guardada." };
}

export async function quitarFotoDePagina(pagina: string): Promise<EstadoFormulario> {
  const autor = await exigirModulo("sitio");
  const entrada = esquemaPaginaConFoto.safeParse(pagina);
  if (!entrada.success) return { mensaje: PAGINA_SIN_FOTO };
  const anterior = await cambiarFotoDe(entrada.data, null, Number(autor.id));
  if (anterior) await eliminarFoto(anterior).catch((e) => console.error(BORRAR_FOTO_PAGINA_FALLO, e));
  return { ok: true, mensaje: FOTOS_DE_PAGINA[entrada.data].quitada };
}

/** Quita el video de "Mira cómo trabajamos" (pedido 48). Subirlo va por la ruta /panel/sitio/video (`video.ts`). */
export async function quitarVideoDePortada(): Promise<EstadoFormulario> {
  const autor = await exigirModulo("sitio");
  const anterior = await cambiarVideoDePortada(null, Number(autor.id));
  despuesDeCambiarContenido("textos");
  if (anterior) await eliminarFoto(anterior).catch((e) => console.error(BORRAR_VIDEO_FALLO, e));
  return { ok: true, mensaje: "Video quitado." };
}
