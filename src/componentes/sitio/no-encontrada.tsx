import Link from "next/link";
import { Monograma } from "./iconos-marca";

// Contenido de la página no encontrada: una dirección que no existe o un servicio oculto (B4). Lo usan la página
// general (src/app/not-found.tsx, con el marco del sitio) y la del sitio (dentro de su diseño), para que se vean iguales.
export function NoEncontrada() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center">
      <Monograma className="w-24 fill-tinta" />
      <h1 className="font-heading text-[40px] leading-[44px] font-extrabold italic">No encontramos esta página</h1>
      <p className="max-w-md text-tinta-suave">Puede que la dirección esté mal escrita o que la página ya no exista.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/" className="tt-boton tt-boton--contorno">Ir al inicio</Link>
        <Link href="/servicios" className="tt-boton tt-boton--contorno">Ver los servicios</Link>
      </div>
    </div>
  );
}

export const METADATOS_NO_ENCONTRADA = { title: "Página no encontrada" };
