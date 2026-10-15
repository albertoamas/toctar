import type { Metadata } from "next";
import { Suspense } from "react";
import { exigirModulo } from "@/lib/sesion";
import { ListaPreguntas } from "@/modulos/sitio/componentes/lista-preguntas";
import { listarPreguntas } from "@/modulos/sitio/consultas";

export const metadata: Metadata = { title: "Preguntas frecuentes" };

// HU-08: preguntas frecuentes del sitio. Dueño o encargado con el permiso "sitio".
export default function PaginaPreguntas() {
  return (
    <Suspense fallback={<p className="text-tinta-suave">Cargando…</p>}>
      <Lista />
    </Suspense>
  );
}

async function Lista() {
  await exigirModulo("sitio");
  const preguntas = await listarPreguntas();
  return <ListaPreguntas preguntas={preguntas.map(({ id, pregunta, respuesta, visible }) => ({ id, pregunta, respuesta, visible }))} />;
}
