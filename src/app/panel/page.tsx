import { Suspense } from "react";
import { exigirModulo } from "@/lib/sesion";

// Inicio del panel provisional. Desde HU-17 muestra los reclamos pendientes (S-4).
export default function InicioPanel() {
  return (
    <section className="flex flex-col gap-2">
      <h1 className="font-heading text-4xl font-extrabold italic">Inicio</h1>
      <Suspense fallback={<p className="text-muted-foreground">Cargando…</p>}>
        <Bienvenida />
      </Suspense>
    </section>
  );
}

async function Bienvenida() {
  const usuario = await exigirModulo("inicio");
  return <p className="text-muted-foreground">Hola, {usuario.nombre}.</p>;
}
