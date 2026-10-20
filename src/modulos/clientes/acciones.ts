"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { cliente, tamanoVehiculo, vehiculo } from "@/db/esquema";
import { erroresDe, indiceUnicoViolado, type EstadoFormulario } from "@/lib/formularios";
import { exigirModulo } from "@/lib/sesion";
import { clienteConPlaca, clienteConTelefono } from "./consultas";
import { CAMPOS_VEHICULO, esquemaCliente, esquemaVehiculo } from "./esquemas";

// Clientes y vehículos (HU-21 a HU-23). Entra el dueño o un encargado con el permiso "clientes"; el técnico nunca (RN-12).

/** Respuesta de los formularios de clientes: además de los errores, a quién pertenece el dato repetido (RF-23). */
export type EstadoCliente = EstadoFormulario & { existentes?: Record<string, { id: number; nombre: string }> };

const PREFIJO_VEHICULO = "vehiculo-";

function leerValores(datos: FormData): Record<string, string> {
  const valores: Record<string, string> = {};
  for (const [clave, valor] of datos.entries()) if (typeof valor === "string") valores[clave] = valor;
  return valores;
}

/** Los campos del primer vehículo, sin el prefijo. Null si se dejaron todos vacíos: el vehículo es opcional. */
function camposDelVehiculo(valores: Record<string, string>): Record<string, string> | null {
  const campos = Object.fromEntries(CAMPOS_VEHICULO.map((c) => [c, (valores[PREFIJO_VEHICULO + c] ?? "").trim()]));
  return Object.values(campos).some(Boolean) ? campos : null;
}

/** Registra un cliente y, si se cargó, su primer vehículo (HU-21, RF-20, RF-21). Repetidos: avisa y ofrece abrir (RF-23). */
export async function crearCliente(_previo: EstadoCliente, datos: FormData): Promise<EstadoCliente> {
  const autor = await exigirModulo("clientes");
  const valores = leerValores(datos);

  const entrada = esquemaCliente.safeParse(valores);
  const delVehiculo = camposDelVehiculo(valores);
  const entradaVehiculo = delVehiculo ? esquemaVehiculo.safeParse(delVehiculo) : null;
  const errores: Record<string, string> = entrada.success ? {} : erroresDe(entrada.error);
  if (entradaVehiculo && !entradaVehiculo.success) {
    for (const [campo, mensaje] of Object.entries(erroresDe(entradaVehiculo.error))) errores[PREFIJO_VEHICULO + campo] = mensaje;
  }
  if (!entrada.success || (entradaVehiculo && !entradaVehiculo.success)) return { errores, valores };
  const datosCliente = entrada.data;
  const datosVehiculo = entradaVehiculo?.data ?? null;

  // Repetidos (RF-23): el error dice de quién es y la pantalla ofrece abrir su ficha
  const existentes: NonNullable<EstadoCliente["existentes"]> = {};
  const conTelefono = await clienteConTelefono(datosCliente.telefono);
  if (conTelefono) {
    errores.telefono = `Ese número ya es de ${conTelefono.nombre}.`;
    existentes.telefono = conTelefono;
  }
  if (datosVehiculo) {
    const conPlaca = await clienteConPlaca(datosVehiculo.placa);
    if (conPlaca) {
      errores[`${PREFIJO_VEHICULO}placa`] = `La placa ${datosVehiculo.placa} ya está registrada a nombre de ${conPlaca.nombre}.`;
      existentes[`${PREFIJO_VEHICULO}placa`] = conPlaca;
    }
    const [tamano] = await db
      .select({ id: tamanoVehiculo.id })
      .from(tamanoVehiculo)
      .where(and(eq(tamanoVehiculo.id, datosVehiculo.tamanoId), eq(tamanoVehiculo.activo, true)));
    if (!tamano) errores[`${PREFIJO_VEHICULO}tamanoId`] = "Elige el tamaño.";
  }
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
