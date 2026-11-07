"use client";

import { GuiaFoto } from "@/componentes/panel/guia-foto";
import { SubidaFoto } from "@/componentes/panel/subida-foto";
import { quitarFotoServicio, subirFotoServicio } from "../acciones";

// HU-07: foto principal del servicio (columna derecha de su página). Las variantes son del catálogo.

type Props = {
  servicioId: number;
  nombre: string;
  foto: { miniatura: string; ancho: number | null; alto: number | null } | null;
};

export function FotoServicio({ servicioId, nombre, foto }: Props) {
  return (
    <section aria-labelledby="foto-titulo" className="tt-tarjeta-panel flex flex-col gap-4 p-4 sm:p-5">
      <div className="flex flex-col gap-1">
        <h2 id="foto-titulo" className="tt-titulo-seccion">Foto principal</h2>
        <p className="text-sm text-tinta-suave">Se ve en la tarjeta y arriba de la página del servicio. Se guarda al momento, sin el botón Guardar cambios.</p>
      </div>
      <GuiaFoto consejo="El auto, al centro." />
      <SubidaFoto
        id="foto-servicio"
        accion={subirFotoServicio}
        camposOcultos={{ servicioId }}
        actual={foto ? { ...foto, alt: nombre } : null}
        textoVacio="Sin foto: el sitio muestra la imagen de reemplazo de TocTar."
        quitar={() => quitarFotoServicio(servicioId)}
      />
    </section>
  );
}
