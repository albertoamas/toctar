import { expect, test, type TestInfo } from "@playwright/test";
import { consultar, crearClienteEnBase, ingresarComoDueno } from "./apoyo";

// Las listas largas del panel, de a páginas (17/11): src/lib/paginacion.ts y src/componentes/panel/paginacion.tsx.
// 30 clientes propios de cada proyecto (celular o escritorio), buscados por su nombre: 25 en la primera página y 5 en la
// segunda. Se crean una vez: un reintento usa los mismos.

const CANTIDAD = 30;
const prefijo = (info: TestInfo) => `Paginado ${info.project.name === "celular" ? "C" : "E"}`;

async function crearClientes(info: TestInfo) {
  const nombre = prefijo(info);
  const [{ n }] = await consultar<{ n: string }>("select count(*) as n from cliente where nombre like $1", [`${nombre} %`]);
  for (let i = Number(n) + 1; i <= CANTIDAD; i++) {
    const numero = String(i).padStart(3, "0");
    await crearClienteEnBase({ nombre: `${nombre} ${numero}`, telefono: `591760${info.project.name === "celular" ? 1 : 2}0${numero}` });
  }
}

test("Clientes de a páginas: Siguiente y Anterior, Atrás vuelve a la misma, y buscar vuelve a la primera", async ({ page }, info) => {
  await crearClientes(info);
  const nombre = prefijo(info);
  await ingresarComoDueno(page);
  await page.goto(`/panel/clientes?q=${encodeURIComponent(nombre)}`);
  const paginas = page.getByRole("navigation", { name: "Páginas" });
  const filas = page.getByRole("link", { name: new RegExp(`^${nombre} \\d{3}`) });

  // Primera página: 25, y "Anterior" apagado
  await expect(paginas).toContainText("1 a 25 de 30 clientes");
  await expect(paginas).toContainText("Página 1 de 2");
  await expect(filas).toHaveCount(25);
  await expect(paginas.getByRole("link", { name: "Anterior" })).toHaveCount(0);

  // Siguiente: las 5 que faltan, con la búsqueda en la dirección
  await paginas.getByRole("link", { name: "Siguiente" }).click();
  await expect(paginas).toContainText("26 a 30 de 30 clientes");
  await expect(page).toHaveURL(/pagina=2/);
  await expect(page).toHaveURL(/q=Paginado/);
  await expect(filas).toHaveCount(5);
  await expect(paginas.getByRole("link", { name: "Siguiente" })).toHaveCount(0);

  // Abrir una ficha y volver con Atrás: la misma página
  await filas.first().click();
  await expect(page).toHaveURL(/\/panel\/clientes\/\d+/);
  await page.goBack();
  await expect(paginas).toContainText("Página 2 de 2");

  // Una página después de la última muestra la última
  await page.goto(`/panel/clientes?q=${encodeURIComponent(nombre)}&pagina=99`);
  await expect(paginas).toContainText("Página 2 de 2");

  // Buscar otra cosa vuelve a la primera página
  await page.getByRole("searchbox", { name: "Buscar por nombre, teléfono o placa" }).fill(`${nombre} 00`);
  await expect(page).not.toHaveURL(/pagina=/);
  await expect(filas).toHaveCount(9);
  await expect(paginas).toHaveCount(0);
});
