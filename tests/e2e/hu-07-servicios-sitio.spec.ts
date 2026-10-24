import { expect, test, type TestInfo } from "@playwright/test";
import { crearUsuario, ingresar, ingresarComoDueno, PNG } from "./apoyo";

// HU-07 Servicios del sitio. Criterios: docs/09-pruebas/criterios-entrega-1.md (7.1 a 7.6). Desde la reorganización del
// panel (C5 §0), el servicio se crea y se nombra en el catálogo; aquí se edita su página.

const sufijo = (info: TestInfo) => (info.project.name === "celular" ? "c" : "e");
const soloEscritorio = (info: TestInfo) => test.skip(info.project.name !== "escritorio", "Cambia servicios compartidos");

test("el dueño crea el servicio en el catálogo y completa su página: beneficios, pasos y si se muestra", async ({ page }, info) => {
  test.setTimeout(60_000); // recorre todo el formulario y recarga
  const nombre = `Encerado de prueba ${sufijo(info)}`;
  await ingresarComoDueno(page);
  if (info.project.name === "celular") await page.getByRole("button", { name: "Abrir menú" }).click();
  await page.getByRole("navigation", { name: "Panel" }).getByRole("link", { name: "Sitio web" }).click();
  // Los servicios iniciales (datos de la migración); el alta es del catálogo
  await expect(page.getByRole("list", { name: "Servicios del sitio" })).toContainText("Pulido y nano cerámico");
  await expect(page.getByRole("link", { name: "Agregar servicio" })).toHaveCount(0);

  await page.goto("/panel/catalogo/nuevo");
  // Un nombre repetido se rechaza sin importar mayúsculas
  await page.getByLabel("Nombre del servicio").fill("pulido y nano CERÁMICO");
  await page.getByRole("button", { name: "Crear servicio" }).click();
  await expect(page.getByText("Ya existe un servicio con ese nombre.")).toBeVisible();
  await page.getByLabel("Nombre del servicio").fill(nombre);
  await page.getByRole("button", { name: "Crear servicio" }).click();
  await expect(page.getByText("Servicio creado.")).toBeVisible();
  // Nace oculto en el sitio, hasta que se complete su página
  await expect(page.getByText("Oculto en el sitio.")).toBeVisible();
  await page.getByRole("link", { name: "Editar su página en el sitio" }).click();
  await expect(page).toHaveURL(/\/panel\/sitio\/servicios\/\d+$/);
  await expect(page.getByLabel("Dirección de la página")).toHaveValue(`encerado-de-prueba-${sufijo(info)}`);
  // El nombre no se cambia aquí: es del catálogo
  await expect(page.getByRole("textbox", { name: "Nombre del servicio" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Abrir en el catálogo" })).toBeVisible();

  // Sin resumen no se muestra en el sitio
  await page.getByRole("checkbox", { name: /Mostrar en el sitio/ }).check();
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Escribe un resumen de una o dos frases.")).toBeVisible();

  await page.getByLabel("Resumen").fill("Encerado a mano que protege la pintura.");
  await page.getByLabel("Descripción", { exact: true }).fill("Aplicamos cera a mano, panel por panel.");
  await page.getByRole("button", { name: "Agregar beneficio" }).click();
  await page.getByLabel("Beneficio 1", { exact: true }).fill("Brillo profundo");
  await page.getByRole("button", { name: "Agregar beneficio" }).click();
  await page.getByLabel("Beneficio 2", { exact: true }).fill("Repele el agua");
  await page.getByRole("button", { name: "Agregar paso" }).click();
  await page.getByLabel("Paso 1, título", { exact: true }).fill("Lavado técnico");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Cambios guardados.")).toBeVisible();

  // Todo quedó guardado; después se oculta sin borrarlo
  await page.reload();
  await expect(page.getByLabel("Beneficio 2", { exact: true })).toHaveValue("Repele el agua");
  await expect(page.getByLabel("Paso 1, título", { exact: true })).toHaveValue("Lavado técnico");
  await expect(page.getByRole("checkbox", { name: /Mostrar en el sitio/ })).toBeChecked();
  await page.getByRole("checkbox", { name: /Mostrar en el sitio/ }).uncheck();
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Cambios guardados.")).toBeVisible();
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
    if (c.entra) {
      await expect(page.getByRole("heading", { name: "Sitio web" })).toBeVisible();
      // Edita la página, pero el servicio (alta, nombre, precios) es del dueño
      await page.getByRole("list", { name: "Servicios del sitio" }).getByRole("link").first().click();
      await expect(page.getByLabel("Dirección de la página")).toBeVisible();
      await expect(page.getByRole("link", { name: "Abrir en el catálogo" })).toHaveCount(0);
      await page.goto("/panel/catalogo/nuevo");
      await expect(page).toHaveURL(/\/panel\/sin-acceso$/);
    } else await expect(page).toHaveURL(/\/panel\/sin-acceso$/);
  }
});
