"use client";

import Link from "next/link";
import { Monograma } from "./iconos-marca";

// Contenido del error inesperado en el sitio y fuera del panel (pulido 13.5): el mismo estilo que "No encontramos esta
// página" (no-encontrada.tsx). Lo usan src/app/(sitio)/error.tsx, dentro del marco del sitio, y src/app/error.tsx.
// "Volver a intentar" vuelve a cargar solo lo que falló (retry de Next 16).
export function ErrorInesperado({ retry }: { retry: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center">
      <Monograma className="w-24 fill-tinta" />
      <h1 className="font-heading text-[40px] leading-[44px] font-extrabold italic">Algo salió mal</h1>
      <p className="max-w-md text-tinta-suave">Fue un problema nuestro. Vuelve a intentar en un momento.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" onClick={() => retry()} className="tt-boton tt-boton--principal">
          Volver a intentar
        </button>
        <Link href="/" className="tt-boton tt-boton--contorno">
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
