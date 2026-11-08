import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// C6 (docs/06-diseno/sistema-del-panel.md): las reglas de estructura del panel, revisadas en el código. Las listas de abajo
// son lo que todavía no se pasó a las piezas comunes y solo se achican: migrar una pantalla es quitarla de aquí, y una
// pantalla nueva no entra. Lo que quede al terminar C6 tiene que tener su motivo escrito. `src/componentes/` no se revisa:
// ahí viven las piezas comunes.

const RAICES = ["src/app/panel", "src/modulos"];

const archivos = RAICES.flatMap((raiz) =>
  readdirSync(raiz, { recursive: true, encoding: "utf8" })
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => join(raiz, f).replaceAll("\\", "/")),
);
const lineas = (archivo: string) => readFileSync(archivo, "utf8").split(/\r?\n/);
const cumplen = (archivo: string, prueba: (linea: string) => boolean) => lineas(archivo).some(prueba);
const quienes = (candidatos: string[], prueba: (linea: string) => boolean) => candidatos.filter((a) => cumplen(a, prueba)).sort();

const paginas = archivos.filter((a) => a.startsWith("src/app/panel/") && a.endsWith("/page.tsx"));

/** Páginas que escriben su ancho a mano. Se van en la fase 3 (y las de la fase 4, una por una). */
const CON_ANCHO_A_MANO = [
  "src/app/panel/agenda/[id]/page.tsx",
  "src/app/panel/agenda/nueva/page.tsx",
  "src/app/panel/catalogo/page.tsx",
  "src/app/panel/clientes/[id]/page.tsx",
  "src/app/panel/clientes/[id]/vehiculos/[vehiculo]/dueno/page.tsx",
  "src/app/panel/configuracion/mensajes/page.tsx",
  "src/app/panel/configuracion/negocio/page.tsx",
  "src/app/panel/configuracion/parametros/page.tsx",
  "src/app/panel/configuracion/taller/page.tsx",
  "src/app/panel/cotizaciones/[id]/page.tsx",
  "src/app/panel/cotizaciones/nueva/page.tsx",
  "src/app/panel/mantenimientos/page.tsx",
  "src/app/panel/ordenes/[id]/entregar/page.tsx",
  "src/app/panel/ordenes/[id]/page.tsx",
  "src/app/panel/ordenes/[id]/publicar/page.tsx",
  "src/app/panel/ordenes/[id]/recibir/page.tsx",
  "src/app/panel/page.tsx",
  "src/app/panel/pagos/page.tsx",
  "src/app/panel/reclamos/page.tsx",
  "src/app/panel/sin-acceso/page.tsx",
  "src/app/panel/sitio/preguntas/page.tsx",
  "src/app/panel/sitio/servicios/[id]/page.tsx",
  "src/app/panel/sitio/servicios/page.tsx",
  "src/app/panel/sitio/textos/page.tsx",
  "src/app/panel/usuarios/page.tsx",
];

/** Modales armados a mano. Pasan a `ModalFormulario` en la fase 3. */
const CON_MODAL_A_MANO = ["src/modulos/catalogo/componentes/formulario-precios.tsx", "src/modulos/usuarios/componentes/acceso-usuario.tsx"];

/** Títulos de sección armados a mano. Pasan a `Seccion` o `SeccionConEditar` en las fases 3 y 4. */
const CON_TITULO_A_MANO = [
  "src/app/panel/agenda/[id]/page.tsx",
  "src/app/panel/agenda/page.tsx",
  "src/app/panel/catalogo/[id]/page.tsx",
  "src/app/panel/clientes/[id]/page.tsx",
  "src/app/panel/mantenimientos/page.tsx",
  "src/app/panel/ordenes/[id]/page.tsx",
  "src/app/panel/page.tsx",
  "src/app/panel/reclamos/[id]/page.tsx",
  "src/modulos/clientes/componentes/formulario-nuevo-cliente.tsx",
  "src/modulos/inicio/componentes/para-atender.tsx",
  "src/modulos/ordenes/componentes/avances-orden.tsx",
  "src/modulos/ordenes/componentes/checklist-recepcion.tsx",
  "src/modulos/ordenes/componentes/como-llego.tsx",
  "src/modulos/ordenes/componentes/firma-entrega.tsx",
  "src/modulos/ordenes/componentes/formulario-entrega.tsx",
  "src/modulos/ordenes/componentes/formulario-publicar.tsx",
  "src/modulos/pagos/componentes/montos-trabajo.tsx",
  "src/modulos/sitio/componentes/galeria-panel.tsx",
  "src/modulos/usuarios/componentes/acceso-usuario.tsx",
];

const ordenada = (lista: string[]) => [...lista].sort();

// Si una falla: con un archivo de más, usa la pieza común; con uno de menos, ya se migró y se quita de su lista.
describe("estructura del panel (C6)", () => {
  it("una página toma su ancho de PaginaPanel", () => {
    // El hueco del buscador mientras carga tiene el ancho del buscador, no el de la página
    const escribeAncho = (linea: string) => /\bmax-w-/.test(linea) && !linea.includes("fallback=");
    expect(quienes(paginas, escribeAncho)).toEqual(ordenada(CON_ANCHO_A_MANO));
  });

  it("un modal se arma con ModalFormulario", () => {
    expect(quienes(archivos, (linea) => /\bDialogContent\b/.test(linea))).toEqual(ordenada(CON_MODAL_A_MANO));
  });

  it("un título de sección lo pone Seccion o SeccionConEditar", () => {
    expect(quienes(archivos, (linea) => linea.includes("tt-titulo-seccion"))).toEqual(ordenada(CON_TITULO_A_MANO));
  });
});
