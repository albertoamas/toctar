import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/componentes/ui/button";
import { exigirSesion } from "@/lib/sesion";

export const metadata: Metadata = { title: "Sin acceso" };

// A donde lleva exigirModulo cuando el usuario no tiene el módulo (RNF-05).
// forbidden() de Next.js sigue experimental en la versión 16, por eso es una página propia.
export default function SinAcceso() {
  return (
    <section className="flex max-w-prose flex-col items-start gap-4">
      <h1 className="font-heading text-4xl font-extrabold italic">Sin acceso</h1>
      <Suspense fallback={null}>
        <Explicacion />
      </Suspense>
      <Button nativeButton={false} render={<Link href="/panel" />}>Volver al inicio</Button>
    </section>
  );
}

async function Explicacion() {
  // Solo para usuarios con sesión: sin sesión, al ingreso.
  await exigirSesion();
  return (
    <p className="text-tinta-suave">
      Tu usuario no tiene habilitado este módulo. Si lo necesitas, pídeselo al dueño.
    </p>
  );
}
