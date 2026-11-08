import type { Metadata } from "next";
import { Suspense } from "react";
import { Cargando } from "@/componentes/panel/cargando";
import { ListaDatos } from "@/componentes/panel/lista-datos";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { PaginaPanel, PartesIguales } from "@/componentes/panel/pagina-panel";
import { SeccionConEditar } from "@/componentes/panel/seccion-con-editar";
import { exigirModulo } from "@/lib/sesion";
import { FormularioSeccionParametros } from "@/modulos/configuracion/componentes/formulario-parametros";
import { obtenerParametros } from "@/modulos/configuracion/consultas";
import { CLAVES_PARAMETRO, CLAVES_SECCION_PARAMETROS, clavesDeSeccion, PARAMETROS, SECCIONES_PARAMETROS, type ClaveParametro, type SeccionParametros } from "@/modulos/configuracion/parametros";

export const metadata: Metadata = { title: "Parámetros" };

// HU-05: los parámetros del negocio por tema (C5 §0). Solo el dueño. Pulido 13.29: una ficha como Negocio: los plazos de
// las cotizaciones, los textos del PDF y la agenda se leen y cada uno se edita en su modal. Antes era el único formulario
// abierto de Configuración, con los tres textos del PDF siempre a la vista.

const VOLVER = { href: "/panel/configuracion", texto: "Configuración" } as const;

export default function PaginaParametros() {
  return (
    <PaginaPanel tipo="ficha">
      <Suspense fallback={<Cargando volver={VOLVER} />}>
        <Contenido />
      </Suspense>
    </PaginaPanel>
  );
}

async function Contenido() {
  await exigirModulo("configuracion");
  const parametros = await obtenerParametros();
  const valores = Object.fromEntries(CLAVES_PARAMETRO.map((c) => [c, String(parametros[c])])) as Record<ClaveParametro, string>;
  const seccion = (s: SeccionParametros) => {
    const { titulo } = SECCIONES_PARAMETROS[s];
    return (
      <SeccionConEditar
        key={s}
        id={`parametros-${s}`}
        titulo={titulo}
        etiquetaEditar={`Editar ${titulo.toLowerCase()}`}
        tituloModal={titulo}
        lectura={
          <ListaDatos
            filas={clavesDeSeccion(s).map((c) => {
              const p = PARAMETROS[c];
              return [
                p.etiqueta,
                p.unidad ? (
                  <span className="tabular-nums">
                    {valores[c]} {p.unidad}
                  </span>
                ) : (
                  // Los textos del PDF, en tres líneas: enteros, en su "Editar"
                  <span className="line-clamp-3 whitespace-pre-line">{valores[c]}</span>
                ),
              ];
            })}
          />
        }
      >
        {/* Solo los de su sección: los textos largos del PDF no viajan a los otros modales */}
        <FormularioSeccionParametros seccion={s} valores={Object.fromEntries(clavesDeSeccion(s).map((c) => [c, valores[c]]))} />
      </SeccionConEditar>
    );
  };
  return (
    <>
      <EncabezadoPagina titulo="Parámetros" volver={VOLVER} />
      <PartesIguales>{CLAVES_SECCION_PARAMETROS.filter((s) => !SECCIONES_PARAMETROS[s].ancha).map(seccion)}</PartesIguales>
      {CLAVES_SECCION_PARAMETROS.filter((s) => SECCIONES_PARAMETROS[s].ancha).map(seccion)}
    </>
  );
}
