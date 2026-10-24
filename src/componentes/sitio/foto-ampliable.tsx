"use client";

import Image from "next/image";
import { useState } from "react";
import type { UrlsFoto } from "@/lib/fotos";
import { DialogoFoto, FotoGrande } from "./dialogo-foto";

// La foto al lado de una sección de la página de un servicio (pedido de la demo del 24/10). Se toca para verla en
// grande (el mismo diálogo de la galería): así un afiche se puede leer en el celular. Nunca está en la primera
// pantalla: carga al acercarse. El marco toma la forma de la foto (sin bandas a los costados de un afiche vertical).

export function FotoAmpliable({ foto, descripcion }: { foto: UrlsFoto; descripcion: string }) {
  const [abierta, setAbierta] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setAbierta(true)}
        aria-label={`Ampliar: ${descripcion}`}
        className="mx-auto block w-fit max-w-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foco)]"
      >
        <Image
          src={foto.url}
          alt=""
          width={foto.ancho ?? 1600}
          height={foto.alto ?? 1200}
          unoptimized
          loading="lazy"
          className="h-auto max-h-[32rem] w-auto max-w-full"
        />
      </button>
      <DialogoFoto abierto={abierta} alCerrar={() => setAbierta(false)} titulo={descripcion}>
        <FotoGrande foto={foto} alt={descripcion} />
      </DialogoFoto>
    </>
  );
}
