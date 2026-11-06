"use server";

import { and, eq, max, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { cliente, consulta, cotizacion, vehiculo } from "@/db/esquema";
import { erroresDe, indiceUnicoViolado, type EstadoFormulario } from "@/lib/formularios";
import { exigirAccion, exigirModulo } from "@/lib/sesion";
import { clienteConTelefono } from "@/modulos/clientes/consultas";
import { esquemaCliente, esquemaVehiculo } from "@/modulos/clientes/esquemas";
import { revisarVehiculo, type EstadoCliente, type Existentes } from "@/modulos/clientes/servidor";
import { camposConPrefijo, erroresConPrefijo, leerValores, PREFIJO_VEHICULO } from "@/modulos/clientes/valores";
import { obtenerParametros } from "@/modulos/configuracion/consultas";
import { entradaPrecios, esquemaCambioEstado, esquemaClienteElegido, esquemaNuevaVersion, esquemaPreciosNuevos, esquemaVehiculoElegido } from "./esquemas";
import { tieneReservaActiva, tieneVersiones } from "./consultas";
import { generarPdf } from "./pdf/generar";
import { CLIENTE_NUEVO, NOMBRE_ESTADO, transicionPermitida, VEHICULO_OTRO } from "./reglas";
import { escribirVersion, numeroNuevo, prepararLineas } from "./servidor";

// Cotizaciones (pedido 23, P23-cotizacion-directa.md §6). Cotiza el dueño o el encargado con "Cotizaciones" (pedido 24,
// RN-01): exigirAccion("cotizar"). Una cotización enviada no cambia (RN-02): una versión nueva la reemplaza con el
// mismo número, y la anterior queda "reemplazada" con su PDF.

const PEDIDO_ILEGIBLE = "No se pudo leer el pedido. Recarga la página.";

function despuesDeCambiar(id: number, clienteId?: number) {
  revalidatePath("/panel/cotizaciones");
  revalidatePath(`/panel/cotizaciones/${id}`);
  if (clienteId) revalidatePath(`/panel/clientes/${clienteId}`);
  // Una aceptada sin fecha aparece en "Por reservar" de la Agenda y en Inicio (pedido 31)
  revalidatePath("/panel/agenda");
  revalidatePath("/panel");
}

/** El PDF (HU-26), fuera de la transacción: si falla, la cotización ya quedó y su ficha ofrece generarlo de nuevo. */
async function conPdf(cotizacionId: number, autorId: number): Promise<boolean> {
  try {
    await generarPdf(cotizacionId, autorId);
    return true;
  } catch (error) {
    console.error(`No se pudo generar el PDF de la cotización ${cotizacionId}:`, error);
    return false;
  }
}

/**
 * Nueva cotización (pedido 23): el cliente se elige o se registra ahí mismo (nombre y WhatsApp, con el aviso de
 * repetidos de C1, RF-23), el vehículo se elige entre los suyos o se agrega, y la versión 1 con sus precios. Todo en una
 * transacción: o queda todo, o nada.
 */
export async function crearCotizacion(_previo: EstadoCliente, datos: FormData): Promise<EstadoCliente> {
  const autor = await exigirAccion("cotizar");
  const valores = leerValores(datos);
  const errores: Record<string, string> = {};

  // El cliente va en un campo oculto: si llega alterado, no hay nada que mostrar junto a un campo
  const delCliente = esquemaClienteElegido.safeParse(valores.cliente ?? "");
  if (!delCliente.success) return { mensaje: PEDIDO_ILEGIBLE };
  const elegido = delCliente.data;
  // Los precios aparte: aunque falte uno, se muestran juntos los errores del cliente, del vehículo y de la cotización
  const entrada = esquemaPreciosNuevos.safeParse(entradaPrecios(datos));
  if (!entrada.success) Object.assign(errores, erroresDe(entrada.error));

  // Cliente nuevo, con todo lo que se cargó en el paso del cliente (pedido 40): nombre y WhatsApp, y si se escribieron,
  // correo, NIT, razón social y notas. El mismo esquema que el alta de Clientes
  let nuevoCliente: z.output<typeof esquemaCliente> | null = null;
  if (elegido === CLIENTE_NUEVO) {
    const c = esquemaCliente.safeParse(valores);
    if (c.success) nuevoCliente = c.data;
    else Object.assign(errores, erroresDe(c.error));
  }

  // Vehículo: con un cliente nuevo siempre es nuevo; con uno registrado, uno suyo u "otro"
  let vehiculoId: number | null = null;
  let nuevoVehiculo: z.output<typeof esquemaVehiculo> | null = null;
  let eleccionVehiculo: number | typeof VEHICULO_OTRO | null = elegido === CLIENTE_NUEVO ? VEHICULO_OTRO : null;
  if (elegido !== CLIENTE_NUEVO) {
    const v = esquemaVehiculoElegido.safeParse(valores.vehiculo ?? "");
    if (v.success) eleccionVehiculo = v.data;
    else errores.vehiculo = v.error.issues[0].message;
  }
  if (eleccionVehiculo === VEHICULO_OTRO) {
    const n = esquemaVehiculo.safeParse(camposConPrefijo(valores, PREFIJO_VEHICULO));
    if (n.success) nuevoVehiculo = n.data;
    else Object.assign(errores, erroresConPrefijo(erroresDe(n.error), PREFIJO_VEHICULO));
  } else vehiculoId = eleccionVehiculo;
  if (!entrada.success || Object.keys(errores).length > 0) return { errores, valores };
  const precios = entrada.data;

  // Lo que el esquema no sabe: que el cliente y su vehículo existan y estén activos, y los repetidos (RF-23). El tamaño
  // del vehículo da los precios sugeridos que se copian en cada línea
  const existentes: Existentes = {};
  let tamanoId = nuevoVehiculo?.tamanoId ?? 0;
  if (typeof elegido === "number") {
    const [c] = await db.select({ id: cliente.id }).from(cliente).where(and(eq(cliente.id, elegido), eq(cliente.activo, true)));
    if (!c) return { mensaje: "Ese cliente ya no está activo. Elige otro.", valores };
    if (vehiculoId) {
      const [suyo] = await db
        .select({ tamanoId: vehiculo.tamanoId })
        .from(vehiculo)
        .where(and(eq(vehiculo.id, vehiculoId), eq(vehiculo.clienteId, elegido), eq(vehiculo.activo, true)));
      if (suyo) tamanoId = suyo.tamanoId;
      else errores.vehiculo = "Elige el vehículo.";
    }
  } else if (nuevoCliente) {
    const conTelefono = await clienteConTelefono(nuevoCliente.telefono);
    if (conTelefono) {
      errores.telefono = `Ese número ya es de ${conTelefono.nombre}.`;
      existentes.telefono = conTelefono;
    }
  }
  if (nuevoVehiculo) await revisarVehiculo(nuevoVehiculo, PREFIJO_VEHICULO, errores, existentes);
  if (Object.keys(errores).length > 0) return { errores, valores, existentes };

  const [preparadas, parametros] = await Promise.all([prepararLineas(precios.lineas, tamanoId), obtenerParametros()]);
  if ("errores" in preparadas) return { errores: preparadas.errores, valores };

  const autorId = Number(autor.id);
  let ids: { consulta: number; cliente: number; version: number };
  try {
    ids = await db.transaction(async (tx) => {
      let clienteId: number;
      if (typeof elegido === "number") {
        clienteId = elegido;
        // Un cliente al que se le cotiza sube en la lista de recientes de Clientes
        await tx.update(cliente).set({ updatedAt: sql`now()` }).where(eq(cliente.id, clienteId));
      } else {
        const [c] = await tx
          .insert(cliente)
          .values({ ...nuevoCliente!, createdBy: autorId, updatedBy: autorId })
          .returning({ id: cliente.id });
        clienteId = c.id;
      }
      if (nuevoVehiculo) {
        const [v] = await tx.insert(vehiculo).values({ ...nuevoVehiculo, clienteId, createdBy: autorId }).returning({ id: vehiculo.id });
        vehiculoId = v.id;
      } else {
        // Sigue siendo de ese cliente, con el vehículo bloqueado: un cambio de dueño a la vez no deja una cotización del
        // anterior que ese cambio no llegó a cerrar (pedido 37)
        const [suyo] = await tx
          .select({ id: vehiculo.id })
          .from(vehiculo)
          .where(and(eq(vehiculo.id, vehiculoId!), eq(vehiculo.clienteId, clienteId), eq(vehiculo.activo, true)))
          .for("no key update");
        if (!suyo) throw new VehiculoCambio();
      }
      // El encabezado, ya pendiente: agrupa las versiones y lleva el estado (D-12)
      const [encabezado] = await tx
        .insert(consulta)
        .values({ clienteId, vehiculoId: vehiculoId!, estado: "cotizado", createdBy: autorId })
        .returning({ id: consulta.id });
      const version = await escribirVersion(tx, {
        consultaId: encabezado.id,
        numero: await numeroNuevo(tx),
        version: 1,
        precios,
        lineas: preparadas.lineas,
        parametros,
        autorId,
      });
      return { consulta: encabezado.id, cliente: clienteId, version };
    });
  } catch (error) {
    if (error instanceof VehiculoCambio) return { errores: { vehiculo: "Elige el vehículo." }, valores };
    // Dos personas registrando lo mismo a la vez: lo frena el índice único
    const indice = indiceUnicoViolado(error);
    if (indice === "cliente_telefono_unico") return { errores: { telefono: "Ese número ya está registrado. Busca al cliente." }, valores };
    if (indice === "vehiculo_placa_unica") return { errores: { [`${PREFIJO_VEHICULO}placa`]: "Esa placa ya está registrada. Busca al cliente." }, valores };
    throw error;
  }

  const pdf = await conPdf(ids.version, autorId);
  despuesDeCambiar(ids.consulta, ids.cliente);
  revalidatePath("/panel/clientes");
  redirect(`/panel/cotizaciones/${ids.consulta}?creada=1${pdf ? "" : "&sinpdf=1"}`);
}

/**
 * Versión nueva de una cotización pendiente (RN-02, RF-34): reemplaza a la vigente con el mismo número, y la anterior
 * queda como estaba, con su PDF. El cliente y el vehículo no cambian.
 */
export async function guardarVersion(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const autor = await exigirAccion("cotizar");
  const r = esquemaNuevaVersion.safeParse({ consultaId: String(datos.get("consultaId") ?? ""), desde: String(datos.get("desde") ?? ""), ...entradaPrecios(datos) });
  if (!r.success) {
    const errores = erroresDe(r.error);
    // Los campos ocultos no tienen dónde mostrar su error: llegaron alterados
    if (errores.consultaId || errores.desde) return { mensaje: PEDIDO_ILEGIBLE };
    // Sin `valores`: el formulario es controlado y conserva lo escrito
    return { errores };
  }
  const d = r.data;

  const [c] = await db
    .select({ estado: consulta.estado, clienteId: consulta.clienteId, tamanoId: vehiculo.tamanoId })
    .from(consulta)
    .innerJoin(vehiculo, eq(consulta.vehiculoId, vehiculo.id))
    .where(eq(consulta.id, d.consultaId));
  if (!c) return { mensaje: "Esa cotización ya no existe." };
  // Solo una pendiente recibe versiones: una rechazada vuelve a pendiente primero y una aceptada ya no cambia
  if (c.estado !== "cotizado") {
    return { mensaje: `La cotización está ${NOMBRE_ESTADO[c.estado].toLowerCase()}: ${c.estado === "perdido" ? "vuelve a ponerla pendiente para cambiarla" : "ya no se cambia"}.` };
  }
  const [preparadas, parametros] = await Promise.all([prepararLineas(d.lineas, c.tamanoId), obtenerParametros()]);
  if ("errores" in preparadas) return { errores: preparadas.errores };
  const autorId = Number(autor.id);

  const resultado = await db.transaction(async (tx) => {
    // Candado sobre el encabezado: dos guardados a la vez no crean dos vigentes ni dos versiones con el mismo número.
    // Con él tomado se vuelve a mirar el estado (alguien la rechazó o la agendó recién)
    const [bloqueada] = await tx.select({ estado: consulta.estado }).from(consulta).where(eq(consulta.id, d.consultaId)).for("update");
    if (bloqueada?.estado !== "cotizado") return { error: "La cotización cambió de estado recién. Vuelve a su ficha." } as const;
    const [vigente] = await tx
      .select({ id: cotizacion.id, numero: cotizacion.numero })
      .from(cotizacion)
      .where(and(eq(cotizacion.consultaId, d.consultaId), eq(cotizacion.estado, "enviada")));
    if (!vigente || vigente.id !== d.desde) return { error: "Esa versión ya fue reemplazada. Vuelve a la cotización para ver la vigente." } as const;
    const [{ ultima }] = await tx.select({ ultima: max(cotizacion.version) }).from(cotizacion).where(eq(cotizacion.numero, vigente.numero));
    await tx.update(cotizacion).set({ estado: "reemplazada" }).where(eq(cotizacion.id, vigente.id));
    const id = await escribirVersion(tx, {
      consultaId: d.consultaId,
      numero: vigente.numero,
      version: (ultima ?? 0) + 1,
      precios: d,
      lineas: preparadas.lineas,
      parametros,
      autorId,
    });
    await tx.update(consulta).set({ ultimoMovimientoAt: sql`now()` }).where(eq(consulta.id, d.consultaId));
    return { id } as const;
  });
  if ("error" in resultado) return { mensaje: resultado.error };

  const pdf = await conPdf(resultado.id, autorId);
  despuesDeCambiar(d.consultaId, c.clienteId);
  redirect(`/panel/cotizaciones/${d.consultaId}?version=${resultado.id}${pdf ? "" : "&sinpdf=1"}`);
}

/** El vehículo elegido cambió de dueño o se desactivó mientras se cotizaba (pedido 37): se deshace la transacción. */
class VehiculoCambio extends Error {}

const DESTINO = { rechazar: "perdido", reabrir: "cotizado", aceptar: "confirmado" } as const;
const HECHO = {
  rechazar: "Cotización rechazada.",
  reabrir: "La cotización volvió a pendiente.",
  aceptar: "Cotización aceptada. Queda en Por reservar hasta que tenga fecha.",
} as const;

/**
 * Rechaza la cotización, con motivo, la vuelve a pendiente o la acepta sin fecha (HU-28, RF-30; pedido 31). Solo si el
 * estado lo permite (`transicionPermitida`): una aceptada con reserva activa no cambia desde aquí. Con la consulta
 * bloqueada y después su versión (el mismo orden que agendar y que una versión nueva, QA-10): si dos personas la
 * cambian a la vez, vale el primer cambio. La versión que vale acompaña al encabezado: aceptada si se acepta, enviada
 * si una aceptada sin fecha se rechaza o vuelve a pendiente (como al cancelar su reserva).
 */
export async function cambiarEstadoCotizacion(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  await exigirModulo("cotizaciones");
  const valores = { motivo: String(datos.get("motivo") ?? ""), detalle: String(datos.get("detalle") ?? "") };
  const entrada = esquemaCambioEstado.safeParse({ id: datos.get("id"), accion: datos.get("accion"), ...valores });
  if (!entrada.success) return { errores: erroresDe(entrada.error), valores };
  const d = entrada.data;
  const destino = DESTINO[d.accion];

  const resultado = await db.transaction(async (tx) => {
    // Una consulta de antes sin cotizar no es una cotización: no se mueve (quedaría pendiente sin versión, fuera de las listas)
    const [actual] = await tx
      .select({ estado: consulta.estado, clienteId: consulta.clienteId, vehiculoId: consulta.vehiculoId })
      .from(consulta)
      .where(and(eq(consulta.id, d.id), tieneVersiones))
      .for("update");
    if (!actual) return { mensaje: "Esa cotización ya no existe. Recarga la página." };
    // El vehículo pasó a otro cliente (pedido 37): su cotización no vuelve a abrirse ni se acepta; rechazarla, sí. Se lee
    // después del bloqueo, en otra consulta: la misma que bloquea vería al dueño de antes si esperó a un cambio de dueño
    const [delVehiculo] = await tx
      .select({ clienteId: vehiculo.clienteId, activo: vehiculo.activo, clienteActivo: cliente.activo })
      .from(vehiculo)
      .innerJoin(cliente, eq(cliente.id, actual.clienteId))
      .where(eq(vehiculo.id, actual.vehiculoId));
    if (d.accion !== "rechazar" && delVehiculo?.clienteId !== actual.clienteId) {
      return { mensaje: "El vehículo de esta cotización ya es de otro cliente: cotízale a él." };
    }
    // Aceptada queda en "Por reservar": no se puede prometer con el cliente o el vehículo desactivados
    if (d.accion === "aceptar" && !(delVehiculo?.activo && delVehiculo.clienteActivo)) {
      return { mensaje: "El cliente o el vehículo de esta cotización está desactivado: reactívalo en su ficha." };
    }
    const reserva = await tieneReservaActiva(d.id, tx);
    // Volver a pendiente no es una versión nueva: desde una pendiente no se "vuelve"
    if (!transicionPermitida(actual.estado, destino, reserva) || actual.estado === destino) {
      return {
        mensaje: reserva
          ? "Esta cotización ya tiene una reserva: se cambia desde la reserva. Recarga la página."
          : `Esta cotización ya está ${NOMBRE_ESTADO[actual.estado].toLowerCase()}. Recarga la página.`,
      };
    }

    await tx
      .update(consulta)
      .set({
        estado: destino,
        motivoPerdida: d.accion === "rechazar" ? d.motivo : null,
        detallePerdida: d.accion === "rechazar" ? d.detalle : null,
        ultimoMovimientoAt: sql`now()`,
      })
      .where(eq(consulta.id, d.id));
    // La versión que vale: la vigente pasa a aceptada; o la aceptada (sin reserva) vuelve a vigente
    const [desde, hacia] = destino === "confirmado" ? (["enviada", "aceptada"] as const) : actual.estado === "confirmado" ? (["aceptada", "enviada"] as const) : [null, null];
    if (desde && hacia) {
      const [version] = await tx
        .update(cotizacion)
        .set({ estado: hacia })
        .where(and(eq(cotizacion.consultaId, d.id), eq(cotizacion.estado, desde)))
        .returning({ id: cotizacion.id });
      // Sin la versión que acompaña, el encabezado quedaría en otro estado que su versión: se deshace
      if (!version) throw new CambioCruzado();
    }
    return { ok: true as const, clienteId: actual.clienteId };
  }).catch((error: unknown) => {
    if (error instanceof CambioCruzado) return { mensaje: "Alguien cambió esta cotización recién. Recarga la página." };
    throw error;
  });
  if (!("ok" in resultado)) return resultado;

  despuesDeCambiar(d.id, resultado.clienteId);
  return { ok: true, mensaje: HECHO[d.accion] };
}

/** La versión de una cotización cambió mientras se cambiaba su estado: se deshace la transacción. */
class CambioCruzado extends Error {}

/**
 * Genera el PDF de una versión que quedó sin él (falló al guardarla). Solo si todavía no tiene: el que ya existe no
 * se regenera (RN-02). Recibe datos sueltos: se validan.
 */
export async function generarPdfPendiente(datos: { cotizacionId: number }): Promise<EstadoFormulario> {
  const autor = await exigirAccion("cotizar");
  const entrada = z.object({ cotizacionId: z.number().int().positive() }).safeParse(datos);
  if (!entrada.success) return { mensaje: PEDIDO_ILEGIBLE };
  const [c] = await db
    .select({ consultaId: cotizacion.consultaId, pdf: cotizacion.pdfArchivoId })
    .from(cotizacion)
    .where(eq(cotizacion.id, entrada.data.cotizacionId));
  if (!c) return { mensaje: "Esa cotización ya no existe. Recarga la página." };
  if (!c.pdf && !(await conPdf(entrada.data.cotizacionId, Number(autor.id)))) {
    return { mensaje: "No se pudo generar el PDF. Vuelve a intentar en un momento." };
  }
  revalidatePath(`/panel/cotizaciones/${c.consultaId}`);
  return { ok: true, mensaje: "PDF listo." };
}
