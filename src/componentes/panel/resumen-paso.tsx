"use client";

import type { Route } from "next";
import Link from "next/link";
import { ArrowLeftRightIcon } from "lucide-react";
import { cn } from "cn";
import { CabeceraSeccion } from "@/componentes/panel/seccion-con-editar";
import { Button, buttonVariants } from "@/componentes/ui/button";

// Lo ya elegido en un flujo en pasos (Nueva cotización, pedido 40; Nueva reserva, pedido 41), arriba del paso: la misma
// cabecera y tarjeta que las fichas, con "Cambiar" (sin borde, como "Editar") para volver a su paso: `href`, un paso que
// se eligió por la dirección (lo puede pasar una página del servidor), o `alCambiar`, un paso del mismo formulario (solo
// desde un componente de cliente). Sin ninguno, no se cambia.

type Props = {
  id: string;
  titulo: string;
  href?: Route;
  alCambiar?: () => void;
  /** Cómo lo anuncia el lector de pantalla: "Cambiar cliente" si no se dice otra cosa. */
  etiquetaCambiar?: string;
  claseContenido?: string;
  children: React.ReactNode;
};

export function ResumenPaso({ id, titulo, href, alCambiar, etiquetaCambiar, claseContenido, children }: Props) {
  const etiqueta = etiquetaCambiar ?? `Cambiar ${titulo.toLowerCase()}`;
  const contenido = (
    <>
      <ArrowLeftRightIcon />
      Cambiar
    </>
  );
  return (
    <section aria-labelledby={`${id}-titulo`} className="flex flex-col gap-3">
      <CabeceraSeccion id={id} titulo={titulo}>
        {href ? (
          <Link href={href} className={buttonVariants({ variant: "ghost" })} aria-label={etiqueta}>
            {contenido}
          </Link>
        ) : (
          alCambiar && (
            <Button type="button" variant="ghost" onClick={alCambiar} aria-label={etiqueta}>
              {contenido}
            </Button>
          )
        )}
      </CabeceraSeccion>
      <div className={cn("flex flex-col tt-tarjeta-panel p-4", claseContenido)}>{children}</div>
    </section>
  );
}
