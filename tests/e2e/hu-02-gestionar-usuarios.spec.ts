import { expect, test, type Browser, type Page, type TestInfo } from "@playwright/test";
import { alertaDeIngreso, consultar, crearUsuario, ingresar, ingresarComoDueno } from "./apoyo";

// HU-02 Gestionar usuarios y roles. Criterios: docs/08-desarrollo/etapas/B1-acceso.md §10.
// Los nombres llevan el proyecto (celular o escritorio) porque ambos corren a la vez sobre la misma base.

const sufijo = (info: TestInfo) => (info.project.name === "celular" ? "c" : "e");
/** Nombre visible único por proyecto: con nombres repetidos, un proyecto podía tocar al usuario del otro. */
const nombreUnico = (nombre: string, info: TestInfo) => `${nombre} ${sufijo(info).toUpperCase()}`;

async function crearPorPantalla(page: Page, d: { nombre: string; usuario: string; contrasena: string }) {
  await page.goto("/panel/usuarios/nuevo");
  await page.getByLabel("Nombre").fill(d.nombre);
  await page.getByLabel("Usuario", { exact: true }).fill(d.usuario);
  await page.getByLabel("Contraseña inicial").fill(d.contrasena);
  await page.getByRole("button", { name: "Crear usuario" }).click();
}

/** Otra persona en otro celular o navegador: un contexto nuevo con el mismo dispositivo. */
async function otraPersona(browser: Browser, info: TestInfo) {
  const ctx = await browser.newContext(info.project.use);
  return { ctx, page: await ctx.newPage() };
}

test("el dueño crea un encargado (usuario con guion), con el perfil Taller de entrada, que ingresa sin ver Usuarios", async ({ page, browser }, info) => {
  const usuario = `taller-${sufijo(info)}`;
  await ingresarComoDueno(page);
  const nombre = nombreUnico("Chico del taller", info);
  // Pedido 50: siempre un encargado, sin rol que elegir; empieza con el perfil Taller (agenda y órdenes, pedido 32)
  await page.goto("/panel/usuarios/nuevo");
  await expect(page.getByRole("radio")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Taller/ })).toHaveAttribute("aria-pressed", "true");
  await crearPorPantalla(page, { nombre, usuario, contrasena: "taller-123" });
  await expect(page.getByText(`Usuario ${nombre} creado`)).toBeVisible();
  const [creado] = await consultar<{ rol: string }>("select rol from usuario where nombre_usuario = $1", [usuario]);
  expect(creado.rol).toBe("encargado");

  const { ctx, page: otra } = await otraPersona(browser, info);
  await ingresar(otra, usuario, "taller-123");
  await expect(otra).toHaveURL(/\/panel$/);
  if (info.project.name === "celular") await otra.getByRole("button", { name: "Abrir menú" }).click();
  const menu = otra.getByRole("navigation", { name: "Panel" });
  await expect(menu.getByRole("link", { name: "Órdenes" })).toBeVisible();
  await expect(menu.getByRole("link", { name: "Usuarios" })).toHaveCount(0);

  await otra.goto("/panel/usuarios");
  await expect(otra).toHaveURL(/\/panel\/sin-acceso$/);
  // Lleva a otra pantalla: se anuncia como enlace, no como botón (pulido 5.6)
  await expect(otra.getByRole("link", { name: "Volver al inicio" })).toBeVisible();
  await expect(otra.getByRole("heading", { name: "Sin acceso" })).toBeVisible();
  await ctx.close();
});

test("restablecer la contraseña: la anterior deja de servir y la nueva funciona", async ({ page, browser }, info) => {
  const usuario = `olvido-${sufijo(info)}`;
  const nombre = nombreUnico("Encargado olvidadizo", info);
  await crearUsuario({ usuario, nombre, contrasena: "vieja-1234", rol: "encargado" });
  await ingresarComoDueno(page);
  await page.goto("/panel/usuarios");
  await page.getByRole("link", { name: nombre }).first().click();
  // En "Más", con su modal (C6)
  await page.getByRole("button", { name: "Más" }).click();
  await page.getByRole("menuitem", { name: "Restablecer contraseña" }).click();
  const modal = page.getByRole("dialog", { name: `Nueva contraseña para ${nombre}` });
  // Sin contraseña: el error y el foco van al campo (pulido 5.5)
  await modal.getByRole("button", { name: "Guardar contraseña" }).click();
  await expect(modal.getByLabel("Contraseña nueva")).toBeFocused();
  await modal.getByLabel("Contraseña nueva").fill("nueva-1234");
  await modal.getByRole("button", { name: "Guardar contraseña" }).click();
  await expect(page.getByText("Contraseña cambiada")).toBeVisible();
  await expect(modal).toHaveCount(0);

  const { ctx, page: otra } = await otraPersona(browser, info);
  await ingresar(otra, usuario, "vieja-1234");
  await expect(alertaDeIngreso(otra)).toHaveText("Usuario o contraseña incorrectos.");
  await ingresar(otra, usuario, "nueva-1234");
  await expect(otra).toHaveURL(/\/panel$/);
  await ctx.close();
});

test("desactivar a alguien con la sesión abierta lo saca del panel", async ({ page, browser }, info) => {
  const usuario = `saliente-${sufijo(info)}`;
  const nombre = nombreUnico("Encargado saliente", info);
  await crearUsuario({ usuario, nombre, contrasena: "saliente-123", rol: "encargado" });

  const { ctx, page: saliente } = await otraPersona(browser, info);
  await ingresar(saliente, usuario, "saliente-123");
  await expect(saliente).toHaveURL(/\/panel$/);

  await ingresarComoDueno(page);
  await page.goto("/panel/usuarios");
  await page.getByRole("link", { name: nombre }).first().click();
  // En "Más", con su confirmación: el foco en "Cancelar", así un Enter no lo desactiva (C6)
  const desactivar = async () => {
    await page.getByRole("button", { name: "Más" }).click();
    await page.getByRole("menuitem", { name: "Desactivar usuario" }).click();
    return page.getByRole("dialog", { name: `¿Desactivar a ${nombre}?` });
  };
  let confirmar = await desactivar();
  await expect(confirmar).toContainText("no podrá ingresar");
  await expect(confirmar.getByRole("button", { name: "Cancelar" })).toBeFocused();
  await confirmar.getByRole("button", { name: "Cancelar" }).click();
  await expect(confirmar).toHaveCount(0);
  confirmar = await desactivar();
  await confirmar.getByRole("button", { name: "Sí, desactivar" }).click();
  await expect(page.getByText("Usuario desactivado")).toBeVisible();
  // Desactivado, reactivarlo es la acción del encabezado
  await expect(page.getByRole("button", { name: "Reactivar usuario" })).toBeVisible();

  await saliente.goto("/panel");
  await expect(saliente).toHaveURL(/\/ingresar$/);
  await ctx.close();
});

// Pedido 50 (RN-15): la cuenta de un dueño no se cambia desde el panel; su contraseña la cambia él mismo, con la actual
test("en su ficha, el dueño solo cambia su nombre y su contraseña, con la actual", async ({ page, browser }, info) => {
  test.setTimeout(60_000);
  // Un dueño propio de la prueba: cambiarle la contraseña al de siempre rompería las demás
  const usuario = `dueno-clave-${sufijo(info)}`;
  const nombre = nombreUnico("Dueño con clave", info);
  await crearUsuario({ usuario, nombre, contrasena: "dueno-vieja-1", rol: "dueno" });
  // Otra sesión abierta (el celular que se quedó en el mostrador): se cierra al cambiar la contraseña
  const { ctx: mostrador, page: abierta } = await otraPersona(browser, info);
  await ingresar(abierta, usuario, "dueno-vieja-1");
  await expect(abierta).toHaveURL(/\/panel$/);
  await ingresar(page, usuario, "dueno-vieja-1");
  await expect(page).toHaveURL(/\/panel$/);
  await page.goto("/panel/usuarios");
  await page.getByRole("link", { name: nombre }).first().click();
  await expect(page.getByText("Es tu usuario.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Editar datos del usuario" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Editar permisos" })).toHaveCount(0);
  await page.getByRole("main").getByRole("button", { name: "Más" }).click();
  await expect(page.getByRole("menuitem")).toHaveText(["Cambiar mi contraseña"]);
  await page.getByRole("menuitem", { name: "Cambiar mi contraseña" }).click();

  const modal = page.getByRole("dialog", { name: "Cambiar mi contraseña" });
  // Con la actual equivocada no cambia
  await modal.getByLabel("Contraseña actual").fill("no-es-esta-1");
  await modal.getByLabel("Contraseña nueva").fill("dueno-nueva-1");
  await modal.getByRole("button", { name: "Guardar contraseña" }).click();
  await expect(modal.getByText("La contraseña actual no es correcta.")).toBeVisible();
  await modal.getByLabel("Contraseña actual").fill("dueno-vieja-1");
  await modal.getByLabel("Contraseña nueva").fill("dueno-nueva-1");
  await modal.getByRole("button", { name: "Guardar contraseña" }).click();
  await expect(page.getByText("Contraseña cambiada. Se cerraron tus otras sesiones.")).toBeVisible();
  await expect(modal).toHaveCount(0);
  // Esta sesión sigue; la otra, no
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: nombre })).toBeVisible();
  await abierta.goto("/panel");
  await expect(abierta).toHaveURL(/\/ingresar$/);
  await mostrador.close();

  const { ctx, page: otra } = await otraPersona(browser, info);
  await ingresar(otra, usuario, "dueno-vieja-1");
  await expect(alertaDeIngreso(otra)).toHaveText("Usuario o contraseña incorrectos.");
  await ingresar(otra, usuario, "dueno-nueva-1");
  await expect(otra).toHaveURL(/\/panel$/);
  await ctx.close();
});

test("la ficha de otro dueño solo se mira: sin Editar ni Más", async ({ page }, info) => {
  const nombre = nombreUnico("Socio dueño", info);
  await crearUsuario({ usuario: `socio-${sufijo(info)}`, nombre, contrasena: "socio-1234", rol: "dueno" });
  await ingresarComoDueno(page);
  await page.goto("/panel/usuarios");
  await page.getByRole("link", { name: nombre }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: nombre })).toBeVisible();
  await expect(page.getByText("La cuenta de un dueño solo la cambia él mismo.")).toBeVisible();
  await expect(page.getByRole("main").getByRole("button", { name: /Editar|Más/ })).toHaveCount(0);
  await expect(page.getByRole("main")).toContainText("Dueño");
});

// Pulido visual 1.5, desde C6 en la ficha: en el celular el aviso va arriba y no tapa las acciones de la ficha
test("en el celular, el aviso de guardado no tapa las acciones de la ficha", async ({ page }, info) => {
  test.skip(info.project.name !== "celular", "En el celular es donde el aviso va arriba");
  const usuario = `aviso-${info.retry}-${Math.floor(Math.random() * 1e6)}`;
  await crearUsuario({ usuario, nombre: "Aviso de prueba", contrasena: "encargado-123", rol: "encargado" });
  await ingresarComoDueno(page);
  await page.goto("/panel/usuarios");
  await page.getByRole("link", { name: "Aviso de prueba" }).first().click();
  await page.getByRole("button", { name: "Editar datos del usuario" }).click();
  const datos = page.getByRole("dialog", { name: "Datos del usuario" });
  await datos.getByLabel("Nombre").fill("Aviso de prueba cambiado");
  await datos.getByRole("button", { name: "Guardar datos" }).click();
  const aviso = page.locator("[data-sonner-toast]").first();
  await expect(aviso).toContainText("Datos guardados.");
  await expect(datos).toHaveCount(0);
  const caja = (await aviso.boundingBox())!;
  for (const nombre of ["Más", "Editar permisos", "Editar datos del usuario"]) {
    const boton = (await page.getByRole("button", { name: nombre }).boundingBox())!;
    const sePisan = caja.x < boton.x + boton.width && boton.x < caja.x + caja.width && caja.y < boton.y + boton.height && boton.y < caja.y + caja.height;
    expect(sePisan, nombre).toBe(false);
  }
});

test("un usuario repetido muestra un error claro", async ({ page }, info) => {
  const usuario = `repetido-${sufijo(info)}`;
  await crearUsuario({ usuario, nombre: "Primero", contrasena: "primero-123", rol: "encargado" });
  await ingresarComoDueno(page);
  await crearPorPantalla(page, { nombre: "Segundo", usuario: usuario.toUpperCase(), contrasena: "segundo-123" });
  await expect(page.getByText("Ese usuario ya existe. Elige otro.")).toBeVisible();
  await expect(page.getByLabel("Nombre")).toHaveValue("Segundo");
});

test("los errores del formulario se muestran junto a cada campo", async ({ page }) => {
  await ingresarComoDueno(page);
  await page.goto("/panel/usuarios/nuevo");
  await page.getByRole("button", { name: "Crear usuario" }).click();
  await expect(page.getByText("Escribe el nombre completo.")).toBeVisible();
  await expect(page.getByText("La contraseña debe tener al menos 8 caracteres.")).toBeVisible();
  await expect(page.getByLabel("Nombre")).toBeFocused(); // pulido 5.4
});

// Tras un error, lo que se ve marcado es lo que se guarda: React reinicia el formulario al terminar la acción, y por eso
// los permisos viajan en campos ocultos propios.
test("tras un error, el perfil elegido se conserva y es el que se guarda", async ({ page }, info) => {
  await ingresarComoDueno(page);
  const nombre = nombreUnico("Encargado tras error", info);
  const usuario = `enc-tras-error-${sufijo(info)}`;
  await page.goto("/panel/usuarios/nuevo");
  await page.getByLabel("Nombre").fill(nombre);
  await page.getByLabel("Usuario", { exact: true }).fill(usuario);
  await page.getByRole("button", { name: /^Atención/ }).click();
  await page.getByRole("button", { name: "Crear usuario" }).click();
  await expect(page.getByText("La contraseña debe tener al menos 8 caracteres.")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Atención/ })).toHaveAttribute("aria-pressed", "true");

  await page.getByLabel("Contraseña inicial").fill("encargado-123");
  await page.getByRole("button", { name: "Crear usuario" }).click();
  await expect(page.getByText(`Usuario ${nombre} creado`)).toBeVisible();
  // Fila de la tabla (computadora) o tarjeta (celular): la que se ve
  // (dentro de la página: el aviso flotante también nombra al usuario)
  await expect(page.getByRole("main").locator("tr, li").filter({ hasText: nombre }).locator("visible=true")).toContainText("Encargado");
  const permisos = await consultar<{ permiso: string }>(
    "select p.permiso from usuario_permiso p join usuario u on u.id = p.usuario_id where u.nombre_usuario = $1 order by p.permiso",
    [usuario],
  );
  expect(permisos.map((p) => p.permiso)).toEqual(["agenda", "clientes", "cotizaciones", "mantenimientos", "ordenes", "pagos"]);
});

// Pulido 5.3: "Agregar usuario" en la lista, "(tú)" en el propio y, en la computadora, toda la fila abre el usuario.
test("la lista de usuarios: Agregar usuario, (tú) y la fila que abre el usuario", async ({ page }, info) => {
  await ingresarComoDueno(page);
  await page.goto("/panel/usuarios");
  await page.getByRole("link", { name: "Agregar usuario" }).click();
  await expect(page).toHaveURL(/\/panel\/usuarios\/nuevo$/);
  await page.goto("/panel/usuarios");
  await expect(page.getByText("(tú)").locator("visible=true")).toBeVisible();
  if (info.project.name !== "escritorio") return;
  // Se toca con el mouse donde está el rol, no el nombre: toda la fila es el enlace (pedido 26, TablaLista). El rol es la
  // última columna desde el 10/11 (sin "Estado": lo dice la píldora "Desactivados"), sin la coma que separa las celdas
  // A la vista primero: con muchos usuarios de prueba antes por nombre, la fila del dueño queda más abajo de la pantalla
  const celda = page.getByRole("list", { name: "Usuarios" }).getByRole("link").filter({ hasText: "(tú)" }).getByText(/^Dueño,?\s*$/);
  await celda.scrollIntoViewIfNeeded();
  const rol = (await celda.boundingBox())!;
  await page.mouse.click(rol.x + rol.width / 2, rol.y + rol.height / 2);
  await expect(page).toHaveURL(/\/panel\/usuarios\/\d+(?:[?&]volver=[^&#]*)?$/);
});

