import type { Route } from "next";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { cn } from "cn";
import { buttonVariants } from "@/componentes/ui/button";

// Volver a la pantalla de la que se viene, junto al título (pulido 13.18): un botón redondo con flecha, como en las apps.
// Antes era un texto gris de 14 px arriba del título, a distinta distancia según la pantalla y fácil de pasar por alto. En
// la app instalada del iPhone no hay botón Atrás del navegador: este es el único camino. 44 px para el dedo.
export function BotonVolver({ href, texto }: { href: Route; texto: string }) {
  return (
    <Link href={href} aria-label={`Volver a ${texto}`} title={`Volver a ${texto}`} className={cn(buttonVariants({ variant: "outline", size: "icon" }), "size-11 shrink-0 rounded-full")}>
      <ArrowLeftIcon className="size-5" aria-hidden />
    </Link>
  );
}
