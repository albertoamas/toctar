"use client";

import { GuiaFoto } from "@/componentes/panel/guia-foto";
import { SubidaFoto } from "@/componentes/panel/subida-foto";
import type { UrlsFoto } from "@/lib/fotos";
import { quitarFotoDePagina, subirFotoDePagina } from "../acciones";
import { FOTOS_DE_PAGINA, type PaginaConFoto } from "../contenido";

// La foto de una página de textos (`FOTOS_DE_PAGINA`): el taller detrás del lema de la portada (HU-08) o el equipo en
// Nosotros (24/10). Opcional.

export function FotoDePagina({ pagina, foto }: { pagina: PaginaConFoto; foto: UrlsFoto | null }) {
  const f = FOTOS_DE_PAGINA[pagina];
  const titulo = `foto-${pagina}-titulo`;
  return (
    <section aria-labelledby={titulo} className="flex max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 id={titulo} className="text-sm font-semibold">{f.titulo}</h3>
        <p className="text-sm text-tinta-suave">{f.ayuda} Se guarda al momento, sin el botón de guardar de arriba.</p>
      </div>
      <GuiaFoto {...f.guia} />
      <SubidaFoto
        id={`foto-${pagina}`}
        accion={subirFotoDePagina}
        camposOcultos={{ pagina }}
        actual={foto ? { ...foto, alt: f.alt } : null}
        textoVacio={f.vacia}
        quitar={() => quitarFotoDePagina(pagina)}
      />
    </section>
  );
}
