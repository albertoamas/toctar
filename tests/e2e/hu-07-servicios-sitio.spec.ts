import { expect, test, type TestInfo } from "@playwright/test";
import { crearUsuario, ingresar, ingresarComoDueno, PNG } from "./apoyo";

// HU-07 Servicios del sitio. Criterios: docs/09-pruebas/criterios-entrega-1.md (7.1 a 7.6).

const sufijo = (info: TestInfo) => (info.project.name === "celular" ? "c" : "e");
const soloEscritorio = (info: TestInfo) => test.skip(info.project.name !== "escritorio", "Cambia servicios compartidos");

test("el dueño crea un servicio con beneficios, pasos y variantes, y lo oculta", async ({ page }, info) => {
  test.setTimeout(60_000); // recorre todo el formulario y recarga
  const nombre = `Encerado de prueba ${sufijo(info)}`;
  await ingresarComoDueno(page);
  if (info.project.name === "celular") await page.getByRole("button", { name: "Abrir menú" }).click();
  await page.getByRole("navigation", { name: "Panel" }).getByRole("link", { name: "Sitio web" }).click();
  // Los servicios iniciales (datos de la migración)
  await expect(page.getByRole("list", { name: "Servicios del sitio" })).toContainText("Pulido y nano cerámico");

  await page.getByRole("link", { name: "Agregar servicio" }).click();
  // Un nombre repetido se rechaza sin importar mayúsculas
  await page.getByLabel("Nombre del servicio").fill("pulido y nano CERÁMICO");
  await page.getByLabel("Resumen").fill("Resumen de prueba.");
  await page.getByRole("button", { name: "Crear servicio" }).click();
  await expect(page.getByText("Ya existe un servicio con ese nombre.")).toBeVisible();

  await page.getByLabel("Nombre del servicio").fill(nombre);
  await page.getByLabel("Resumen").fill("Encerado a mano que protege la pintura.");
  await page.getByRole("button", { name: "Crear servicio" }).click();
  await expect(page.getByText("Servicio creado.")).toBeVisible();
  // La pantalla de alta queda oculta en la página: su campo no debe confundirse con el de la edición
  await expect(page.getByRole("textbox", { name: "Nombre del servicio", exact: true })).toHaveValue(nombre);
  await expect(page.getByLabel("Dirección de la página")).toHaveValue(`encerado-de-prueba-${sufijo(info)}`);
  // D-2: nace con la variante "Única"
  await expect(page.getByRole("list", { name: "Variantes activos" })).toContainText("Única");

  await page.getByLabel("Descripción", { exact: true }).fill("Aplicamos cera a mano, panel por panel.");
  await page.getByRole("button", { name: "Agregar beneficio" }).click();
  await page.getByLabel("Beneficio 1", { exact: true }).fill("Brillo profundo");
  await page.getByRole("button", { name: "Agregar beneficio" }).click();
  await page.getByLabel("Beneficio 2", { exact: true }).fill("Repele el agua");
  await page.getByRole("button", { name: "Agregar paso" }).click();
  await page.getByLabel("Paso 1, título", { exact: true }).fill("Lavado técnico");
  await page.getByRole("checkbox", { name: /Mostrar en el sitio/ }).uncheck();
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Cambios guardados.")).toBeVisible();

  // Variante nueva; renombrar la "Única"
  await page.getByRole("button", { name: "Agregar variante" }).click();
  await page.getByLabel("Nombre del variante").fill("Premium");
  await page.getByRole("button", { name: "Agregar", exact: true }).click();
  await expect(page.getByText("Variante Premium agregada.")).toBeVisible();
  await page.getByRole("button", { name: "Editar Única" }).click();
  await page.getByLabel("Nombre del variante").fill("Básico");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByRole("list", { name: "Variantes activos" }).getByRole("listitem")).toHaveText([/Básico/, /Premium/]);

  // Todo quedó guardado
  await page.reload();
  await expect(page.getByLabel("Beneficio 2", { exact: true })).toHaveValue("Repele el agua");
  await expect(page.getByLabel("Paso 1, título", { exact: true })).toHaveValue("Lavado técnico");
  await expect(page.getByRole("checkbox", { name: /Mostrar en el sitio/ })).not.toBeChecked();
  await page.getByRole("link", { name: "Servicios" }).first().click();
  await expect(page.getByRole("listitem").filter({ hasText: nombre })).toContainText("Oculto");
});

test("una dirección repetida da error junto al campo", async ({ page }, info) => {
  soloEscritorio(info);
  await ingresarComoDueno(page);
  await page.goto("/panel/sitio");
  await page.getByRole("link", { name: /Pulido de vidrios/ }).click();
  await page.getByLabel("Dirección de la página").fill("pulido-y-nano-ceramico");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Ya hay otra página con esa dirección.")).toBeVisible();
  await page.getByLabel("Dirección de la página").fill("Pulido Vidrios");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("La dirección solo lleva minúsculas, números y guiones.")).toBeVisible();
});

test("la foto principal se sube y se ve; un archivo que no es imagen se rechaza", async ({ page }, info) => {
  soloEscritorio(info);
  await ingresarComoDueno(page);
  await page.goto("/panel/sitio");
  await page.getByRole("link", { name: /Polarizado de vidrios/ }).click();
  await expect(page.getByRole("button", { name: "Subir foto" })).toBeEnabled();

  await page.getByLabel("Archivo de la foto").setInputFiles({ name: "falsa.jpg", mimeType: "image/jpeg", buffer: Buffer.from("no soy una foto") });
  await expect(page.getByText("La foto debe ser JPG, PNG o WebP de hasta 5 MB.")).toBeVisible();

  await page.getByLabel("Archivo de la foto").setInputFiles({ name: "polarizado.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByText("Foto guardada.")).toBeVisible();
  const foto = page.getByRole("img", { name: "Polarizado de vidrios" });
  await expect(foto).toHaveAttribute("src", /servicios\/[\w-]+-640\.webp$/);
  const respuesta = await page.request.get((await foto.getAttribute("src"))!);
  expect(respuesta.headers()["content-type"]).toBe("image/webp");

  await page.getByRole("button", { name: "Quitar foto" }).click();
  await expect(page.getByText("Sin foto: el sitio muestra la imagen de reemplazo de TocTar.")).toBeVisible();
});

test("el encargado con el permiso Sitio web entra; sin el permiso o como técnico, no", async ({ page }, info) => {
  const casos = [
    { usuario: `enc-sitio-${sufijo(info)}`, rol: "encargado" as const, permisos: ["sitio"], entra: true },
    { usuario: `enc-sin-sitio-${sufijo(info)}`, rol: "encargado" as const, permisos: [], entra: false },
    { usuario: `tec-sitio-${sufijo(info)}`, rol: "tecnico" as const, permisos: [], entra: false },
  ];
  for (const c of casos) {
    await crearUsuario({ usuario: c.usuario, nombre: c.usuario, contrasena: "clave-sitio-1", rol: c.rol, permisos: c.permisos });
    await page.context().clearCookies();
    await ingresar(page, c.usuario, "clave-sitio-1");
    await expect(page).toHaveURL(/\/panel$/);
    await page.goto("/panel/sitio");
    if (c.entra) await expect(page.getByRole("heading", { name: "Sitio web" })).toBeVisible();
    else await expect(page).toHaveURL(/\/panel\/sin-acceso$/);
  }
});
