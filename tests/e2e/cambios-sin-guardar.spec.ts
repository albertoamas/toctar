import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { ingresarComoDueno } from "./apoyo";

// Pulido 13.15: el botón de guardar queda fijo abajo cuando hay algo que guardar, y salir con cambios pregunta. En Crear
// usuario, el formulario largo que la tiene: Negocio, Parámetros (pulidos 13.26 y 13.29) y la ficha del usuario (C6) ya
// se editan por partes, en modales.

const sufijo = (info: TestInfo) => `${info.project.name.slice(0, 3)}${info.retry}`;

const hidratada = async (page: Page) => {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(300);
};

const NUEVO = "/panel/usuarios/nuevo";
const nombreDe = (page: Page) => page.getByLabel("Nombre", { exact: true });

test("con cambios el botón queda fijo abajo, y vuelve a su lugar al dejar todo como estaba", async ({ page }) => {
  await ingresarComoDueno(page);
  await page.goto(NUEVO);
  const guardar = page.getByRole("button", { name: "Crear usuario" });
  await expect(nombreDe(page)).toBeVisible();
  await hidratada(page);
  await expect(page.locator("[data-pie-fijo]")).toHaveCount(0);

  await nombreDe(page).fill("A medio escribir");
  // Fijo abajo: se ve aunque la pantalla esté arriba
  await expect(page.locator("[data-pie-fijo]")).toBeVisible();
  const barra = (await guardar.boundingBox())!;
  expect(barra.y + barra.height).toBeLessThanOrEqual(page.viewportSize()!.height);

  await nombreDe(page).fill("");
  await expect(page.locator("[data-pie-fijo]")).toHaveCount(0);
});

test("salir con cambios pregunta: se puede seguir editando o salir", async ({ page }) => {
  await ingresarComoDueno(page);
  await page.goto(NUEVO);
  await expect(nombreDe(page)).toBeVisible();
  await hidratada(page);
  await nombreDe(page).fill("A medio escribir");
  await expect(page.locator("[data-pie-fijo]")).toBeVisible();

  // "Volver": se ve en los dos tamaños
  const salir = page.locator('main a[href="/panel/usuarios"]').first();
  await salir.click();
  const pregunta = page.getByRole("dialog", { name: "¿Salir sin guardar?" });
  await expect(pregunta).toBeVisible();
  // Con el foco en la opción que no pierde nada
  await expect(pregunta.getByRole("button", { name: "Seguir editando" })).toBeFocused();
  await pregunta.getByRole("button", { name: "Seguir editando" }).click();
  await expect(pregunta).toHaveCount(0);
  await expect(page).toHaveURL(/\/panel\/usuarios\/nuevo$/);
  await expect(nombreDe(page)).toHaveValue("A medio escribir");

  await salir.click();
  await pregunta.getByRole("button", { name: "Salir sin guardar" }).click();
  await expect(page).toHaveURL(/\/panel\/usuarios$/);
});

test("lo escrito antes de que la página termine de cargar también cuenta", async ({ page }) => {
  await ingresarComoDueno(page);
  // JavaScript lento, como un celular con mala señal: el formulario se ve antes de hidratar
  await page.route("**/_next/static/chunks/**", async (ruta) => {
    await new Promise((listo) => setTimeout(listo, 1500));
    await ruta.continue();
  });
  await page.goto(NUEVO, { waitUntil: "commit" });
  await nombreDe(page).waitFor({ state: "visible" });
  await nombreDe(page).fill("Escrito rápido");
  await hidratada(page);
  await expect(nombreDe(page)).toHaveValue("Escrito rápido");
  await expect(page.locator("[data-pie-fijo]")).toBeVisible();
});

test("en el menú del celular, salir con cambios pregunta y el menú se cierra", async ({ page }, info) => {
  test.skip(info.project.name !== "celular", "El menú desplegable es del celular");
  await ingresarComoDueno(page);
  await page.goto(NUEVO);
  await expect(nombreDe(page)).toBeVisible();
  await hidratada(page);
  await nombreDe(page).fill("A medio escribir");
  await expect(page.locator("[data-pie-fijo]")).toBeVisible();
  await page.getByRole("button", { name: /Abrir menú/ }).click();
  await page.getByRole("dialog", { name: "Menú" }).getByRole("link", { name: "Agenda" }).click();
  const pregunta = page.getByRole("dialog", { name: "¿Salir sin guardar?" });
  await expect(pregunta).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Menú" })).toHaveCount(0);
  await pregunta.getByRole("button", { name: "Salir sin guardar" }).click();
  await expect(page).toHaveURL(/\/panel\/agenda$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("cerrar sesión con cambios también pregunta", async ({ page }, info) => {
  test.skip(info.project.name !== "escritorio", "Se ve a la vista en la computadora");
  await ingresarComoDueno(page);
  await page.goto(NUEVO);
  await expect(nombreDe(page)).toBeVisible();
  await hidratada(page);
  await nombreDe(page).fill("A medio escribir");
  await expect(page.locator("[data-pie-fijo]")).toBeVisible();
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  const pregunta = page.getByRole("dialog", { name: "¿Salir sin guardar?" });
  await expect(pregunta).toBeVisible();
  await pregunta.getByRole("button", { name: "Seguir editando" }).click();
  await expect(page).toHaveURL(/\/panel\/usuarios\/nuevo$/);
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await pregunta.getByRole("button", { name: "Salir sin guardar" }).click();
  await expect(page).toHaveURL(/\/ingresar/);
});

test("crear no pregunta al salir: lleva a la lista con su aviso", async ({ page }, info) => {
  const usuario = `barra-${sufijo(info)}-${Math.floor(Math.random() * 1e6)}`.toLowerCase();
  await ingresarComoDueno(page);
  await page.goto(NUEVO);
  await expect(nombreDe(page)).toBeVisible();
  await hidratada(page);
  await nombreDe(page).fill(`Barra ${usuario}`);
  await page.getByLabel("Usuario", { exact: true }).fill(usuario);
  await page.getByLabel("Contraseña inicial").fill("encargado-123");
  await page.getByRole("button", { name: "Crear usuario" }).click();
  await expect(page).toHaveURL(/\/panel\/usuarios\?creado=/);
  await expect(page.getByRole("dialog", { name: "¿Salir sin guardar?" })).toHaveCount(0);
});

test("crear un usuario sigue activo vacío: tocarlo muestra qué falta", async ({ page }) => {
  await ingresarComoDueno(page);
  await page.goto("/panel/usuarios/nuevo");
  await hidratada(page);
  const crear = page.getByRole("button", { name: "Crear usuario" });
  await expect(crear).toBeEnabled();
  await crear.click();
  await expect(page.locator('[aria-invalid="true"]').first()).toBeVisible();
});

test("un flujo también pregunta: nuevo cliente, con su botón de siempre", async ({ page }) => {
  await ingresarComoDueno(page);
  await page.goto("/panel/clientes/nuevo");
  await expect(page.getByRole("button", { name: "Crear cliente" })).toBeEnabled();
  await hidratada(page);
  await page.getByLabel("Nombre", { exact: true }).fill("A medio escribir");
  await page.locator('main a[href="/panel/clientes"]').first().click();
  const pregunta = page.getByRole("dialog", { name: "¿Salir sin guardar?" });
  await expect(pregunta).toBeVisible();
  await pregunta.getByRole("button", { name: "Salir sin guardar" }).click();
  await expect(page).toHaveURL(/\/panel\/clientes$/);
});
