import type { Route } from "next";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { cn } from "cn";
import { buttonVariants } from "@/componentes/ui/button";

// Volver a la pantalla de la que se viene, junto al título (pulido 13.18): la flecha, como en las apps. En la app
// instalada del iPhone no hay botón Atrás del navegador: este es el único camino. 44 px para el dedo.
// 21/11: la flecha sola, sin círculo ni borde (como la barra de arriba de Android y iPhone): el círculo pesaba tanto como
// un botón de acción y, en el celular, le quitaba ancho al título. Corrida a la izquierda, la flecha queda alineada con el
// borde del contenido y el toque sigue siendo de 44 px.
export function BotonVolver({ href, texto }: { href: Route; texto: string }) {
  return (
    <Link href={href} aria-label={`Volver a ${texto}`} title={`Volver a ${texto}`} className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "-ml-2.5 size-11 shrink-0 rounded-full")}>
      <ArrowLeftIcon className="size-6" aria-hidden />
    </Link>
  );
}
