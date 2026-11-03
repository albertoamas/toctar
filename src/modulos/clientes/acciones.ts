"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { cliente, vehiculo } from "@/db/esquema";
import { erroresDe, indiceUnicoViolado, type EstadoFormulario } from "@/lib/formularios";
import { exigirModulo } from "@/lib/sesion";
import { clienteConPlaca, clienteConTelefono } from "./consultas";
import {
  camposConPrefijo,
  erroresConPrefijo,
  leerValores,
  PREFIJO_VEHICULO,
  revisarVehiculo,
  type EstadoCliente,
  type Existentes,
} from "./servidor";
import { esquemaCliente, esquemaEstado, esquemaEstadoVehiculo, esquemaVehiculo } from "./esquemas";
import { prefijoVehiculo } from "./reglas";

export type { EstadoCliente };

// Clientes y vehículos (HU-21 a HU-23). Entra el dueño o un encargado con el permiso "clientes".

function despuesDeCambiar(clienteId: number) {
  revalidatePath("/panel/clientes");
  revalidatePath(`/panel/clientes/${clienteId}`);
}

/** Registra un cliente y, si se cargó, su primer vehículo (HU-21, RF-20, RF-21). Repetidos: avisa y ofrece abrir (RF-23). */
export async function crearCliente(_previo: EstadoCliente, datos: FormData): Promise<EstadoCliente> {
  const autor = await exigirModulo("clientes");
  const valores = leerValores(datos);

  const entrada = esquemaCliente.safeParse(valores);
  // El vehículo es opcional: si se dejaron todos sus campos vacíos, no se valida
  const delVehiculo = camposConPrefijo(valores, PREFIJO_VEHICULO);
  const entradaVehiculo = Object.values(delVehiculo).some(Boolean) ? esquemaVehiculo.safeParse(delVehiculo) : null;
  const errores: Record<string, string> = entrada.success ? {} : erroresDe(entrada.error);
  if (entradaVehiculo && !entradaVehiculo.success) Object.assign(errores, erroresConPrefijo(erroresDe(entradaVehiculo.error), PREFIJO_VEHICULO));
  if (!entrada.success || (entradaVehiculo && !entradaVehiculo.success)) return { errores, valores };
  const datosCliente = entrada.data;
  const datosVehiculo = entradaVehiculo?.data ?? null;

  // Repetidos (RF-23): el error dice de quién es y la pantalla ofrece abrir su ficha
  const existentes: Existentes = {};
  const conTelefono = await clienteConTelefono(datosCliente.telefono);
  if (conTelefono) {
    errores.telefono = `Ese número ya es de ${conTelefono.nombre}.`;
    existentes.telefono = conTelefono;
  }
  if (datosVehiculo) await revisarVehiculo(datosVehiculo, PREFIJO_VEHICULO, errores, existentes);
  if (Object.keys(errores).length > 0) return { errores, valores, existentes };

  const creadoPor = Number(autor.id);
  let id: number;
  try {
    id = await db.transaction(async (tx) => {
      const [nuevo] = await tx.insert(cliente).values({ ...datosCliente, createdBy: creadoPor, updatedBy: creadoPor }).returning({ id: cliente.id });
      if (datosVehiculo) await tx.insert(vehiculo).values({ ...datosVehiculo, clienteId: nuevo.id, createdBy: creadoPor });
      return nuevo.id;
    });
  } catch (error) {
    // Dos personas registrando lo mismo a la vez: lo frena el índice único
    const indice = indiceUnicoViolado(error);
    if (indice === "cliente_telefono_unico") return { errores: { telefono: "Ese número ya está registrado. Búscalo en Clientes." }, valores };
    if (indice === "vehiculo_placa_unica") return { errores: { [`${PREFIJO_VEHICULO}placa`]: "Esa placa ya está registrada. Búscala en Clientes." }, valores };
    throw error;
  }

  revalidatePath("/panel/clientes");
  redirect(`/panel/clientes/${id}?creado=1`);
}

/** Edita los datos de un cliente (HU-23). El teléfono no puede ser el de otro cliente (RF-23). */
export async function actualizarCliente(_previo: EstadoCliente, datos: FormData): Promise<EstadoCliente> {
  const autor = await exigirModulo("clientes");
  const valores = leerValores(datos);
  const id = Number(valores.id);
  if (!Number.isInteger(id) || id <= 0) return { mensaje: "Ese cliente ya no existe. Recarga la página." };
  const entrada = esquemaCliente.safeParse(valores);
  if (!entrada.success) return { errores: erroresDe(entrada.error), valores };

  const conTelefono = await clienteConTelefono(entrada.data.telefono, id);
  if (conTelefono) return { errores: { telefono: `Ese número ya es de ${conTelefono.nombre}.` }, valores, existentes: { telefono: conTelefono } };
  try {
    const [actualizado] = await db
      .update(cliente)
      .set({ ...entrada.data, updatedAt: new Date(), updatedBy: Number(autor.id) })
      .where(eq(cliente.id, id))
      .returning({ id: cliente.id });
    if (!actualizado) return { mensaje: "Ese cliente ya no existe. Recarga la página." };
  } catch (error) {
    if (indiceUnicoViolado(error) === "cliente_telefono_unico") return { errores: { telefono: "Ese número ya está registrado. Búscalo en Clientes." }, valores };
    throw error;
  }
  despuesDeCambiar(id);
  return { ok: true, mensaje: "Cambios guardados." };
}

/** Desactiva o reactiva un cliente (RN-14: no se borra; su historial se conserva). */
export async function cambiarEstadoCliente(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const autor = await exigirModulo("clientes");
  const entrada = esquemaEstado.safeParse({ id: datos.get("id"), activo: datos.get("activo") });
  if (!entrada.success) return { mensaje: "No se pudo leer el pedido. Recarga la página." };
  const { id, activo } = entrada.data;
  const [actualizado] = await db
    .update(cliente)
    .set({ activo, updatedAt: new Date(), updatedBy: Number(autor.id) })
    .where(eq(cliente.id, id))
    .returning({ id: cliente.id });
  if (!actualizado) return { mensaje: "Ese cliente ya no existe. Recarga la página." };
  despuesDeCambiar(id);
  return { ok: true, mensaje: activo ? "Cliente reactivado." : "Cliente desactivado." };
}

/** Agrega un vehículo a un cliente o edita uno suyo (HU-23, RF-21). La placa no puede ser de otro vehículo activo. */
export async function guardarVehiculo(_previo: EstadoCliente, datos: FormData): Promise<EstadoCliente> {
  const autor = await exigirModulo("clientes");
  const valores = leerValores(datos);
  const clienteId = Number(valores.clienteId);
  const id = valores.id ? Number(valores.id) : undefined;
  if (!Number.isInteger(clienteId) || clienteId <= 0 || (id !== undefined && (!Number.isInteger(id) || id <= 0))) {
    return { mensaje: "No se pudo leer el pedido. Recarga la página." };
  }
  const prefijo = prefijoVehiculo(id);
  const entrada = esquemaVehiculo.safeParse(camposConPrefijo(valores, prefijo));
  if (!entrada.success) return { errores: erroresConPrefijo(erroresDe(entrada.error), prefijo), valores };

  const [suyo] = await db.select({ id: cliente.id }).from(cliente).where(eq(cliente.id, clienteId));
  if (!suyo) return { mensaje: "Ese cliente ya no existe. Recarga la página." };
  let actual: { id: number; tamanoId: number } | undefined;
  if (id) {
    [actual] = await db
      .select({ id: vehiculo.id, tamanoId: vehiculo.tamanoId })
      .from(vehiculo)
      .where(and(eq(vehiculo.id, id), eq(vehiculo.clienteId, clienteId)));
    if (!actual) return { mensaje: "Ese vehículo ya no existe. Recarga la página." };
  }
  const errores: Record<string, string> = {};
  const existentes: Existentes = {};
  await revisarVehiculo(entrada.data, prefijo, errores, existentes, actual);
  if (Object.keys(errores).length > 0) return { errores, valores, existentes };

  try {
    await db.transaction(async (tx) => {
      if (id) await tx.update(vehiculo).set({ ...entrada.data, updatedAt: new Date() }).where(eq(vehiculo.id, id));
      else await tx.insert(vehiculo).values({ ...entrada.data, clienteId, createdBy: Number(autor.id) });
      // Un cliente al que se le tocó un vehículo sube en la lista de recientes
      await tx.update(cliente).set({ updatedAt: sql`now()` }).where(eq(cliente.id, clienteId));
    });
  } catch (error) {
    if (indiceUnicoViolado(error) === "vehiculo_placa_unica") return { errores: { [`${prefijo}placa`]: "Esa placa ya está registrada. Búscala en Clientes." }, valores };
    throw error;
  }
  despuesDeCambiar(clienteId);
  return { ok: true, mensaje: id ? "Cambios guardados." : `Vehículo ${entrada.data.placa} agregado.` };
}

/** Desactiva o reactiva un vehículo. Reactivar choca si la placa ya la tiene otro vehículo activo (RF-23). */
export async function cambiarEstadoVehiculo(datos: { clienteId: number; id: number; activo: boolean }): Promise<EstadoFormulario> {
  await exigirModulo("clientes");
  const entrada = esquemaEstadoVehiculo.safeParse(datos);
  if (!entrada.success) return { mensaje: "No se pudo leer el pedido. Recarga la página." };
  const { clienteId, id, activo } = entrada.data;
  const [elegido] = await db
    .select({ placa: vehiculo.placa })
    .from(vehiculo)
    .where(and(eq(vehiculo.id, id), eq(vehiculo.clienteId, clienteId)));
  if (!elegido) return { mensaje: "Ese vehículo ya no existe. Recarga la página." };
  if (activo) {
    const conPlaca = await clienteConPlaca(elegido.placa, id);
    if (conPlaca) return { mensaje: `No se puede reactivar: la placa ${elegido.placa} ya está registrada a nombre de ${conPlaca.nombre}.` };
  }
  try {
    await db.update(vehiculo).set({ activo, updatedAt: new Date() }).where(eq(vehiculo.id, id));
  } catch (error) {
    if (indiceUnicoViolado(error) === "vehiculo_placa_unica") return { mensaje: `No se puede reactivar: la placa ${elegido.placa} ya está registrada.` };
    throw error;
  }
  despuesDeCambiar(clienteId);
  return { ok: true, mensaje: activo ? `${elegido.placa} reactivado.` : `${elegido.placa} desactivado.` };
}
