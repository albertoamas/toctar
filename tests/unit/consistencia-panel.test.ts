import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// C6 (docs/06-diseno/sistema-del-panel.md): las reglas de estructura del panel, revisadas en el código. Las listas de abajo
// son lo que todavía no se pasó a las piezas comunes, con cuántas veces aparece en cada archivo, y solo se achican: migrar
// una pantalla es bajar su número o quitarla, y lo nuevo no entra. Lo que quede al terminar C6 tiene que tener su motivo
// escrito. `src/componentes/` no se revisa: ahí viven las piezas comunes.

const esComentario = (linea: string) => /^\s*(\/\/|\/\*|\*|\{\/\*)/.test(linea);

/** Las líneas de código de cada archivo del panel y de los módulos. */
const codigo = new Map(
  ["src/app/panel", "src/modulos"]
    .flatMap((raiz) =>
      readdirSync(raiz, { recursive: true, encoding: "utf8" })
        .filter((f) => /\.tsx?$/.test(f))
        .map((f) => join(raiz, f).replaceAll("\\", "/")),
    )
    .sort()
    .map((a) => [a, readFileSync(a, "utf8").split(/\r?\n/).filter((l) => !esComentario(l))]),
);

/** En qué archivos aparece y cuántas líneas. */
function apariciones(patron: RegExp): Record<string, number> {
  return Object.fromEntries([...codigo].flatMap(([a, lineas]) => {
    const veces = lineas.filter((l) => patron.test(l)).length;
    return veces ? [[a, veces]] : [];
  }));
}

/** Páginas que todavía no dicen su tipo con `PaginaPanel`. Fases 3 y 4; las que solo redirigen se justifican al final. */
const SIN_PAGINA_PANEL = [
  "src/app/panel/[...resto]/page.tsx",
  "src/app/panel/agenda/[id]/page.tsx",
  "src/app/panel/clientes/[id]/page.tsx",
  "src/app/panel/configuracion/mensajes/page.tsx",
  "src/app/panel/configuracion/negocio/page.tsx",
  "src/app/panel/configuracion/page.tsx",
  "src/app/panel/configuracion/parametros/page.tsx",
  "src/app/panel/configuracion/taller/page.tsx",
  "src/app/panel/cotizaciones/[id]/page.tsx",
  "src/app/panel/mantenimientos/page.tsx",
  "src/app/panel/ordenes/[id]/page.tsx",
  "src/app/panel/page.tsx",
  "src/app/panel/pagos/page.tsx",
  "src/app/panel/reclamos/[id]/page.tsx",
  "src/app/panel/sin-acceso/page.tsx",
  "src/app/panel/sitio/galeria/page.tsx",
  "src/app/panel/sitio/page.tsx",
  "src/app/panel/sitio/preguntas/page.tsx",
  "src/app/panel/sitio/servicios/[id]/page.tsx",
  "src/app/panel/sitio/servicios/page.tsx",
  "src/app/panel/sitio/textos/page.tsx",
  "src/app/panel/usuarios/[id]/page.tsx",
];

/** Anchos de pantalla escritos a mano. Los de un campo o un bloque chico (`max-w-xs`, `max-w-md`) sí valen (§1). */
const ANCHOS_A_MANO: Record<string, number> = {
  "src/app/panel/agenda/[id]/page.tsx": 1,
  "src/app/panel/clientes/[id]/page.tsx": 1,
  "src/app/panel/configuracion/mensajes/page.tsx": 1,
  "src/app/panel/configuracion/negocio/page.tsx": 1,
  "src/app/panel/configuracion/parametros/page.tsx": 1,
  "src/app/panel/configuracion/taller/page.tsx": 1,
  "src/app/panel/cotizaciones/[id]/page.tsx": 1,
  "src/app/panel/error.tsx": 1,
  "src/app/panel/mantenimientos/page.tsx": 2,
  "src/app/panel/not-found.tsx": 1,
  "src/app/panel/ordenes/[id]/page.tsx": 2,
  "src/app/panel/page.tsx": 1,
  "src/app/panel/pagos/page.tsx": 1,
  "src/app/panel/sin-acceso/page.tsx": 1,
  "src/app/panel/sitio/preguntas/page.tsx": 1,
  "src/app/panel/sitio/servicios/[id]/page.tsx": 1,
  "src/app/panel/sitio/servicios/page.tsx": 1,
  "src/app/panel/sitio/textos/page.tsx": 1,
  // El formulario público de reclamos: es del sitio, no del panel. Se queda, con este motivo
  "src/modulos/reclamos/componentes/formulario-reclamo.tsx": 2,
  "src/modulos/sitio/componentes/galeria-panel.tsx": 1,
};

/** Modales armados a mano. Pasan a `ModalFormulario` en la fase 3. */
const MODALES_A_MANO: Record<string, number> = {
  "src/modulos/catalogo/componentes/formulario-precios.tsx": 3,
  "src/modulos/usuarios/componentes/acceso-usuario.tsx": 3,
};

/** Títulos de sección armados a mano. Pasan a `Seccion` o `SeccionConEditar` en las fases 3 y 4. */
const TITULOS_A_MANO: Record<string, number> = {
  "src/app/panel/agenda/[id]/page.tsx": 1,
  "src/app/panel/agenda/page.tsx": 2,
  "src/app/panel/catalogo/[id]/page.tsx": 1,
  "src/app/panel/clientes/[id]/page.tsx": 2,
  "src/app/panel/mantenimientos/page.tsx": 1,
  "src/app/panel/ordenes/[id]/page.tsx": 2,
  "src/app/panel/page.tsx": 1,
  "src/app/panel/reclamos/[id]/page.tsx": 4,
  "src/modulos/clientes/componentes/formulario-nuevo-cliente.tsx": 1,
  "src/modulos/inicio/componentes/para-atender.tsx": 1,
  "src/modulos/ordenes/componentes/avances-orden.tsx": 1,
  "src/modulos/ordenes/componentes/checklist-recepcion.tsx": 1,
  "src/modulos/ordenes/componentes/como-llego.tsx": 1,
  "src/modulos/ordenes/componentes/firma-entrega.tsx": 1,
  "src/modulos/ordenes/componentes/formulario-entrega.tsx": 1,
  "src/modulos/ordenes/componentes/formulario-publicar.tsx": 1,
  "src/modulos/pagos/componentes/montos-trabajo.tsx": 1,
  "src/modulos/sitio/componentes/galeria-panel.tsx": 1,
  "src/modulos/usuarios/componentes/acceso-usuario.tsx": 3,
};

// Si una falla: con algo de más, usa la pieza común; con algo de menos, ya se migró y se baja de su lista.
describe("estructura del panel (C6)", () => {
  it("toda página dice su tipo con PaginaPanel", () => {
    const sinUsarla = [...codigo].filter(([a, lineas]) => a.endsWith("/page.tsx") && !lineas.some((l) => l.includes("<PaginaPanel"))).map(([a]) => a);
    expect(sinUsarla).toEqual(SIN_PAGINA_PANEL);
  });

  it("el ancho de una pantalla lo pone PaginaPanel", () => {
    expect(apariciones(/\bmax-w-(prose|[2-7]xl)\b/)).toEqual(ANCHOS_A_MANO);
  });

  it("un modal se arma con ModalFormulario", () => {
    expect(apariciones(/\b(Dialog|Sheet)Content\b/)).toEqual(MODALES_A_MANO);
  });

  it("un título de sección lo pone Seccion o SeccionConEditar", () => {
    expect(apariciones(/\btt-titulo-seccion\b/)).toEqual(TITULOS_A_MANO);
  });
});
