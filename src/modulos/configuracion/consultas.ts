import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { archivo, espacioTaller, negocio, parametro, sucursal, tamanoVehiculo, type Redes } from "@/db/esquema";
import { urlArchivo } from "@/lib/almacenamiento";
import type { DiaHorario } from "@/lib/horarios";
import type { Coordenadas } from "@/lib/ubicacion";
import type { Elemento, Lista } from "./listas";
import { leerParametros, type Parametros } from "./parametros";

// Lecturas de la configuración. Los datos del negocio los usa el sitio en cada página:
// van en caché con la etiqueta "negocio", y las acciones que los cambian la invalidan (updateTag).

export const ETIQUETA_NEGOCIO = "negocio";
export const ETIQUETA_PARAMETROS = "parametros";

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
export async function sucursalPrincipal() {
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

/** Parámetros vigentes (HU-05). En caché hasta que el dueño los cambie. */
export async function obtenerParametros(): Promise<Parametros> {
  "use cache";
  cacheTag(ETIQUETA_PARAMETROS);
  cacheLife("max");
  return leerParametros(await db.select({ clave: parametro.clave, valor: parametro.valor }).from(parametro));
}

/** Espacios del taller o tamaños de vehículo: activos primero, en su orden; después los desactivados. */
export async function listarElementos(lista: Lista): Promise<Elemento[]> {
  if (lista === "tamanos") {
    return db
      .select({ id: tamanoVehiculo.id, nombre: tamanoVehiculo.nombre, descripcion: tamanoVehiculo.descripcion, orden: tamanoVehiculo.orden, activo: tamanoVehiculo.activo })
      .from(tamanoVehiculo)
      .orderBy(desc(tamanoVehiculo.activo), asc(tamanoVehiculo.orden), asc(tamanoVehiculo.id));
  }
  const { id: sucursalId } = await sucursalPrincipal();
  const filas = await db
    .select({ id: espacioTaller.id, nombre: espacioTaller.nombre, orden: espacioTaller.orden, activo: espacioTaller.activo })
    .from(espacioTaller)
    .where(eq(espacioTaller.sucursalId, sucursalId))
    .orderBy(desc(espacioTaller.activo), asc(espacioTaller.orden), asc(espacioTaller.id));
  return filas.map((f) => ({ ...f, descripcion: null }));
}
