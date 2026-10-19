"use client";

import { SubidaFoto } from "@/componentes/panel/subida-foto";
import type { UrlsFoto } from "@/lib/fotos";
import { quitarFotoPortada, subirFotoPortada } from "../acciones";

// HU-08: foto del taller que va detrás del lema de la portada, oscurecida. Opcional: sin foto se ve el arte de la marca.

export function FotoPortada({ foto }: { foto: UrlsFoto | null }) {
  return (
    <section aria-labelledby="foto-portada-titulo" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 id="foto-portada-titulo" className="text-sm font-semibold">Foto del taller</h3>
        <p className="text-sm text-tinta-suave">Va detrás del lema, oscurecida para que se lea el texto. Horizontal y con buena luz.</p>
      </div>
      <SubidaFoto
        id="foto-portada"
        accion={subirFotoPortada}
        camposOcultos={{}}
        actual={foto ? { ...foto, alt: "Foto del taller" } : null}
        textoVacio="Sin foto: la portada muestra el arte de TocTar."
        quitar={quitarFotoPortada}
      />
    </section>
  );
}
