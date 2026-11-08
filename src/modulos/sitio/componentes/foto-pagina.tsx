"use client";

import { SubidaFoto } from "@/componentes/panel/subida-foto";
import type { UrlsFoto } from "@/lib/fotos";
import { quitarFotoDePagina, subirFotoDePagina } from "../acciones";
import { FOTOS_DE_PAGINA, type PaginaConFoto } from "../contenido";

// La foto de una página de textos (`FOTOS_DE_PAGINA`): el taller detrás del lema de la portada (HU-08) o el equipo en
// Nosotros (24/10). Opcional. Una fila compacta al pie de su página (pulido 13.20, como en el servicio): la miniatura,
// su título y los botones, o la guía en una línea mientras falta. Se guarda al momento.

export function FotoDePagina({ pagina, foto }: { pagina: PaginaConFoto; foto: UrlsFoto | null }) {
  const f = FOTOS_DE_PAGINA[pagina];
  return (
    <section aria-label={f.titulo} className="border-t border-border pt-4">
      <SubidaFoto
        id={`foto-${pagina}`}
        accion={subirFotoDePagina}
        camposOcultos={{ pagina }}
        actual={foto ? { ...foto, alt: f.alt } : null}
        textoVacio={f.vacia}
        quitar={() => quitarFotoDePagina(pagina)}
        compacta={{ titulo: f.titulo, guia: f.guia }}
      />
    </section>
  );
}
