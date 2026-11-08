import { expect, test, type TestInfo } from "@playwright/test";
import { abrirNuevoServicio, crearUsuario, ingresar, ingresarComoDueno, mostrarServicio, PERFIL_TALLER, PNG } from "./apoyo";

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
  // Desde la portada de Sitio web (pedido 26), a Servicios
  await page.getByRole("navigation", { name: "Partes del sitio web" }).getByRole("link", { name: /^Servicios/ }).click();
  // Los servicios iniciales (datos de la migración); el alta es del catálogo
  await expect(page.getByRole("list", { name: "Servicios del sitio" })).toContainText("Pulido y nano cerámico");
  await expect(page.getByRole("link", { name: "Agregar servicio" })).toHaveCount(0);

  const nuevo = await abrirNuevoServicio(page);
  // Un nombre repetido se rechaza sin importar mayúsculas
  await nuevo.getByLabel("Nombre del servicio").fill("pulido y nano CERÁMICO");
  await nuevo.getByRole("button", { name: "Crear servicio" }).click();
  await expect(nuevo.getByText("Ya existe un servicio con ese nombre.")).toBeVisible();
  await nuevo.getByLabel("Nombre del servicio").fill(nombre);
  await nuevo.getByRole("button", { name: "Crear servicio" }).click();
  await expect(page.getByText("Servicio creado.")).toBeVisible();
  // Nace oculto en el sitio, hasta que se complete su página
  await expect(page.getByText("Oculto en el sitio", { exact: true })).toBeVisible();
  // Recién creado se abre el modal de sus precios (es lo que falta cargar): se cierra para ir a su página
  await page.getByRole("dialog", { name: "Precios de Única" }).getByRole("button", { name: "Cancelar" }).click();
  await page.getByRole("link", { name: "Su página en el sitio" }).click();
  await expect(page).toHaveURL(/\/panel\/sitio\/servicios\/\d+$/);
  // El nombre no se cambia aquí: es del catálogo, a un toque desde "Más"
  await expect(page.getByRole("textbox", { name: "Nombre del servicio" })).toHaveCount(0);
  const mas = page.getByRole("button", { name: "Más" });
  await mas.click();
  await expect(page.getByRole("menuitem", { name: "Abrir en el catálogo" })).toBeVisible();
  // Sin resumen no se muestra en el sitio
  await page.getByRole("menuitem", { name: "Mostrar en el sitio" }).click();
  await expect(page.getByText("Escribe el resumen antes de mostrarlo en el sitio.")).toBeVisible();
  // La dirección sale del nombre; se cambia en su modal, desde "Más"
  await mas.click();
  await page.getByRole("menuitem", { name: "Cambiar dirección de la página" }).click();
  const direccion = page.getByRole("dialog", { name: "Dirección de la página" });
  await expect(direccion.getByLabel("Dirección de la página")).toHaveValue(`encerado-de-prueba-${sufijo(info)}`);
  await direccion.getByRole("button", { name: "Cancelar" }).click();

  // Cada parte se edita en su modal y se guarda sola (pulido 13.19)
  await page.getByRole("button", { name: "Editar resumen" }).click();
  const resumen = page.getByRole("dialog", { name: "Resumen" });
  await resumen.getByLabel("Resumen").fill("Encerado a mano que protege la pintura.");
  await resumen.getByRole("button", { name: "Guardar resumen" }).click();
  await expect(resumen).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Arriba de la página" })).toContainText("Encerado a mano que protege la pintura.");

  await page.getByRole("button", { name: "Editar beneficios" }).click();
  const beneficios = page.getByRole("dialog", { name: "Beneficios" });
  await beneficios.getByRole("button", { name: "Agregar beneficio" }).click();
  await beneficios.getByLabel("Beneficio 1", { exact: true }).fill("Brillo profundo");
  await beneficios.getByRole("button", { name: "Agregar beneficio" }).click();
  await beneficios.getByLabel("Beneficio 2", { exact: true }).fill("Repele el agua");
  // Cada beneficio con su ícono, de una lista fija (pedido de la demo del 24/10); el nuevo empieza con el genérico
  // Se elige viendo los dibujos, en una cuadrícula (pulido 13.22)
  await expect(beneficios.getByRole("button", { name: "Beneficio 1, ícono: Listo (genérico)" })).toBeVisible();
  await beneficios.getByRole("button", { name: /^Beneficio 2, ícono/ }).click();
  await expect(page.getByRole("menuitemradio", { name: "Listo (genérico)" })).toHaveAttribute("aria-checked", "true");
  await page.getByRole("menuitemradio", { name: "Agua" }).click();
  await expect(beneficios.getByRole("button", { name: "Beneficio 2, ícono: Agua" })).toBeVisible();
  // Con el teclado: las flechas recorren la cuadrícula (abajo, una fila) y Escape la cierra sin cerrar el modal
  await expect(page.getByRole("menuitemradio")).toHaveCount(0);
  await beneficios.getByRole("button", { name: /^Beneficio 1, ícono/ }).click();
  const listo = page.getByRole("menuitemradio", { name: "Listo (genérico)" });
  await listo.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("menuitemradio", { name: "Protección" })).toBeFocused();
  const columnas = info.project.name === "celular" ? 3 : 5;
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitemradio").nth(1 + columnas)).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menuitemradio")).toHaveCount(0);
  await expect(beneficios).toBeVisible();
  await beneficios.getByRole("button", { name: "Guardar beneficios" }).click();
  await expect(beneficios).toHaveCount(0);

  await page.getByRole("button", { name: "Editar pasos" }).click();
  const pasos = page.getByRole("dialog", { name: "Cómo lo hacemos" });
  await pasos.getByRole("button", { name: "Agregar paso" }).click();
  await pasos.getByLabel("Paso 1, título", { exact: true }).fill("Lavado técnico");
  await pasos.getByRole("button", { name: "Guardar pasos" }).click();
  await expect(pasos).toHaveCount(0);

  // Con resumen, se muestra; todo quedó guardado; después se oculta sin borrarlo
  await mostrarServicio(page, true);
  await page.reload();
  await expect(page.getByRole("region", { name: "Beneficios" })).toContainText("Repele el agua");
  await expect(page.getByRole("region", { name: "Cómo lo hacemos" })).toContainText("Lavado técnico");
  await page.getByRole("button", { name: "Editar beneficios" }).click();
  await expect(beneficios.getByRole("button", { name: "Beneficio 2, ícono: Agua" })).toBeVisible();
  await beneficios.getByRole("button", { name: "Cancelar" }).click();
  await mostrarServicio(page, false);
  await page.getByRole("link", { name: "Volver a Servicios" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: nombre })).toContainText("Oculto");
});

test("una dirección repetida da error junto al campo", async ({ page }, info) => {
  soloEscritorio(info);
  await ingresarComoDueno(page);
  await page.goto("/panel/sitio/servicios");
  await page.getByRole("link", { name: /Pulido de vidrios/ }).click();
  await page.getByRole("button", { name: "Más" }).click();
  await page.getByRole("menuitem", { name: "Cambiar dirección de la página" }).click();
  const modal = page.getByRole("dialog", { name: "Dirección de la página" });
  await modal.getByLabel("Dirección de la página").fill("pulido-y-nano-ceramico");
  await modal.getByRole("button", { name: "Guardar dirección" }).click();
  await expect(modal.getByText("Ya hay otra página con esa dirección.")).toBeVisible();
  await modal.getByLabel("Dirección de la página").fill("Pulido Vidrios");
  await modal.getByRole("button", { name: "Guardar dirección" }).click();
  await expect(modal.getByText("La dirección solo lleva minúsculas, números y guiones.")).toBeVisible();
});

test("la foto principal se sube y se ve; un archivo que no es imagen se rechaza", async ({ page }, info) => {
  soloEscritorio(info);
  await ingresarComoDueno(page);
  await page.goto("/panel/sitio/servicios");
  await page.getByRole("link", { name: /Polarizado de vidrios/ }).click();
  // La foto principal: sus botones no llevan nombre de sección (las fotos de la página, sí)
  await expect(page.getByRole("button", { name: "Subir foto", exact: true })).toBeEnabled();

  await page.getByLabel("Archivo de la foto", { exact: true }).setInputFiles({ name: "falsa.jpg", mimeType: "image/jpeg", buffer: Buffer.from("no soy una foto") });
  await expect(page.getByText("La foto debe ser JPG, PNG o WebP de hasta 5 MB.")).toBeVisible();

  await page.getByLabel("Archivo de la foto", { exact: true }).setInputFiles({ name: "polarizado.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByText("Foto guardada.")).toBeVisible();
  const foto = page.getByRole("img", { name: "Polarizado de vidrios" });
  await expect(foto).toHaveAttribute("src", /servicios\/[\w-]+-640\.webp$/);
  const respuesta = await page.request.get((await foto.getAttribute("src"))!);
  expect(respuesta.headers()["content-type"]).toBe("image/webp");

  await page.getByRole("button", { name: "Quitar foto", exact: true }).click();
  await expect(page.getByText("Sin foto: el sitio muestra la imagen de reemplazo de TocTar.")).toBeVisible();
});

test("el encargado con el permiso Sitio web entra; sin el permiso o con el perfil Taller, no", async ({ page }, info) => {
  const casos = [
    { usuario: `enc-sitio-${sufijo(info)}`, rol: "encargado" as const, permisos: ["sitio"], entra: true },
    { usuario: `enc-sin-sitio-${sufijo(info)}`, rol: "encargado" as const, permisos: [], entra: false },
    { usuario: `taller-sitio-${sufijo(info)}`, rol: "encargado" as const, permisos: PERFIL_TALLER, entra: false },
  ];
  for (const c of casos) {
    await crearUsuario({ usuario: c.usuario, nombre: c.usuario, contrasena: "clave-sitio-1", rol: c.rol, permisos: c.permisos });
    await page.context().clearCookies();
    await ingresar(page, c.usuario, "clave-sitio-1");
    await expect(page).toHaveURL(/\/panel$/);
    await page.goto("/panel/sitio");
    if (c.entra) {
      await expect(page.getByRole("heading", { name: "Sitio web" })).toBeVisible();
      // Desde la portada de Sitio web (pedido 26), a Servicios
      await page.getByRole("navigation", { name: "Partes del sitio web" }).getByRole("link", { name: /^Servicios/ }).click();
      // Edita la página, pero el servicio (alta, nombre, precios) es del dueño
      await page.getByRole("list", { name: "Servicios del sitio" }).getByRole("link").first().click();
      await page.getByRole("button", { name: "Más" }).click();
      await expect(page.getByRole("menuitem", { name: "Cambiar dirección de la página" })).toBeVisible();
      await expect(page.getByRole("menuitem", { name: "Abrir en el catálogo" })).toHaveCount(0);
      await page.keyboard.press("Escape");
      await page.goto("/panel/catalogo");
      await expect(page).toHaveURL(/\/panel\/sin-acceso$/);
    } else await expect(page).toHaveURL(/\/panel\/sin-acceso$/);
  }
});
