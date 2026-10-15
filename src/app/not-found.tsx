import Link from "next/link";
import { Monograma } from "@/componentes/sitio/iconos-marca";

// Página no encontrada: una dirección que no existe o un servicio oculto (B4).
export default function NoEncontrada() {
  return (
    <main data-theme="oscuro" className="flex flex-1 flex-col items-center justify-center gap-6 bg-fondo px-4 py-24 text-center text-tinta">
      <Monograma className="w-24 fill-tinta" />
      <h1 className="font-heading text-[40px] leading-[44px] font-extrabold italic">No encontramos esta página</h1>
      <p className="max-w-md text-tinta-suave">Puede que la dirección esté mal escrita o que la página ya no exista.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/" className="tt-boton tt-boton--contorno">Ir al inicio</Link>
        <Link href="/servicios" className="tt-boton tt-boton--contorno">Ver los servicios</Link>
      </div>
    </main>
  );
}
