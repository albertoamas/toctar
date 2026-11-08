import type { Metadata } from "next";
import { Suspense } from "react";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { SeccionConEditar } from "@/componentes/panel/seccion-con-editar";
import { exigirModulo } from "@/lib/sesion";
import { FormularioSeccionParametros } from "@/modulos/configuracion/componentes/formulario-parametros";
import { obtenerParametros } from "@/modulos/configuracion/consultas";
import { CLAVES_PARAMETRO, CLAVES_SECCION_PARAMETROS, clavesDeSeccion, PARAMETROS, SECCIONES_PARAMETROS, type ClaveParametro } from "@/modulos/configuracion/parametros";

export const metadata: Metadata = { title: "Parámetros" };

// HU-05: los parámetros del negocio por tema (C5 §0). Solo el dueño. Pulido 13.29: una ficha como Negocio: los plazos de
// las cotizaciones, los textos del PDF y la agenda se leen y cada uno se edita en su modal. Antes era el único formulario
// abierto de Configuración, con los tres textos del PDF siempre a la vista.

const VOLVER = { href: "/panel/configuracion", texto: "Configuración" } as const;

export default function PaginaParametros() {
  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <Suspense fallback={<Cargando volver={VOLVER} />}>
        <Contenido />
      </Suspense>
    </div>
  );
}

async function Contenido() {
  await exigirModulo("configuracion");
  const parametros = await obtenerParametros();
  const valores = Object.fromEntries(CLAVES_PARAMETRO.map((c) => [c, String(parametros[c])])) as Record<ClaveParametro, string>;
  return (
    <>
      <EncabezadoPagina titulo="Parámetros" volver={VOLVER} />
      {CLAVES_SECCION_PARAMETROS.map((s) => {
        const { titulo } = SECCIONES_PARAMETROS[s];
        return (
          <SeccionConEditar
            key={s}
            id={`parametros-${s}`}
            titulo={titulo}
            etiquetaEditar={`Editar ${titulo.toLowerCase()}`}
            tituloModal={titulo}
            lectura={
              // La etiqueta a la izquierda y el valor a la derecha: los números quedan en columna
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-3">
                {clavesDeSeccion(s).map((c) => {
                  const p = PARAMETROS[c];
                  return (
                    <div key={c} className="contents">
                      <dt className="text-tinta-suave">{p.etiqueta}</dt>
                      {p.unidad ? (
                        <dd className="tabular-nums">
                          {valores[c]} {p.unidad}
                        </dd>
                      ) : (
                        // Los textos del PDF, en tres líneas: enteros, en su "Editar"
                        <dd className="line-clamp-3 whitespace-pre-line">{valores[c]}</dd>
                      )}
                    </div>
                  );
                })}
              </dl>
            }
          >
            <FormularioSeccionParametros seccion={s} valores={valores} />
          </SeccionConEditar>
        );
      })}
    </>
  );
}
