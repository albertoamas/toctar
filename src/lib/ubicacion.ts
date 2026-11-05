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

// Pedido 38: la ficha del taller en Google Maps. El dueño pega lo que la ficha le da en "Compartir": el enlace (abre la
// ficha, con su nombre, estrellas y ruta) y el código de "Insertar un mapa" (el mapa con la tarjeta del negocio). Sin
// clave ni Place ID. Del código solo se guarda la dirección del mapa, validada: nunca se inserta el HTML pegado.

export const ERROR_ENLACE_MAPA = "Pega el enlace de Google Maps: en la ficha del taller, Compartir → Copiar vínculo.";
export const ERROR_MAPA_INSERTADO = "Pega el código de Google Maps: en la ficha del taller, Compartir → Insertar un mapa → Copiar HTML.";

/** Lo que se guarda del enlace: el enlace (null si se escribieron solo coordenadas) y sus coordenadas, si las trae. */
export type EnlaceMapa = { enlace: string | null; coordenadas: Coordenadas | null };
/** Lo que se guarda del mapa: la dirección del `<iframe>` y sus coordenadas, si las trae. */
export type MapaInsertado = { src: string; coordenadas: Coordenadas | null };

type Lectura<T> = { ok: true; valor: T } | { ok: false; error: string };

// google.com, google.com.bo, maps.google.com…
const DOMINIO_GOOGLE = /^(?:www\.|maps\.)?google\.[a-z]{2,3}(?:\.[a-z]{2})?$/;

function aUrl(texto: string): URL | null {
  try {
    // Pegado sin "https://" (www.google.com/maps/…): se completa, como en las redes
    return new URL(/^[a-z][a-z\d+.-]*:/i.test(texto) ? texto : `https://${texto}`);
  } catch {
    return null;
  }
}

function sinCredenciales(url: URL): boolean {
  return url.protocol === "https:" && !url.username && !url.password && !url.port;
}

function esEnlaceDeMaps(url: URL): boolean {
  if (!sinCredenciales(url)) return false;
  const host = url.hostname.toLowerCase();
  if (host === "maps.app.goo.gl") return url.pathname.length > 1;
  if (host === "goo.gl") return url.pathname.startsWith("/maps/");
  if (!DOMINIO_GOOGLE.test(host)) return false;
  return host.startsWith("maps.") || url.pathname === "/maps" || url.pathname.startsWith("/maps/");
}

/** El enlace de la ficha, uno largo de Google Maps o las coordenadas solas. Vacío: null. */
export function leerEnlaceMapa(texto: string): Lectura<EnlaceMapa | null> {
  const limpio = texto.trim();
  if (!limpio) return { ok: true, valor: null };
  const coordenadas = leerUbicacion(limpio);
  // Sin letras: son las coordenadas de siempre
  if (!/[a-z]/i.test(limpio)) {
    return coordenadas.ok ? { ok: true, valor: { enlace: null, coordenadas: coordenadas.coordenadas } } : { ok: false, error: ERROR_ENLACE_MAPA };
  }
  const url = aUrl(limpio);
  if (!url || !esEnlaceDeMaps(url)) return { ok: false, error: ERROR_ENLACE_MAPA };
  return { ok: true, valor: { enlace: url.href, coordenadas: coordenadas.ok ? coordenadas.coordenadas : null } };
}

/** El código de "Insertar un mapa" (el `<iframe>` entero) o solo su dirección. Vacío: null. */
export function leerMapaInsertado(texto: string): Lectura<MapaInsertado | null> {
  const limpio = texto.trim();
  if (!limpio) return { ok: true, valor: null };
  const src = (/<iframe\b[^>]*?\bsrc\s*=\s*["']([^"']+)["']/i.exec(limpio)?.[1] ?? limpio).replace(/&amp;/g, "&");
  const url = aUrl(src);
  const pb = url?.searchParams.get("pb");
  if (!url || !sinCredenciales(url) || url.hostname.toLowerCase() !== "www.google.com" || url.pathname !== "/maps/embed" || !pb) {
    return { ok: false, error: ERROR_MAPA_INSERTADO };
  }
  // En el mapa, la longitud va antes: !2d<lng>!3d<lat>
  const pin = /!2d(-?\d{1,3}(?:\.\d+)?)!3d(-?\d{1,3}(?:\.\d+)?)/.exec(pb);
  return { ok: true, valor: { src: url.href, coordenadas: pin ? validas(Number(pin[2]), Number(pin[1])) : null } };
}

/**
 * Lo que muestra el campo del enlace: el enlace guardado o, si no hay, las coordenadas. Salvo que las coordenadas
 * sean el pin del mapa pegado: esas no se escribieron en el enlace y no se muestran como si se hubieran escrito.
 */
export function textoEnlaceMapa(enlace: string | null, coordenadas: Coordenadas | null, mapaInsertado: string | null = null): string {
  if (enlace) return enlace;
  if (!coordenadas) return "";
  const delMapa = mapaInsertado ? leerMapaInsertado(mapaInsertado) : null;
  const pin = delMapa?.ok ? delMapa.valor?.coordenadas : null;
  if (pin && pin.lat === coordenadas.lat && pin.lng === coordenadas.lng) return "";
  return `${coordenadas.lat}, ${coordenadas.lng}`;
}

/** "Cómo llegar": la ficha del taller; si no está, las coordenadas; si tampoco, la dirección. */
export function enlaceComoLlegar(d: { enlaceMapa: string | null; coordenadas: Coordenadas | null; direccion: string }): string {
  if (d.enlaceMapa) return d.enlaceMapa;
  if (d.coordenadas) return enlaceMapa(d.coordenadas);
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.direccion)}`;
}

/** El mapa de Contacto: el de la ficha; si no está, uno con las coordenadas; si tampoco, ninguno. */
export function mapaDeContacto(d: { mapaInsertado: string | null; coordenadas: Coordenadas | null }): string | null {
  if (d.mapaInsertado) return d.mapaInsertado;
  if (d.coordenadas) return `https://www.google.com/maps?q=${d.coordenadas.lat},${d.coordenadas.lng}&z=16&output=embed`;
  return null;
}
