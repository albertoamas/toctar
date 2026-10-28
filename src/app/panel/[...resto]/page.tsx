import { notFound } from "next/navigation";
import { Suspense } from "react";
import { exigirSesion } from "@/lib/sesion";

// Una dirección del panel que no existe: sin esto, Next la manda a la página general, que es la del sitio público. Así
// se queda en la del panel (not-found.tsx de esta carpeta, pulido 13.4).
// Siempre responde "no encontrado": no hay nada que armar al instante, así que queda fuera de esa validación
// (guía de Next 16, "instant-navigation", opting out).
export const instant = false;

export default function DireccionInexistente() {
  return (
    <Suspense>
      <NoExiste />
    </Suspense>
  );
}

// Como toda página del panel, primero la sesión: sin ella, al ingreso (no se le dice qué existe y qué no)
async function NoExiste(): Promise<never> {
  await exigirSesion();
  notFound();
}
