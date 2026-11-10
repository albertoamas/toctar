import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// C6 (docs/06-diseno/sistema-del-panel.md): las reglas de estructura del panel, revisadas en el código. Las listas de abajo
// son lo que se aparta de las piezas comunes, con cuántas veces aparece en cada archivo y su motivo escrito (C6 terminó el
// 08/11). Lo nuevo no entra: una pantalla nueva usa las piezas comunes. `src/componentes/` no se revisa: ahí viven ellas.

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

/** Páginas sin `PaginaPanel`, con su motivo. */
const SIN_PAGINA_PANEL = [
  // No dibuja nada: solo verifica la sesión y responde "no encontrado" (not-found.tsx sí usa PaginaPanel)
  "src/app/panel/[...resto]/page.tsx",
];

/** Anchos de pantalla escritos a mano, con su motivo. Los de un campo o un bloque chico (`max-w-xs`, `max-w-md`) sí valen (§1). */
const ANCHOS_A_MANO: Record<string, number> = {
  // Los accesos de la portada, en dos columnas que no se estiran: cada portada acomoda lo suyo (§1)
  "src/app/panel/page.tsx": 1,
  // El formulario público de reclamos: es del sitio, no del panel. Se queda, con este motivo
  "src/modulos/reclamos/componentes/formulario-reclamo.tsx": 2,
  // "Subir fotos": un bloque dentro de la ficha (§1); más ancho, las fotos elegidas tapan el resto del formulario
  "src/modulos/sitio/componentes/galeria-panel.tsx": 1,
};

/** Modales armados a mano: ninguno. Todo modal es `ModalFormulario` (C6, terminado el 08/11). */
const MODALES_A_MANO: Record<string, number> = {};

/** Títulos de sección armados a mano, cada uno con su motivo: no son la cabecera de una sección de ficha. */
const TITULOS_A_MANO: Record<string, number> = {
  // La semana del tablero: no es un título de sección, solo usa su letra
  "src/app/panel/agenda/page.tsx": 1,
  // La leyenda de un grupo de campos
  "src/modulos/clientes/componentes/formulario-nuevo-cliente.tsx": 1,
  // La leyenda de un grupo de fotos
  "src/modulos/ordenes/componentes/formulario-publicar.tsx": 1,
  // "Subir fotos": la cabecera dentro de su tarjeta, con su ayuda y el botón de cerrar
  "src/modulos/sitio/componentes/galeria-panel.tsx": 1,
};

// Si una falla: con algo de más, usa la pieza común (o escribe aquí su motivo); con algo de menos, se baja de su lista.
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
