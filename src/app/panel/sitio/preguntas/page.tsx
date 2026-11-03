import type { Metadata } from "next";
import { Suspense } from "react";
import { Cargando } from "@/componentes/panel/cargando";
import { exigirModulo } from "@/lib/sesion";
import { ListaPreguntas } from "@/modulos/sitio/componentes/lista-preguntas";
import { listarPreguntas } from "@/modulos/sitio/consultas";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";

export const metadata: Metadata = { title: "Preguntas frecuentes" };

// HU-08: preguntas frecuentes del sitio. Dueño o encargado con el permiso "sitio".
export default function PaginaPreguntas() {
  return (
    <>
      <EncabezadoPagina titulo="Preguntas frecuentes" volver={{ href: "/panel/sitio", texto: "Sitio web" }} />
      <Suspense fallback={<Cargando />}>
        <Lista />
      </Suspense>
    </>
  );
}

async function Lista() {
  await exigirModulo("sitio");
  const preguntas = await listarPreguntas();
  return <ListaPreguntas preguntas={preguntas.map(({ id, pregunta, respuesta, visible }) => ({ id, pregunta, respuesta, visible }))} />;
}
