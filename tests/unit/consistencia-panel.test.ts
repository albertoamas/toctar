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
  "src/app/panel/reclamos/[id]/page.tsx",
  "src/app/panel/sin-acceso/page.tsx",
  "src/app/panel/usuarios/[id]/page.tsx",
];

/** Anchos de pantalla escritos a mano. Los de un campo o un bloque chico (`max-w-xs`, `max-w-md`) sí valen (§1). */
const ANCHOS_A_MANO: Record<string, number> = {
  "src/app/panel/error.tsx": 1,
  "src/app/panel/not-found.tsx": 1,
  "src/app/panel/page.tsx": 1,
  "src/app/panel/sin-acceso/page.tsx": 1,
  // El formulario público de reclamos: es del sitio, no del panel. Se queda, con este motivo
  "src/modulos/reclamos/componentes/formulario-reclamo.tsx": 2,
  // "Subir fotos": un bloque dentro de la ficha (§1); más ancho, las fotos elegidas tapan el resto del formulario
  "src/modulos/sitio/componentes/galeria-panel.tsx": 1,
};

/** Modales armados a mano. Pasan a `ModalFormulario` en la fase 3. */
const MODALES_A_MANO: Record<string, number> = {
  "src/modulos/usuarios/componentes/acceso-usuario.tsx": 3,
};

/** Títulos de sección armados a mano. Pasan a `Seccion` o `SeccionConEditar` en las fases 3 y 4. */
const TITULOS_A_MANO: Record<string, number> = {
  // La semana del tablero: no es un título de sección, solo usa su letra
  "src/app/panel/agenda/page.tsx": 1,
  "src/app/panel/reclamos/[id]/page.tsx": 4,
  // La leyenda de un grupo de campos
  "src/modulos/clientes/componentes/formulario-nuevo-cliente.tsx": 1,
  // La cabecera dentro de su tarjeta, en la portada
  "src/modulos/inicio/componentes/para-atender.tsx": 1,
  // La leyenda de un grupo de fotos
  "src/modulos/ordenes/componentes/formulario-publicar.tsx": 1,
  // "Subir fotos": la cabecera dentro de su tarjeta, con su ayuda y el botón de cerrar
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

  it("un título de sección lo pone Seccion, SeccionConEditar o CabeceraSeccion", () => {
    expect(apariciones(/\btt-titulo-seccion\b/)).toEqual(TITULOS_A_MANO);
  });
});
