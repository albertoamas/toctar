import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { consultar, crearServicioPublicado, crearUsuario, ingresar, ingresarComoDueno } from "./apoyo";

// HU-19 Catálogo con variantes y HU-20 Precios por tamaño y duración.
// Especificación: docs/08-desarrollo/etapas/C1-catalogo-clientes.md §9. La ficha del servicio está en lectura y cada
// sección se edita con "Editar", de a una (pulido 7.3, skill pantallas-panel).
// Cada proyecto (celular o escritorio) trabaja sobre su propio servicio, para no pisarse al correr en paralelo.

const sufijo = (info: TestInfo) => (info.project.name === "celular" ? "C" : "E");

/** La ficha de un servicio, ya cargada: "Editar" se habilita al hidratar y un toque antes se perdería. */
async function abrirFicha(page: Page, id: string) {
  await page.goto(`/panel/catalogo/${id}`, { waitUntil: "networkidle" });
  await expect(page.getByRole("button", { name: "Editar datos del servicio" })).toBeEnabled();
}

test("el dueño marca el mantenimiento, cambia la duración y desactiva un servicio, que sale del sitio", async ({ page }, info) => {
  test.setTimeout(60_000);
  const nombre = `Catálogo de prueba ${sufijo(info)}`;
  await ingresarComoDueno(page);
  const { id, slug } = await crearServicioPublicado(page, nombre);

  // Desde el menú
  await page.goto("/panel");
  if (info.project.name === "celular") await page.getByRole("button", { name: "Abrir menú" }).click();
  await page.getByRole("navigation", { name: "Panel" }).getByRole("link", { name: "Catálogo y precios" }).click();
  const lista = page.getByRole("list", { name: "Servicios del catálogo" });
  // Dato inicial: el nano cerámico genera mantenimiento (RN-08)
  await expect(lista.getByRole("link", { name: /Pulido y nano cerámico/ })).toContainText("Genera mantenimiento");
  await lista.getByRole("link", { name: new RegExp(nombre) }).click();
  await expect(page).toHaveURL(new RegExp(`/panel/catalogo/${id}$`));
  await abrirFicha(page, id);

  // En lectura; "Editar" abre el formulario de los datos
  const datos = page.getByRole("region", { name: "Datos" });
  await expect(datos).toContainText("1 día");
  await expect(datos).toContainText("No genera recordatorio");
  const editar = page.getByRole("button", { name: "Editar datos del servicio" });
  await editar.click();
  // Una duración fuera de rango se rechaza y el foco va al campo
  await datos.getByLabel("Duración estimada").fill("0");
  await datos.getByRole("button", { name: "Guardar datos" }).click();
  await expect(page.getByText("Escribe los días, de 1 a 60.")).toBeVisible();
  await expect(datos.getByLabel("Duración estimada")).toBeFocused();

  await datos.getByLabel("Duración estimada").fill("3");
  await datos.getByText("Genera recordatorio de mantenimiento").click();
  await datos.getByRole("button", { name: "Guardar datos" }).click();
  await expect(page.getByText("Cambios guardados.")).toBeVisible();
  // Guardado, vuelve a lectura con los datos nuevos y el foco en "Editar"
  await expect(datos).toContainText("3 días");
  await expect(datos).toContainText("Genera recordatorio");
  await expect(editar).toBeFocused();

  // Inactivo: no sale en el sitio (su página no existe) y queda marcado en el catálogo
  await editar.click();
  await datos.getByText("Activo en el catálogo").click();
  await datos.getByRole("button", { name: "Guardar datos" }).click();
  await expect(page.getByRole("heading", { level: 1 }).locator("..")).toContainText("Inactivo");
  await page.goto(`/servicios/${slug}`);
  await expect(page.getByRole("heading", { name: "No encontramos esta página" })).toBeVisible();

  // Se reactiva: vuelve al sitio
  await abrirFicha(page, id);
  await editar.click();
  await datos.getByText("Activo en el catálogo").click();
  await datos.getByRole("button", { name: "Guardar datos" }).click();
  await expect(datos).toContainText("Activo");
  await page.goto(`/servicios/${slug}`);
  await expect(page.getByRole("heading", { level: 1, name: nombre })).toBeVisible();
});

test("las variantes se agregan, renombran y desactivan en el catálogo; una nueva pide sus precios", async ({ page }, info) => {
  await ingresarComoDueno(page);
  await page.goto("/panel/catalogo");
  // Cuenta las variantes activas del servicio (datos iniciales: 1, 2, 3, 5 y 10 años)
  await expect(page.getByRole("list", { name: "Servicios del catálogo" }).getByRole("link", { name: /Pulido y nano cerámico/ })).toContainText("5 variantes");

  await page.getByRole("link", { name: "Agregar servicio" }).click();
  await expect(page).toHaveURL(/\/panel\/catalogo\/nuevo$/);
  // La dirección de antes de la reorganización (C5 §0) lleva a la misma pantalla
  await page.goto("/panel/sitio/servicios/nuevo");
  await expect(page).toHaveURL(/\/panel\/catalogo\/nuevo$/);
  await page.getByLabel("Nombre del servicio").fill(`Variantes de prueba ${sufijo(info)}`);
  await page.getByRole("button", { name: "Crear servicio" }).click();
  await expect(page.getByText("Servicio creado. Carga sus precios.")).toBeVisible();
  // D-2: nace con la variante "Única", y la ficha se abre en sus precios, que es lo que falta
  await expect(page.getByRole("form", { name: "Precios de Única" })).toBeVisible();

  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Editar variantes" }).click();
  // Una sección a la vez: abrir las variantes cierra los precios
  await expect(page.getByRole("form", { name: "Precios de Única" })).toHaveCount(0);
  const variantes = page.getByRole("region", { name: "Variantes" });
  const activas = variantes.getByRole("list", { name: "Variantes activos" });
  await expect(activas).toContainText("Única");

  await variantes.getByRole("button", { name: "Agregar variante" }).click();
  await variantes.getByLabel("Nombre del variante").fill("Premium");
  await variantes.getByRole("button", { name: "Agregar", exact: true }).click();
  await expect(page.getByText("Variante Premium agregada.")).toBeVisible();
  // La nueva ya tiene sus precios, sin cargar
  await expect(page.getByRole("region", { name: "Premium" })).toContainText("Sin cargar");
  await variantes.getByRole("button", { name: "Editar Única" }).click();
  await variantes.getByLabel("Nombre del variante").fill("Básico");
  await variantes.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(activas.getByRole("listitem")).toHaveText([/Básico/, /Premium/]);

  // Desactivar no borra; la última activa no se desactiva
  await variantes.getByRole("button", { name: "Editar Premium" }).click();
  await variantes.getByRole("button", { name: "Desactivar Premium" }).click();
  await expect(page.getByText("Premium desactivada.")).toBeVisible();
  await expect(page.getByRole("region", { name: "Premium" })).toHaveCount(0);
  await variantes.getByRole("button", { name: "Editar Básico" }).click();
  await variantes.getByRole("button", { name: "Desactivar Básico" }).click();
  await expect(page.getByText(/Debe quedar al menos una variante activa/)).toBeVisible();

  // "Listo" la cierra: en lectura, los nombres
  await variantes.getByRole("button", { name: "Cancelar" }).click();
  await variantes.getByRole("button", { name: "Listo" }).click();
  await expect(variantes).toContainText("Básico (1 desactivada)");
});

test("el encargado, aun con todos sus permisos, y el técnico no entran al catálogo", async ({ page }, info) => {
  for (const rol of ["encargado", "tecnico"] as const) {
    const usuario = `${rol}-catalogo-${sufijo(info).toLowerCase()}`;
    const permisos = rol === "encargado" ? ["sitio", "reclamos", "clientes"] : [];
    await crearUsuario({ usuario, nombre: `${rol} catálogo`, contrasena: "clave-catalogo-1", rol, permisos });
    await page.context().clearCookies();
    await ingresar(page, usuario, "clave-catalogo-1");
    await expect(page).toHaveURL(/\/panel$/);
    await page.goto("/panel/catalogo");
    await expect(page).toHaveURL(/\/panel\/sin-acceso$/);
  }
});

/** Filas de precio de un servicio y un tamaño: para comprobar que no se pisan (D-3). */
async function filasDePrecio(servicioId: string, tamano: string): Promise<(string | null)[]> {
  const filas = await consultar<{ monto: string | null }>(
    `select p.monto from precio p join variante v on v.id = p.variante_id join tamano_vehiculo t on t.id = p.tamano_id
     where v.servicio_id = $1 and t.nombre = $2 order by p.id`,
    [servicioId, tamano],
  );
  return filas.map((r) => r.monto);
}

test("el dueño carga precios por tamaño; vacío es según evaluación y cada cambio queda en el historial", async ({ page }, info) => {
  test.setTimeout(60_000);
  const nombre = `Precios de prueba ${sufijo(info)}`;
  await ingresarComoDueno(page);
  const { id } = await crearServicioPublicado(page, nombre);
  await abrirFicha(page, id);
  // Un servicio nuevo tiene la variante "Única" (D-2), todavía sin precios: en lectura, "Sin cargar"
  const unica = page.getByRole("region", { name: "Única" });
  await expect(unica.getByText("Sin cargar")).toHaveCount(5);
  const editar = unica.getByRole("button", { name: "Editar precios de Única" });
  const precios = page.getByRole("form", { name: "Precios de Única" });

  // Un monto con separador de miles se rechaza, con el foco en el campo
  await editar.click();
  await expect(precios.getByLabel("Compactos")).toHaveAttribute("placeholder", "Sin cargar");
  await precios.getByLabel("Compactos").fill("1.250");
  await precios.getByRole("button", { name: "Guardar precios" }).click();
  await expect(precios.getByText(/Escribe solo números/)).toBeVisible();
  await expect(precios.getByLabel("Compactos")).toBeFocused();

  await precios.getByLabel("Compactos").fill("250");
  await precios.getByLabel("Sedanes y hatchbacks medianos").fill("300,50");
  await precios.getByRole("button", { name: "Guardar precios" }).click();
  await expect(page.getByText("Precios guardados.")).toBeVisible();
  // Guardado, vuelve a lectura: lo que quedó vacío es "según evaluación"
  await expect(precios).toHaveCount(0);
  await expect(unica).toContainText("250 Bs");
  await expect(unica).toContainText("300,50 Bs");
  await expect(unica.getByText("Según evaluación")).toHaveCount(3);
  await editar.click();
  await expect(precios.getByLabel("Compactos")).toHaveValue("250");
  await expect(precios.getByLabel("Vagonetas medianas")).toHaveAttribute("placeholder", "Según evaluación");

  // Sin cambios no se escribe nada
  await precios.getByRole("button", { name: "Guardar precios" }).click();
  await expect(page.getByText("No había cambios.")).toBeVisible();

  // Un cambio agrega una fila y no toca la anterior (D-3)
  await editar.click();
  await precios.getByLabel("Compactos").fill("280");
  await precios.getByRole("button", { name: "Guardar precios" }).click();
  await expect.poll(() => filasDePrecio(id, "Compactos")).toEqual(["250.00", "280.00"]);
  await expect(unica).toContainText("280 Bs");

  // El historial, dentro de la edición: anterior, nuevo, fecha y quién
  await editar.click();
  await precios.getByRole("button", { name: "Ver historial" }).click();
  const cambios = page.getByRole("dialog").getByRole("list", { name: "Cambios de precio" });
  await expect(cambios.getByRole("listitem").first()).toContainText("Compactos");
  await expect(cambios.getByRole("listitem").first()).toContainText("250 Bs → 280 Bs");
  await expect(cambios.getByRole("listitem").first()).toContainText("Dueño de prueba");
  await expect(cambios).toContainText("Sin cargar → 250 Bs");
  await page.keyboard.press("Escape");

  // Duración propia de la variante: en lectura, solo si es distinta de la del servicio
  await precios.getByLabel("Duración propia").fill("2");
  await precios.getByRole("button", { name: "Guardar precios" }).click();
  await expect.poll(() => consultar<{ d: number | null }>("select duracion_dias as d from variante where servicio_id = $1", [id])).toEqual([{ d: 2 }]);
  await expect(unica).toContainText("Ocupa 2 días.");

  // En la lista ya no dice que le faltan precios
  await page.goto("/panel/catalogo");
  await expect(page.getByRole("list", { name: "Servicios del catálogo" }).getByRole("link", { name: new RegExp(nombre) })).not.toContainText("Falta");
});
