"use client";

import { GuiaFoto } from "@/componentes/panel/guia-foto";
import { SubidaFoto } from "@/componentes/panel/subida-foto";
import { quitarFotoDeSeccion, quitarFotoServicio, subirFotoDeSeccion, subirFotoServicio } from "../acciones";
import { SECCIONES_FOTO, type SeccionFoto } from "../secciones-foto";

// Las fotos de la página de un servicio, cada una dentro de su parte de la ficha (pulido 13.19): la principal arriba,
// junto al resumen; la de cada sección ("Cómo lo hacemos", "Opciones"), junto a su texto, como en el sitio. Se guardan
// al momento. La guía, solo mientras no hay foto: con una ya puesta, ocupaba lugar en cada visita.

type Foto = { miniatura: string; ancho: number | null; alto: number | null };

export function FotoServicio({ servicioId, nombre, foto }: { servicioId: number; nombre: string; foto: Foto | null }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-semibold">Foto principal</p>
      {!foto && <GuiaFoto consejo="El auto, al centro." />}
      <SubidaFoto
        id="foto-servicio"
        accion={subirFotoServicio}
        camposOcultos={{ servicioId }}
        actual={foto ? { ...foto, alt: nombre } : null}
        textoVacio="Sin foto: el sitio muestra la imagen de reemplazo de TocTar."
        quitar={() => quitarFotoServicio(servicioId)}
      />
    </div>
  );
}

/** La foto al lado de una sección. Decorativa: sin descripción (revisión de YankoSoft, 24/10). */
export function FotoDeSeccion({ servicioId, seccion, foto }: { servicioId: number; seccion: SeccionFoto; foto: Foto | undefined }) {
  const nombre = SECCIONES_FOTO[seccion];
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-semibold">Foto al lado</p>
      {!foto && <GuiaFoto consejo="Un afiche se ve entero; lo que dice, escríbelo también en el texto: Google no lee la imagen." />}
      <SubidaFoto
        id={`foto-${seccion}`}
        nombre={nombre}
        entera
        accion={subirFotoDeSeccion}
        camposOcultos={{ servicioId, seccion }}
        actual={foto ? { ...foto, alt: `Foto de "${nombre}"` } : null}
        textoVacio="Sin foto: la sección va solo con su texto."
        quitar={() => quitarFotoDeSeccion({ servicioId, seccion })}
      />
    </div>
  );
}
