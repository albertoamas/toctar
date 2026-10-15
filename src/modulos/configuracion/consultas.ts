import "server-only";
import { asc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { archivo, negocio, sucursal, type Redes } from "@/db/esquema";
import { urlArchivo } from "@/lib/almacenamiento";
import type { DiaHorario } from "@/lib/horarios";
import type { Coordenadas } from "@/lib/ubicacion";

// Lecturas de la configuración. Los datos del negocio los usa el sitio en cada página:
// van en caché con la etiqueta "negocio", y las acciones que los cambian la invalidan (updateTag).

export const ETIQUETA_NEGOCIO = "negocio";

export type ConfiguracionNegocio = {
  nombre: string;
  correo: string | null;
  redes: Redes;
  nit: string | null;
  razonSocial: string | null;
  logo: { url: string; ancho: number | null; alto: number | null } | null;
  sucursalId: number;
  direccion: string;
  coordenadas: Coordenadas | null;
  horarios: DiaHorario[];
  whatsapp: string | null;
};

/** La sucursal que se edita hoy: la primera activa (D-7: el modelo admite más). */
async function sucursalPrincipal() {
  const [fila] = await db.select().from(sucursal).where(eq(sucursal.activo, true)).orderBy(asc(sucursal.id)).limit(1);
  if (!fila) throw new Error("No hay ninguna sucursal activa: falta aplicar la migración 0003_datos_negocio.");
  return fila;
}

/** Datos actuales, sin caché: para la pantalla de configuración y las acciones. */
export async function obtenerConfiguracionNegocio(): Promise<ConfiguracionNegocio> {
  const [n] = await db
    .select({ negocio, logo: archivo })
    .from(negocio)
    .leftJoin(archivo, eq(negocio.logoArchivoId, archivo.id))
    .where(eq(negocio.id, 1));
  if (!n) throw new Error("Faltan los datos del negocio: falta aplicar la migración 0003_datos_negocio.");
  const s = await sucursalPrincipal();
  return {
    nombre: n.negocio.nombre,
    correo: n.negocio.correo,
    redes: n.negocio.redes,
    nit: n.negocio.nit,
    razonSocial: n.negocio.razonSocial,
    logo: n.logo ? { url: urlArchivo(n.logo.clave), ancho: n.logo.ancho, alto: n.logo.alto } : null,
    sucursalId: s.id,
    direccion: s.direccion,
    coordenadas: s.lat !== null && s.lng !== null ? { lat: Number(s.lat), lng: Number(s.lng) } : null,
    horarios: s.horarios,
    whatsapp: s.telefonoWhatsapp,
  };
}

/** Lo que muestra el sitio público (pie, contacto, botón de WhatsApp). En caché hasta que se edite. */
export async function obtenerDatosPublicos(): Promise<DatosPublicos> {
  "use cache";
  cacheTag(ETIQUETA_NEGOCIO);
  cacheLife("max");
  const c = await obtenerConfiguracionNegocio();
  return {
    nombre: c.nombre,
    correo: c.correo,
    redes: c.redes,
    direccion: c.direccion,
    coordenadas: c.coordenadas,
    horarios: c.horarios,
    whatsapp: c.whatsapp,
  };
}

export type DatosPublicos = Pick<
  ConfiguracionNegocio,
  "nombre" | "correo" | "redes" | "direccion" | "coordenadas" | "horarios" | "whatsapp"
>;
