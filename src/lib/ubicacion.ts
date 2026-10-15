// Ubicación del taller en el mapa. El dueño pega las coordenadas o un enlace de Google Maps
// y de ahí se sacan la latitud y la longitud.

export type Coordenadas = { lat: number; lng: number };

export type ResultadoUbicacion = { ok: true; coordenadas: Coordenadas } | { ok: false; error: string };

export const ERROR_ENLACE_CORTO =
  "Ese enlace corto no trae la ubicación. En Google Maps, mantén presionado el punto del taller, copia los números que aparecen (como -21.5355, -64.7296) y pégalos aquí.";
export const ERROR_SIN_COORDENADAS =
  "No encontramos coordenadas. Pega los números de Google Maps (como -21.5355, -64.7296) o el enlace completo.";

const NUMERO = String.raw`(-?\d{1,3}(?:\.\d+)?)`;

// En orden de preferencia: el pin del lugar (!3d…!4d…) es más exacto que el centro del mapa (@…).
const PATRONES = [
  new RegExp(String.raw`!3d${NUMERO}!4d${NUMERO}`),
  new RegExp(String.raw`[?&](?:q|query|ll|destination)=${NUMERO},\s*${NUMERO}`),
  new RegExp(String.raw`@${NUMERO},${NUMERO}`),
];

function redondear(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

function validas(lat: number, lng: number): Coordenadas | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat: redondear(lat), lng: redondear(lng) };
}

export function leerUbicacion(texto: string): ResultadoUbicacion {
  const limpio = texto.trim();
  let decodificado = limpio;
  try {
    decodificado = decodeURIComponent(limpio);
  } catch {
    // Un "%" suelto: se usa el texto tal cual.
  }

  const solo = new RegExp(String.raw`^${NUMERO}\s*,\s*${NUMERO}$`).exec(decodificado);
  const coincidencia = solo ?? PATRONES.map((p) => p.exec(decodificado)).find(Boolean);
  if (coincidencia) {
    const coordenadas = validas(Number(coincidencia[1]), Number(coincidencia[2]));
    if (coordenadas) return { ok: true, coordenadas };
  }

  if (/(maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(limpio)) return { ok: false, error: ERROR_ENLACE_CORTO };
  return { ok: false, error: ERROR_SIN_COORDENADAS };
}

/** Enlace para abrir la ubicación en Google Maps (sitio y PDF). */
export function enlaceMapa({ lat, lng }: Coordenadas): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}
