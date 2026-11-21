"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect, RedirectType } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { cliente, consulta, vehiculo } from "@/db/esquema";
import { erroresDe, indiceUnicoViolado } from "@/lib/formularios";
import { puedeVerModulo } from "@/lib/permisos";
import { exigirModulo } from "@/lib/sesion";
import { conDesde, leerDesde } from "@/lib/volver";
import { esquemaCliente, esquemaVehiculo } from "@/modulos/clientes/esquemas";
import { conMarcaDeLaLista, type EstadoCliente, type Existentes, revisarVehiculo } from "@/modulos/clientes/servidor";
import { camposConPrefijo, erroresConPrefijo, leerValores, PREFIJO_VEHICULO } from "@/modulos/clientes/valores";
import { interesadoDeCotizacion } from "./consultas/reservar";

// Pedido 31, parte 2 (P31b-cotizacion-rapida.md): antes de reservar la cotización de un interesado, se lo registra.

/** Algo cambió entre la revisión y la escritura: se lanza dentro de la transacción para deshacerla entera. */
class Conflicto extends Error {}

const esquemaPedido = z.object({ cotizacionId: z.coerce.number().int().positive() });
/** Lo que pide la pantalla: nombre y WhatsApp (correo, NIT y notas se cargan después en su ficha). */
const esquemaNuevo = esquemaCliente.pick({ nombre: true, telefono: true });

/**
 * Registra al interesado de una cotización como cliente, con su vehículo (la placa se pide ahora), y la cotización queda
 * con ellos; después sigue la reserva, como la de cualquier cliente. Si su WhatsApp ya es de un cliente (se registró
 * por otro lado), se usa ese, sin duplicarlo. Es de quien reserva y registra clientes (Agenda y Clientes), como una
 * reserva directa con un cliente nuevo.
 */
export async function registrarInteresado(_previo: EstadoCliente, datos: FormData): Promise<EstadoCliente> {
  const usuario = await exigirModulo("agenda");
  if (!puedeVerModulo(usuario, "clientes")) return { mensaje: "Registrar un cliente es de quien tiene «Clientes»." };
  const pedido = esquemaPedido.safeParse({ cotizacionId: datos.get("cotizacionId") });
  if (!pedido.success) return { mensaje: "No se pudo leer el pedido. Recarga la página." };
  const { cotizacionId } = pedido.data;

  const c = await interesadoDeCotizacion(cotizacionId);
  if (!c) return { mensaje: "Esa cotización ya no existe o ya tiene su cliente. Recarga la página." };
  if (!c.agendable) return { mensaje: "Esa cotización ya fue reservada o tiene una versión nueva. Vuelve a la cotización." };
  if (c.clienteExistente && !c.clienteExistente.activo) {
    return { mensaje: `Ese WhatsApp es de ${c.clienteExistente.nombre}, que está desactivado: reactívalo en su ficha.` };
  }

  const valores = leerValores(datos);
  const errores: Record<string, string> = {};
  const existentes: Existentes = {};
  // Con un cliente que ya tiene ese WhatsApp, no se escriben sus datos: se usa él
  let nuevoCliente: z.output<typeof esquemaNuevo> | null = null;
  if (!c.clienteExistente) {
    const r = esquemaNuevo.safeParse(valores);
    if (r.success) nuevoCliente = r.data;
    else Object.assign(errores, erroresDe(r.error));
  }
  const rv = esquemaVehiculo.safeParse(camposConPrefijo(valores, PREFIJO_VEHICULO));
  if (!rv.success) Object.assign(errores, erroresConPrefijo(erroresDe(rv.error), PREFIJO_VEHICULO));
  if (Object.keys(errores).length > 0) return { errores, valores };
  const nuevoVehiculo = rv.data!;

  // Los repetidos (RF-23): otro cliente con ese WhatsApp (escrito distinto del de la cotización) o esa placa
  if (nuevoCliente && nuevoCliente.telefono !== c.telefono) {
    const [otro] = await db.select({ id: cliente.id, nombre: cliente.nombre }).from(cliente).where(eq(cliente.telefono, nuevoCliente.telefono));
    if (otro) {
      errores.telefono = `Ese número ya es de ${otro.nombre}.`;
      existentes.telefono = otro;
    }
  }
  await revisarVehiculo(nuevoVehiculo, PREFIJO_VEHICULO, errores, existentes);
  if (Object.keys(errores).length > 0) return { errores, valores, existentes };

  const autorId = Number(usuario.id);
  try {
    await db.transaction(async (tx) => {
      let clienteId: number;
      if (c.clienteExistente) clienteId = c.clienteExistente.id;
      else {
        const [nuevo] = await tx.insert(cliente).values({ ...nuevoCliente!, createdBy: autorId, updatedBy: autorId }).returning({ id: cliente.id });
        clienteId = nuevo.id;
      }
      const [v] = await tx
        .insert(vehiculo)
        .values({ ...(await conMarcaDeLaLista(tx, nuevoVehiculo)), clienteId, createdBy: autorId })
        .returning({ id: vehiculo.id });
      // Solo si sigue sin cliente: si otra persona la registró a la vez, no se pisa
      const hecho = await tx
        .update(consulta)
        .set({ clienteId, vehiculoId: v.id })
        .where(and(eq(consulta.id, c.consultaId), isNull(consulta.clienteId)))
        .returning({ id: consulta.id });
      if (hecho.length === 0) throw new Conflicto();
    });
  } catch (error) {
    if (error instanceof Conflicto) return { mensaje: "Otra persona ya registró a este cliente. Recarga la página." };
    // Se cruzó con otro registro del mismo WhatsApp o la misma placa
    if (indiceUnicoViolado(error)) return { mensaje: "Ese WhatsApp o esa placa se acaba de registrar. Recarga la página.", valores };
    throw error;
  }

  revalidatePath("/panel/clientes");
  revalidatePath("/panel/cotizaciones");
  // Sigue la reserva, ya con su cliente y su vehículo
  redirect(conDesde(`/panel/agenda/nueva?cotizacion=${cotizacionId}`, leerDesde(datos.get("volver"))), RedirectType.replace);
}
