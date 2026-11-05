import type { DiaHorario } from "@/lib/horarios";
import { enlaceComoLlegar, type Coordenadas } from "@/lib/ubicacion";

// Datos de negocio local para Google (HU-18, RF-09): JSON-LD de schema.org con lo que cargó el dueño.
// Puro: se prueba en tests/unit/negocio-local.test.ts.

const DIA_SCHEMA = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

type Datos = {
  nombre: string;
  direccion: string;
  coordenadas: Coordenadas | null;
  /** Pedido 38: la ficha en Google Maps; va como hasMap. */
  enlaceMapa?: string | null;
  horarios: DiaHorario[];
  whatsapp: string | null;
  correo: string | null;
  redes: Partial<Record<string, string>>;
};

/** Un turno por entrada; los días con el mismo turno se juntan, como recomienda schema.org. */
export function horariosSchema(dias: DiaHorario[]) {
  const porTurno = new Map<string, { dayOfWeek: string[]; opens: string; closes: string }>();
  for (const d of dias) {
    for (const t of d.turnos) {
      const clave = `${t.desde}-${t.hasta}`;
      const entrada = porTurno.get(clave) ?? { dayOfWeek: [], opens: t.desde, closes: t.hasta };
      entrada.dayOfWeek.push(DIA_SCHEMA[d.dia - 1]);
      porTurno.set(clave, entrada);
    }
  }
  return [...porTurno.values()].map((e) => ({ "@type": "OpeningHoursSpecification", ...e }));
}

export function datosNegocioLocal(d: Datos, url: string) {
  const redes = Object.values(d.redes).filter((r): r is string => !!r);
  return {
    "@context": "https://schema.org",
    "@type": "AutomotiveBusiness",
    name: d.nombre,
    url,
    image: `${url}/iconos/icono-512.png`,
    address: {
      "@type": "PostalAddress",
      streetAddress: d.direccion,
      addressLocality: "Tarija",
      addressRegion: "Tarija",
      addressCountry: "BO",
    },
    ...(d.coordenadas && { geo: { "@type": "GeoCoordinates", latitude: d.coordenadas.lat, longitude: d.coordenadas.lng } }),
    ...((d.enlaceMapa || d.coordenadas) && { hasMap: enlaceComoLlegar({ enlaceMapa: d.enlaceMapa ?? null, coordenadas: d.coordenadas, direccion: d.direccion }) }),
    ...(d.whatsapp && { telephone: `+${d.whatsapp}` }),
    ...(d.correo && { email: d.correo }),
    ...(redes.length > 0 && { sameAs: redes }),
    openingHoursSpecification: horariosSchema(d.horarios),
  };
}

/** JSON listo para un <script type="application/ld+json">: sin "<" que pueda cerrar la etiqueta. */
export function jsonLd(datos: object): string {
  return JSON.stringify(datos).replace(/</g, "\\u003c");
}
