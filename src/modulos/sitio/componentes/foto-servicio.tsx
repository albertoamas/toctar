"use client";

import { SubidaFoto } from "@/componentes/panel/subida-foto";
import { quitarFotoDeSeccion, quitarFotoServicio, subirFotoDeSeccion, subirFotoServicio } from "../acciones";
import { SECCIONES_FOTO, type SeccionFoto } from "../secciones-foto";

// Las fotos de la página de un servicio, cada una dentro de su parte de la ficha (pulido 13.19): la principal arriba,
// junto al resumen; la de cada sección ("Cómo lo hacemos", "Opciones"), junto a su texto, como en el sitio. Se guardan
// al momento. Una fila compacta al pie de su parte: una columna alta al costado dejaba huecos en blanco. La guía, en una
// línea y solo mientras no hay foto.

type Foto = { miniatura: string; ancho: number | null; alto: number | null };

/** La fila de la foto, separada del texto de su parte. */
const AL_PIE = "border-t border-border pt-4";

export function FotoServicio({ servicioId, nombre, foto }: { servicioId: number; nombre: string; foto: Foto | null }) {
  return (
    <div className={AL_PIE}>
      <SubidaFoto
        id="foto-servicio"
        accion={subirFotoServicio}
        camposOcultos={{ servicioId }}
        actual={foto ? { ...foto, alt: nombre } : null}
        textoVacio="Sin foto: el sitio muestra la imagen de reemplazo de TocTar."
        quitar={() => quitarFotoServicio(servicioId)}
        compacta={{ titulo: "Foto principal", guia: "Formato 4:3, con el celular acostado y el auto al centro." }}
      />
    </div>
  );
}

/** La foto al lado de una sección. Decorativa: sin descripción (revisión de YankoSoft, 24/10). */
export function FotoDeSeccion({ servicioId, seccion, foto }: { servicioId: number; seccion: SeccionFoto; foto: Foto | undefined }) {
  const nombre = SECCIONES_FOTO[seccion];
  return (
    <div className={AL_PIE}>
      <SubidaFoto
        id={`foto-${seccion}`}
        nombre={nombre}
        entera
        accion={subirFotoDeSeccion}
        camposOcultos={{ servicioId, seccion }}
        actual={foto ? { ...foto, alt: `Foto de "${nombre}"` } : null}
        textoVacio=""
        quitar={() => quitarFotoDeSeccion({ servicioId, seccion })}
        compacta={{ titulo: "Foto al lado (opcional)", guia: "Formato 4:3, o un afiche: lo que diga, escríbelo también en el texto." }}
      />
    </div>
  );
}
