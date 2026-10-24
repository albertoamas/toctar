import { expect, test, type TestInfo } from "@playwright/test";
import { ingresarComoDueno, PNG } from "./apoyo";

// HU-08 Textos del sitio. Criterios: docs/09-pruebas/criterios-entrega-1.md (8.1 a 8.5).
// Los textos y las preguntas son compartidos: las pruebas que guardan corren solo en escritorio.

const soloEscritorio = (info: TestInfo) => test.skip(info.project.name !== "escritorio", "Cambia textos compartidos");

test("un texto vacío da error junto al campo y no se guarda", async ({ page }) => {
  await ingresarComoDueno(page);
  await page.goto("/panel/sitio");
  await page.getByRole("navigation", { name: "Secciones del sitio web" }).getByRole("link", { name: "Textos" }).click();

  const portada = page.getByRole("form", { name: "Portada" });
  await portada.getByLabel("Lema").fill("");
  await portada.getByRole("button", { name: "Guardar portada" }).click();
  await expect(portada.getByText("Escribe el lema.")).toBeVisible();

  await page.reload();
  await expect(page.getByRole("form", { name: "Portada" }).getByLabel("Lema")).toHaveValue("Como ven tu auto, te ven a ti");
});

test("el dueño edita la portada y los motivos de Nosotros, y quedan guardados", async ({ page }, info) => {
  soloEscritorio(info);
  await ingresarComoDueno(page);
  await page.goto("/panel/sitio/textos");

  const portada = page.getByRole("form", { name: "Portada" });
  await portada.getByLabel("Presentación").fill("Taller de detailing en Tarija. Texto de prueba.");
  await portada.getByRole("button", { name: "Guardar portada" }).click();
  await expect(page.getByText("Portada: cambios guardados.")).toBeVisible();

  const nosotros = page.getByRole("form", { name: "Nosotros" });
  await nosotros.getByRole("button", { name: "Agregar motivo" }).click();
  await nosotros.getByLabel("Motivo 5", { exact: true }).fill("Atención por WhatsApp");
  await nosotros.getByRole("button", { name: "Subir motivo 5" }).click();
  await nosotros.getByRole("button", { name: "Guardar nosotros" }).click();
  await expect(page.getByText("Nosotros: cambios guardados.")).toBeVisible();

  await page.reload();
  await expect(page.getByRole("form", { name: "Portada" }).getByLabel("Presentación")).toHaveValue("Taller de detailing en Tarija. Texto de prueba.");
  await expect(page.getByRole("form", { name: "Nosotros" }).getByLabel("Motivo 4", { exact: true })).toHaveValue("Atención por WhatsApp");
});

test("preguntas frecuentes: agregar, editar, ordenar, ocultar y eliminar", async ({ page }, info) => {
  soloEscritorio(info);
  await ingresarComoDueno(page);
  await page.goto("/panel/sitio/preguntas");
  const lista = page.getByRole("list", { name: "Preguntas frecuentes" });
  await expect(lista.getByRole("listitem")).toHaveCount(5);

  // Agregar: vacía da error
  await page.getByRole("button", { name: "Agregar pregunta" }).click();
  await page.getByRole("button", { name: "Agregar", exact: true }).click();
  await expect(page.getByText("Escribe la pregunta.")).toBeVisible();
  await page.getByLabel("Pregunta", { exact: true }).fill("¿Atienden los domingos?");
  await page.getByLabel("Respuesta").fill("No, de lunes a sábado.");
  await page.getByRole("button", { name: "Agregar", exact: true }).click();
  await expect(page.getByText("Pregunta agregada.")).toBeVisible();
  await expect(lista.getByRole("listitem")).toHaveCount(6);

  // Editar y subir
  await page.getByRole("button", { name: "Editar: ¿Atienden los domingos?" }).click();
  await page.getByLabel("Respuesta").fill("No. Atendemos de lunes a sábado.");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(lista).toContainText("No. Atendemos de lunes a sábado.");
  await page.getByRole("button", { name: "Subir: ¿Atienden los domingos?" }).click();
  await expect(lista.getByRole("listitem").nth(4)).toContainText("¿Atienden los domingos?");

  // Ocultar
  await page.getByRole("button", { name: "Ocultar: ¿Atienden los domingos?" }).click();
  await expect(lista.getByRole("listitem").nth(4)).toContainText("Oculta");

  // Eliminar, con confirmación
  await page.getByRole("button", { name: "Eliminar: ¿Atienden los domingos?" }).click();
  await page.getByRole("button", { name: "Eliminar pregunta" }).click();
  await expect(page.getByText("Pregunta eliminada.")).toBeVisible();
  await expect(lista.getByRole("listitem")).toHaveCount(5);
});

test("la foto del taller va detrás del lema de la portada; sin foto, al lado va el arte o el comparador", async ({ page }, info) => {
  soloEscritorio(info);
  await ingresarComoDueno(page);
  await page.goto("/panel/sitio/textos");
  const bloque = page.getByRole("region", { name: "Foto del taller" });
  await expect(bloque.getByText("Sin foto: detrás del lema queda el fondo negro.")).toBeVisible();
  await expect(bloque.getByRole("button", { name: "Subir foto" })).toBeEnabled();
  await bloque.getByLabel("Archivo de la foto").setInputFiles({ name: "taller.png", mimeType: "image/png", buffer: PNG });
  await expect(bloque.getByRole("img", { name: "Foto del taller" })).toHaveAttribute("src", /portada\/[\w-]+-640\.webp$/);

  // En el sitio: la foto detrás (decorativa) y el arte ya no
  await page.goto("/");
  const foto = page.locator(".tt-portada-foto img");
  await expect(foto).toHaveAttribute("src", /portada\/[\w-]+\.webp$/);
  await expect(foto).toHaveAttribute("alt", "");
  await expect(page.locator("main svg[viewBox='0 0 480 288']")).toHaveCount(0);

  await page.goto("/panel/sitio/textos");
  await bloque.getByRole("button", { name: "Quitar foto" }).click();
  await expect(bloque.getByText("Sin foto: detrás del lema queda el fondo negro.")).toBeVisible();
  await page.goto("/");
  await expect(page.locator(".tt-portada-foto")).toHaveCount(0);
  // Al lado del lema, el arte; o el comparador, si la galería tiene un trabajo con antes (pedido de la demo del 24/10).
  // Las otras pruebas dejan trabajos con antes en la base compartida: la regla exacta la prueban las unitarias de ladoDelLema
  const arte = page.locator("main svg[viewBox='0 0 480 288']");
  await expect(arte.or(page.getByRole("slider", { name: "Comparar antes y después" }))).toHaveCount(1);
});

// Pedido de YankoSoft del 24/10: la foto del equipo en Nosotros, al lado de la historia
test("la foto del equipo se sube en Textos y va al lado de la historia de Nosotros", async ({ page }, info) => {
  soloEscritorio(info);
  await ingresarComoDueno(page);
  await page.goto("/panel/sitio/textos");
  const bloque = page.getByRole("region", { name: "Foto del equipo" });
  await expect(bloque.getByText("Sin foto: la historia va sola.")).toBeVisible();
  await expect(bloque.getByRole("button", { name: "Subir foto" })).toBeEnabled();
  await bloque.getByLabel("Archivo de la foto").setInputFiles({ name: "equipo.png", mimeType: "image/png", buffer: PNG });
  await expect(bloque.getByRole("img", { name: "El equipo de TocTar" })).toHaveAttribute("src", /nosotros\/[\w-]+-640\.webp$/);

  await page.goto("/nosotros");
  await expect(page.getByRole("main").getByRole("img", { name: "El equipo de TocTar" })).toBeVisible();

  await page.goto("/panel/sitio/textos");
  await bloque.getByRole("button", { name: "Quitar foto" }).click();
  await expect(bloque.getByText("Sin foto: la historia va sola.")).toBeVisible();
  await page.goto("/nosotros");
  await expect(page.getByRole("main").getByRole("img", { name: "El equipo de TocTar" })).toHaveCount(0);
});
