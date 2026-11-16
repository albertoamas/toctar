import "server-only";
import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { archivo, categoriaGasto, gasto } from "@/db/esquema";
import type { MetodoPago } from "@/db/esquema/trabajos";
import { urlsFotoPrivada, type UrlsFoto } from "@/lib/fotos";
import { sucursalPrincipal } from "@/modulos/configuracion/consultas";
import { rangoDelMes } from "./reglas";

// Pedido 16 (P16-reportes-y-gastos.md §4): los gastos del taller. Solo el dueño: quien llama ya lo verificó.

export type CategoriaGasto = { id: number; nombre: string };

/** Las categorías que se eligen al registrar un gasto, en el orden de Configuración. */
export async function categoriasActivas(): Promise<CategoriaGasto[]> {
  return db
    .select({ id: categoriaGasto.id, nombre: categoriaGasto.nombre })
    .from(categoriaGasto)
    .where(eq(categoriaGasto.activo, true))
    .orderBy(asc(categoriaGasto.orden), asc(categoriaGasto.id));
}

export type GastoEnLista = {
  id: number;
  fecha: string;
  categoriaId: number;
  categoria: string;
  detalle: string | null;
  metodo: MetodoPago;
  monto: string;
  anulado: boolean;
  motivoAnulacion: string | null;
  comprobante: UrlsFoto | null;
};

/** Los gastos de un mes, del más reciente al más viejo, también los anulados (se ven tachados). */
export async function gastosDelMes(mes: string): Promise<GastoEnLista[]> {
  const s = await sucursalPrincipal();
  const { inicio, fin } = rangoDelMes(mes);
  const filas = await db
    .select({
      id: gasto.id,
      fecha: gasto.fecha,
      categoriaId: gasto.categoriaId,
      categoria: categoriaGasto.nombre,
      detalle: gasto.detalle,
      metodo: gasto.metodo,
      monto: gasto.monto,
      anulado: gasto.anulado,
      motivoAnulacion: gasto.motivoAnulacion,
      clave: archivo.clave,
      miniaturaClave: archivo.miniaturaClave,
      ancho: archivo.ancho,
      alto: archivo.alto,
    })
    .from(gasto)
    .innerJoin(categoriaGasto, eq(gasto.categoriaId, categoriaGasto.id))
    .leftJoin(archivo, eq(gasto.comprobanteArchivoId, archivo.id))
    .where(and(eq(gasto.sucursalId, s.id), gte(gasto.fecha, inicio), lte(gasto.fecha, fin)))
    .orderBy(desc(gasto.fecha), desc(gasto.id));
  return Promise.all(
    filas.map(async ({ clave, miniaturaClave, ancho, alto, ...g }) => ({
      ...g,
      comprobante: clave ? await urlsFotoPrivada({ clave, miniaturaClave, ancho, alto }) : null,
    })),
  );
}
