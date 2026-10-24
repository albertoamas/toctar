import type { Metadata } from "next";
import { Suspense } from "react";
import { Cargando } from "@/componentes/panel/cargando";
import { exigirModulo } from "@/lib/sesion";
import { FormularioParametros } from "@/modulos/configuracion/componentes/formulario-parametros";
import { obtenerParametros } from "@/modulos/configuracion/consultas";
import { CLAVES_PARAMETRO, type ClaveParametro } from "@/modulos/configuracion/parametros";

export const metadata: Metadata = { title: "Parámetros" };

// HU-05: los parámetros del negocio por tema: consultas, cotizaciones (y los textos del PDF), agenda y mantenimiento
// (C5 §0). Solo el dueño.
export default function PaginaParametros() {
  return (
    <Suspense fallback={<Cargando />}>
      <Contenido />
    </Suspense>
  );
}

async function Contenido() {
  await exigirModulo("configuracion");
  const parametros = await obtenerParametros();
  const valores = Object.fromEntries(CLAVES_PARAMETRO.map((c) => [c, String(parametros[c])])) as Record<ClaveParametro, string>;
  return <FormularioParametros valores={valores} />;
}
