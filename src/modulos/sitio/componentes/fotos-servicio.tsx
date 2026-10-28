"use client";

import { SubidaFoto } from "@/componentes/panel/subida-foto";
import { quitarFotoDeSeccion, subirFotoDeSeccion } from "../acciones";
import { SECCIONES_FOTO, type SeccionFoto } from "../secciones-foto";

// Las fotos de la página de un servicio (pedido de la demo del 24/10): un lugar por sección ("Cómo lo hacemos",
// "Opciones"), vacío hasta que se sube una. En el sitio va al lado de esa sección. Decorativas: sin descripción
// (revisión de YankoSoft, 24/10). Se guardan al momento, sin Guardar cambios.

type Foto = { miniatura: string; ancho: number | null; alto: number | null };

type Props = {
  servicioId: number;
  fotos: Partial<Record<SeccionFoto, Foto>>;
  /** Por sección, por qué no se ve en el sitio (sin pasos o sin opciones). */
  sinContenido: Partial<Record<SeccionFoto, string>>;
  /** Secciones que no aplican a este servicio (sin opciones en el catálogo): su foto no se ofrece (pulido 13.2). */
  ocultas?: SeccionFoto[];
};

export function FotosServicio({ servicioId, fotos, sinContenido, ocultas = [] }: Props) {
  return (
    <section aria-labelledby="fotos-secciones-titulo" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="fotos-secciones-titulo" className="font-heading text-2xl font-bold italic">Fotos de la página</h2>
        <p className="text-sm text-tinta-suave">Una foto al lado de cada parte de la página. Si es un afiche, lo que dice escríbelo también en la página: Google no lee la imagen.</p>
      </div>
      <ul className="flex flex-col gap-6">
        {(Object.entries(SECCIONES_FOTO) as [SeccionFoto, string][]).filter(([seccion]) => !ocultas.includes(seccion)).map(([seccion, nombre]) => {
          const actual = fotos[seccion];
          return (
            <li key={seccion} className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold">{nombre}</h3>
              {sinContenido[seccion] && <p className="text-sm text-tinta-suave">{sinContenido[seccion]}</p>}
              <SubidaFoto
                id={`foto-${seccion}`}
                nombre={nombre}
                entera
                accion={subirFotoDeSeccion}
                camposOcultos={{ servicioId, seccion }}
                actual={actual ? { ...actual, alt: `Foto de "${nombre}"` } : null}
                textoVacio="Sin foto: la sección va solo con su texto."
                quitar={() => quitarFotoDeSeccion({ servicioId, seccion })}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
