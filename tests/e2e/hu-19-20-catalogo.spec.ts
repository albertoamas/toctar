import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { abrirNuevoServicio, consultar, crearServicioPublicado, crearUsuario, ingresar, ingresarComoDueno, PERFIL_TALLER } from "./apoyo";

// HU-19 Catálogo con variantes y HU-20 Precios por tamaño y duración.
// Especificación: docs/08-desarrollo/etapas/C1-catalogo-clientes.md §9. La ficha del servicio está en lectura y cada
// recuadro se edita con "Editar", en un modal (pulido 7.3, skill pantallas-panel).
// Cada proyecto (celular o escritorio) trabaja sobre su propio servicio, para no pisarse al correr en paralelo.

const sufijo = (info: TestInfo) => (info.project.name === "celular" ? "C" : "E");

/**
 * La página pública del servicio, hasta que muestre lo esperado: el sitio renueva su copia en segundo plano y la primera
 * visita después de un cambio puede servir la anterior unos segundos (medido el 25/10: 2 a 3 s con las pruebas en paralelo).
 */
async function enElSitio(page: Page, slug: string, titulo: string | RegExp) {
  await expect(async () => {
    await page.goto(`/servicios/${slug}`);
    await expect(page.getByRole("heading", { level: 1, name: titulo })).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
}

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
  const ceramico = lista.getByRole("link", { name: /Pulido y nano cerámico/ });
  await expect(ceramico).toContainText("Con mantenimiento");
  // Sin precios en la base de pruebas: lo que falta, en el aviso (cuántos depende de los tamaños activos, que hu-05 cambia)
  await expect(ceramico).toContainText(/Faltan \d+ precios/);
  await lista.getByRole("link", { name: new RegExp(nombre) }).click();
  await expect(page).toHaveURL(new RegExp(`/panel/catalogo/${id}$`));
  await abrirFicha(page, id);

  // En lectura; "Editar" abre el formulario de los datos en un modal
  const datos = page.getByRole("region", { name: "Datos" });
  await expect(datos).toContainText("1 día");
  await expect(datos).toContainText("No programa mantenimiento");
  const editar = page.getByRole("button", { name: "Editar datos del servicio" });
  const modal = page.getByRole("dialog", { name: "Datos del servicio" });
  await editar.click();
  // Una duración fuera de rango se rechaza y el foco va al campo
  await modal.getByLabel("Duración estimada").fill("0");
  await modal.getByRole("button", { name: "Guardar datos" }).click();
  await expect(modal.getByText("Escribe los días, de 1 a 60.")).toBeVisible();
  await expect(modal.getByLabel("Duración estimada")).toBeFocused();

  await modal.getByLabel("Duración estimada").fill("3");
  // Su mantenimiento (pedido 21): con la casilla, el servicio y cada cuántos meses
  await modal.getByText("Programa un mantenimiento al entregarlo").click();
  await modal.getByRole("button", { name: "Guardar datos" }).click();
  await expect(modal.getByText("Elige el servicio de mantenimiento.")).toBeVisible();
  await expect(modal.getByText("Escribe los meses, de 1 a 24.")).toBeVisible();
  await modal.getByLabel("Servicio de mantenimiento").selectOption({ label: "Este mismo servicio" });
  await modal.getByLabel("Cada", { exact: true }).fill("6");
  await modal.getByRole("button", { name: "Guardar datos" }).click();
  await expect(page.getByText("Cambios guardados.")).toBeVisible();
  // Guardado, el modal se cierra, la lectura muestra los datos nuevos y el foco vuelve a "Editar"
  await expect(modal).toHaveCount(0);
  await expect(datos).toContainText("3 días");
  await expect(datos).toContainText("Él mismo, cada 6 meses");
  await expect(editar).toBeFocused();

  // Inactivo: no sale en el sitio (su página no existe) y queda marcado en el catálogo
  await editar.click();
  await modal.getByText("Activo en el catálogo").click();
  await modal.getByRole("button", { name: "Guardar datos" }).click();
  await expect(modal).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 }).locator("..")).toContainText("Inactivo");
  await enElSitio(page, slug, "No encontramos esta página");

  // Se reactiva: vuelve al sitio
  await abrirFicha(page, id);
  await editar.click();
  await modal.getByText("Activo en el catálogo").click();
  await modal.getByRole("button", { name: "Guardar datos" }).click();
  // Guardado de verdad: el modal se cerró y la lectura dice "Activo"
  await expect(modal).toHaveCount(0);
  await expect(datos).toContainText("Activo");
  await enElSitio(page, slug, nombre);
});

test("las variantes se agregan, renombran y desactivan en el catálogo; una nueva pide sus precios", async ({ page }, info) => {
  await ingresarComoDueno(page);
  await page.goto("/panel/catalogo");
  // Cuenta las variantes activas del servicio (datos iniciales: 1, 2, 3, 5 y 10 años)
  await expect(page.getByRole("list", { name: "Servicios del catálogo" }).getByRole("link", { name: /Pulido y nano cerámico/ })).toContainText("5 variantes");

  // "Agregar servicio" es un modal en la lista (pulido 7.2): las direcciones viejas de la pantalla de alta llevan ahí
  for (const vieja of ["/panel/catalogo/nuevo", "/panel/sitio/servicios/nuevo"]) {
    await page.goto(vieja);
    await expect(page).toHaveURL(/\/panel\/catalogo$/);
  }
  const nuevo = await abrirNuevoServicio(page);
  await nuevo.getByLabel("Nombre del servicio").fill(`Variantes de prueba ${sufijo(info)}`);
  await nuevo.getByRole("button", { name: "Crear servicio" }).click();
  await expect(page.getByText("Servicio creado. Carga sus precios.")).toBeVisible();
  // D-2: nace con la variante "Única", y la ficha se abre en el modal de sus precios, con el foco en el primero
  const preciosUnica = page.getByRole("dialog", { name: "Precios de Única" });
  await expect(preciosUnica.getByLabel("Compactos")).toBeFocused();
  await preciosUnica.getByRole("button", { name: "Cancelar" }).click();

  const variantes = page.getByRole("dialog", { name: "Variantes" });
  const activas = variantes.getByRole("list", { name: "Variantes activos" });
  await page.getByRole("button", { name: "Editar variantes" }).click();
  await expect(activas).toContainText("Única");
  // Agregar y renombrar, cada una en su modal sobre el de las variantes (pulido 13.27)
  await variantes.getByRole("button", { name: "Agregar variante" }).click();
  const nueva = page.getByRole("dialog", { name: "Nueva variante" });
  await nueva.getByLabel("Nombre de la variante").fill("Premium");
  await nueva.getByRole("button", { name: "Agregar variante" }).click();
  await expect(page.getByText("Variante Premium agregada.")).toBeVisible();
  await expect(nueva).toHaveCount(0);
  await variantes.getByRole("button", { name: "Listo" }).click();
  // La nueva ya tiene sus precios en la ficha, sin cargar
  await expect(page.getByRole("region", { name: "Premium" })).toContainText("Sin cargar");

  await page.getByRole("button", { name: "Editar variantes" }).click();
  const editar = page.getByRole("dialog", { name: "Editar variante" });
  await variantes.getByRole("button", { name: "Editar Única" }).click();
  await editar.getByLabel("Nombre de la variante").fill("Básico");
  await editar.getByRole("button", { name: "Guardar variante" }).click();
  await expect(editar).toHaveCount(0);
  await expect(activas.getByRole("listitem")).toHaveText([/Básico/, /Premium/]);

  // Desactivar no borra; la última activa no se desactiva
  await variantes.getByRole("button", { name: "Editar Premium" }).click();
  await editar.getByRole("button", { name: "Desactivar Premium" }).click();
  await expect(page.getByText("Premium desactivada.")).toBeVisible();
  await variantes.getByRole("button", { name: "Editar Básico" }).click();
  // Con su modal abierto, "Listo" no está: lo escrito sin guardar se perdería
  await expect(variantes.getByRole("button", { name: "Listo" })).toHaveCount(0);
  await editar.getByRole("button", { name: "Desactivar Básico" }).click();
  await expect(page.getByText(/Debe quedar al menos una variante activa/)).toBeVisible();

  // "Listo" cierra el modal: en lectura, los nombres, y la desactivada ya no tiene precios en la ficha
  await editar.getByRole("button", { name: "Cancelar" }).click();
  await variantes.getByRole("button", { name: "Listo" }).click();
  await expect(page.getByRole("region", { name: "Variantes" })).toContainText("Básico (1 desactivada)");
  await expect(page.getByRole("region", { name: "Premium" })).toHaveCount(0);
});

test("ningún encargado entra al catálogo, ni con todos sus permisos ni con el perfil Taller", async ({ page }, info) => {
  for (const [perfil, permisos] of [["todo", ["sitio", "reclamos", "clientes", "cotizaciones", "agenda", "ordenes", "pagos", "mantenimientos", "entrega_con_saldo"]], ["taller", PERFIL_TALLER]] as const) {
    const usuario = `${perfil}-catalogo-${sufijo(info).toLowerCase()}`;
    await crearUsuario({ usuario, nombre: `Encargado ${perfil}`, contrasena: "clave-catalogo-1", rol: "encargado", permisos: [...permisos] });
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
  const precios = page.getByRole("dialog", { name: "Precios de Única" });

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

  // En la lista (pulido 7.1): desde cuánto cuesta (el menor de sus precios) y ya no dice que le faltan
  await page.goto("/panel/catalogo");
  const fila = page.getByRole("list", { name: "Servicios del catálogo" }).getByRole("link", { name: new RegExp(nombre) });
  await expect(fila).toContainText("Desde 280 Bs");
  await expect(fila).not.toContainText("Falta");
});

test("un servicio que otro usa como su mantenimiento no se desactiva (pedido 21)", async ({ page }) => {
  await ingresarComoDueno(page);
  const [{ id }] = await consultar<{ id: number }>("select id from servicio where slug = 'mantenimiento-del-nano-ceramico'");
  await page.goto(`/panel/catalogo/${id}`);
  await page.getByRole("button", { name: "Editar datos del servicio" }).click();
  const modal = page.getByRole("dialog", { name: "Datos del servicio" });
  await modal.getByText("Activo en el catálogo").click();
  await modal.getByRole("button", { name: "Guardar datos" }).click();
  await expect(modal.getByText("Es el mantenimiento de Pulido y nano cerámico: cámbialo ahí primero.")).toBeVisible();
  const [{ activo }] = await consultar<{ activo: boolean }>("select activo from servicio where id = $1", [id]);
  expect(activo).toBe(true);
});
