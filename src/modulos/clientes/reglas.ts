// Reglas puras de clientes y vehículos (C1). Sin base ni servidor: las prueba tests/unit/clientes.test.ts.

/**
 * Placa como se guarda: mayúsculas, sin espacios, guiones ni puntos ("1234 abc" → "1234ABC"). Así una placa escrita
 * de dos maneras es la misma y el aviso de duplicado funciona (RF-23). Devuelve null si no parece una placa.
 */
export function normalizarPlaca(texto: string): string | null {
  const placa = texto.toUpperCase().replace(/[\s.\-]/g, "");
  return /^[A-Z0-9]{2,10}$/.test(placa) ? placa : null;
}

/** Año máximo de un vehículo: el siguiente al actual (salen modelos del año que viene). */
export const anioMaximo = (hoy: Date = new Date()) => hoy.getFullYear() + 1;
export const ANIO_MINIMO = 1950;

export type Busqueda = {
  /** Texto para el nombre, sin espacios de más. */
  texto: string;
  /** Solo los dígitos, para el teléfono: si hay al menos 3 (con menos, coincidirían casi todos). */
  digitos: string | null;
  /** Como se guarda una placa: mayúsculas, sin espacios ni guiones. Null si no queda nada. */
  placa: string | null;
};

/**
 * Lo que se escribe en el buscador de clientes (HU-22) se busca a la vez en el nombre, el teléfono y la placa:
 * "7123" encuentra el teléfono, "1234-abc" la placa y "jose" el nombre. Null si está vacío.
 */
export function normalizarBusqueda(q: string): Busqueda | null {
  const texto = q.trim().replace(/\s+/g, " ");
  if (!texto) return null;
  const digitos = texto.replace(/\D/g, "");
  const placa = texto.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return { texto, digitos: digitos.length >= 3 ? digitos : null, placa: placa || null };
}

/** Cuántas placas muestra la fila de un cliente en la lista: con más, la fila dejaría de leerse de un vistazo. */
const PLACAS_EN_FILA = 3;

/**
 * Las placas de un cliente en su fila de la lista (pulido 8.1): hasta tres y "y N más". Las que contienen lo buscado
 * (escrito como placa) van primero, así la buscada se ve aunque sea el quinto vehículo. Null si no tiene vehículos.
 */
export function placasEnFila(placas: string[], busqueda: Busqueda | null): string | null {
  if (placas.length === 0) return null;
  const buscada = busqueda?.placa;
  const orden = buscada ? [...placas.filter((p) => p.includes(buscada)), ...placas.filter((p) => !p.includes(buscada))] : placas;
  const vistas = orden.slice(0, PLACAS_EN_FILA).join(", ");
  const resto = orden.length - PLACAS_EN_FILA;
  return resto > 0 ? `${vistas} y ${resto} más` : vistas;
}

/** Escapa los comodines de LIKE (% y _) para que se busquen como texto. */
export const escaparLike = (texto: string) => texto.replace(/[\\%_]/g, (c) => `\\${c}`);

/** Prefijo de los campos de un vehículo en la ficha: hay un formulario por vehículo y otro para agregar. */
/** "  Juan  Pérez " → "Juan": el saludo. Vacío si no hay nombre. */
export const primerNombre = (nombre: string) => nombre.trim().split(/\s+/)[0];

/** "Toyota Corolla", o "" si no se cargaron marca ni modelo (los espacios sueltos no cuentan). */
export const nombreVehiculo = (v: { marca: string | null; modelo: string | null }) =>
  [v.marca, v.modelo]
    .map((x) => x?.trim())
    .filter(Boolean)
    .join(" ");

/**
 * Lo que se sabe del vehículo además de su placa y su tamaño ("Toyota Corolla", 2019, "Blanco"), en ese orden: lo
 * muestran la ficha del cliente, Nueva consulta y la reserva (DatosVehiculo). Sin marca, modelo, año ni color, vacío.
 */
export const detalleVehiculo = (v: { marca: string | null; modelo: string | null; anio: number | null; color: string | null }) =>
  [nombreVehiculo(v), v.anio, v.color?.trim()].filter((d): d is string | number => !!d);

/** "Toyota Corolla, 1234ABC", o solo la placa si no se cargaron marca ni modelo: el vehículo en una lista. */
export const vehiculoEnLista = (v: { marca: string | null; modelo: string | null; placa: string }) => [nombreVehiculo(v), v.placa].filter(Boolean).join(", ");

export const prefijoVehiculo = (id?: number) => (id ? `vehiculo-${id}-` : "vehiculo-nuevo-");
