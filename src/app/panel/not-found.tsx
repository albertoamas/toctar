import type { Metadata } from "next";
import Link from "next/link";
import { cn } from "cn";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { buttonVariants } from "@/componentes/ui/button";

export const metadata: Metadata = { title: "No encontrado" };

// Un cliente, una orden o una dirección del panel que no existe (notFound() en sus páginas, o `[...resto]`): se queda
// dentro del panel, con su menú, y no en la página del sitio público (pulido 13.4).
export default function NoEncontradoPanel() {
  return (
    <section className="flex max-w-2xl flex-col gap-6">
      <EncabezadoPagina titulo="No encontramos esto">Puede que se haya borrado, que el enlace sea viejo o que la dirección esté mal escrita.</EncabezadoPagina>
      <div>
        {/* Enlace con forma de botón: lleva a otra pantalla */}
        <Link href="/panel" className={cn(buttonVariants())}>
          Ir al inicio
        </Link>
      </div>
    </section>
  );
}
