"use client";

import type { Route } from "next";
import Link from "next/link";
import { ArrowLeftRightIcon } from "lucide-react";
import { Button, buttonVariants } from "@/componentes/ui/button";

// "Cambiar" de lo ya elegido en un flujo en pasos. Desde el 20/11 lo ya elegido no va en tarjetas arriba de cada paso (se
// vuelve tocando el paso en el indicador, PasosFlujo): queda el botón, que usa la tarjeta del cliente y su vehículo.

/**
 * "Cambiar" de lo ya elegido, sin borde: un enlace a su paso (`href`) o un botón del mismo formulario (`alCambiar`). Sin
 * ninguno, nada. Lo usa la tarjeta del cliente y su vehículo (`ResumenClienteVehiculo`).
 */
export function BotonCambiar({ href, alCambiar, etiqueta }: { href?: Route; alCambiar?: () => void; etiqueta: string }) {
  const contenido = (
    <>
      <ArrowLeftRightIcon />
      Cambiar
    </>
  );
  if (href) {
    return (
      <Link href={href} className={buttonVariants({ variant: "accion" })} aria-label={etiqueta}>
        {contenido}
      </Link>
    );
  }
  if (!alCambiar) return null;
  return (
    <Button type="button" variant="accion" onClick={alCambiar} aria-label={etiqueta}>
      {contenido}
    </Button>
  );
}
