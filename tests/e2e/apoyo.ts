import { expect, type Locator, type Page } from "@playwright/test";
import { hashPassword } from "better-auth/crypto";
import pg from "pg";

// Datos y ayudas compartidas por las pruebas de punta a punta.

const URL_BASE_E2E = "postgres://toctar:toctar@localhost:5432/toctar_e2e";

/** PNG de 1 × 1 píxel, para las pruebas que suben fotos. */
export const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");

export const DUENO = { usuario: "dueno", nombre: "Dueño de prueba", contrasena: "dueno-e2e-123" };

/** Crea (o reemplaza) un usuario directo en la base de pruebas. */
/** Los permisos del perfil Taller (pedido 32, `PERFILES` en src/lib/permisos.ts): quien recibe y trabaja los vehículos. */
export const PERFIL_TALLER = ["agenda", "ordenes"];

export async function crearUsuario(datos: {
  usuario: string;
  nombre: string;
  contrasena: string;
  rol: "dueno" | "encargado";
  desactivado?: boolean;
  /** Permisos del encargado (src/lib/permisos.ts), por ejemplo ["sitio"]. */
  permisos?: string[];
}) {
  const cliente = new pg.Client({ connectionString: URL_BASE_E2E });
  await cliente.connect();
  try {
    await cliente.query("delete from usuario where nombre_usuario = $1", [datos.usuario]);
    const { rows } = await cliente.query<{ id: number }>(
      `insert into usuario (nombre, correo, nombre_usuario, rol, desactivado, updated_at)
       values ($1, $2, $3, $4, $5, now()) returning id`,
      [datos.nombre, `${datos.usuario}@usuarios.toctar.local`, datos.usuario, datos.rol, datos.desactivado ?? false],
    );
    const id = rows[0].id;
    await cliente.query(
      `insert into cuenta (id_en_proveedor, proveedor, usuario_id, contrasena, updated_at)
       values ($1, 'credential', $2, $3, now())`,
      [String(id), id, await hashPassword(datos.contrasena)],
    );
    for (const permiso of datos.permisos ?? []) {
      await cliente.query("insert into usuario_permiso (usuario_id, permiso) values ($1, $2)", [id, permiso]);
    }
  } finally {
    await cliente.end();
  }
}

/** Una consulta directa a la base de pruebas, para preparar datos o comprobar lo que quedó guardado. */
export async function consultar<T extends pg.QueryResultRow>(sql: string, valores: unknown[] = []): Promise<T[]> {
  const base = new pg.Client({ connectionString: URL_BASE_E2E });
  await base.connect();
  try {
    return (await base.query<T>(sql, valores)).rows;
  } finally {
    await base.end();
  }
}

/**
 * Una orden lista, directo en la base, con un pulido y nano cerámico (genera mantenimiento al entregarse) del precio
 * dado y, si se pagó algo, el adelanto. `dias` la pone lejos de hoy, en días propios de cada prueba y proyecto, para
 * que no se mezcle con las de otras pruebas en la Agenda. Devuelve su id.
 */
export async function crearOrdenLista(datos: { placa: string; dias: number; precio: number; pagado: number; servicio?: string }): Promise<number> {
  const [{ id }] = await consultar<{ id: number }>(
    `insert into trabajo (sucursal_id, cliente_id, vehiculo_id, fecha_inicio, fecha_fin, estado, recibido_at, listo_at, created_by)
     select s.id, v.cliente_id, v.id, (now() at time zone 'America/La_Paz')::date + $2::int, (now() at time zone 'America/La_Paz')::date + $2::int, 'listo', now(), now(), v.created_by
     from vehiculo v, (select id from sucursal order by id limit 1) s where v.placa = $1 returning id`,
    [datos.placa, datos.dias],
  );
  await consultar(
    `insert into trabajo_linea (trabajo_id, variante_id, descripcion, precio, orden)
     select $1, v.id, s.nombre, $2, 0 from variante v join servicio s on s.id = v.servicio_id
     where s.slug = $3 order by v.id limit 1`,
    [id, datos.precio, datos.servicio ?? "pulido-y-nano-ceramico"],
  );
  if (datos.pagado > 0) {
    await consultar("insert into pago (trabajo_id, monto, metodo, tipo, fecha, created_by) select $1, $2, 'qr', 'saldo', (now() at time zone 'America/La_Paz')::date, created_by from trabajo where id = $1", [
      id,
      datos.pagado,
    ]);
  }
  return id;
}

/** Toca el botón que abre WhatsApp y devuelve la dirección que abrió, ya decodificada. WhatsApp lo responde la prueba. */
export async function abrirWhatsApp(page: Page, boton: Locator): Promise<string> {
  await page.context().route("https://wa.me/**", (ruta) => ruta.fulfill({ body: "WhatsApp" }));
  const nueva = page.context().waitForEvent("page");
  await boton.click();
  const whatsapp = await nueva;
  await whatsapp.waitForLoadState();
  const enlace = decodeURIComponent(whatsapp.url());
  await whatsapp.close();
  return enlace;
}

export async function ingresar(page: Page, usuario: string, contrasena: string) {
  await page.goto("/ingresar");
  await page.getByLabel("Usuario").fill(usuario);
  await page.getByLabel("Contraseña", { exact: true }).fill(contrasena);
  await page.getByRole("button", { name: "Ingresar" }).click();
}

/** Los archivos que se arrastran sobre una zona de foto: se pasa en `dispatchEvent` a dragenter y drop (pulido 13.13). */
export function archivosArrastrados(page: Page, archivos: { name: string; mimeType: string; buffer: Buffer }[]) {
  const lista = archivos.map((a) => ({ nombre: a.name, tipo: a.mimeType, base64: a.buffer.toString("base64") }));
  return page.evaluateHandle((entrada) => {
    const datos = new DataTransfer();
    for (const a of entrada) datos.items.add(new File([Uint8Array.from(atob(a.base64), (c) => c.charCodeAt(0))], a.nombre, { type: a.tipo }));
    return datos;
  }, lista);
}

/** Mensaje de error del formulario (Next.js agrega otro role="alert" para anunciar rutas). */
export function alertaDeIngreso(page: Page) {
  return page.locator("form").getByRole("alert");
}

/**
 * Una opción del menú de quien entró (19/11): abajo de la barra lateral o, en el celular, dentro del menú. El círculo
 * con la inicial abre el manual del panel y "Cerrar sesión".
 */
export async function opcionDeCuenta(page: Page, opcion: "Cerrar sesión" | "Manual del panel") {
  const cuenta = page.getByRole("button", { name: /^Tu cuenta:/ }).filter({ visible: true });
  // En la computadora está a la vista; en el celular, dentro del menú. Se espera a que aparezca uno de los dos
  const abrirMenu = page.getByRole("button", { name: "Abrir menú" }).filter({ visible: true });
  await expect(cuenta.or(abrirMenu).first()).toBeVisible();
  if ((await cuenta.count()) === 0) await abrirMenu.click();
  await cuenta.first().click();
  await page.getByRole("menuitem", { name: opcion }).click();
}

export async function ingresarComoDueno(page: Page) {
  await ingresar(page, DUENO.usuario, DUENO.contrasena);
  await expect(page).toHaveURL(/\/panel$/);
}

/** Crea un cliente (y, si se pasa la placa, su vehículo) directo en la base de pruebas. Devuelve su id. */
export async function crearClienteEnBase(datos: { nombre: string; telefono: string; placa?: string; activo?: boolean }): Promise<number> {
  const cliente = new pg.Client({ connectionString: URL_BASE_E2E });
  await cliente.connect();
  try {
    const { rows: autor } = await cliente.query<{ id: number }>("select id from usuario where nombre_usuario = 'dueno'");
    const { rows } = await cliente.query<{ id: number }>(
      "insert into cliente (nombre, telefono, activo, created_by) values ($1, $2, $3, $4) returning id",
      [datos.nombre, datos.telefono, datos.activo ?? true, autor[0].id],
    );
    if (datos.placa) {
      await cliente.query(
        "insert into vehiculo (cliente_id, placa, tamano_id, created_by) values ($1, $2, (select id from tamano_vehiculo order by orden limit 1), $3)",
        [rows[0].id, datos.placa, autor[0].id],
      );
    }
    return rows[0].id;
  } finally {
    await cliente.end();
  }
}

/**
 * Una cotización (pedido 23) del vehículo con esa placa, directo en la base y sin PDF: para las listas y los estados.
 * El encabezado lleva el estado y su último movimiento hace `dias` días; la versión 1, el total. Devuelve su id.
 */
export async function crearCotizacionEnBase(datos: {
  placa: string;
  numero: string;
  total?: number;
  dias?: number;
  estado?: "cotizado" | "confirmado" | "perdido";
}): Promise<number> {
  const estado = datos.estado ?? "cotizado";
  const [{ id }] = await consultar<{ id: number }>(
    `with q as (
       insert into consulta (cliente_id, vehiculo_id, estado, motivo_perdida, ultimo_movimiento_at, created_by)
       select v.cliente_id, v.id, $2, case when $2 = 'perdido' then 'precio' end, now() - make_interval(days => $3::int), v.created_by
       from vehiculo v where v.placa = $1 returning id, created_by
     )
     insert into cotizacion (consulta_id, numero, version, es_estimado, subtotal, descuento, total, adelanto_sugerido, valida_hasta,
       condiciones, garantia, formas_pago, estado, datos_documento, created_by)
     select q.id, $4, 1, false, $5::numeric, 0, $5::numeric, 0, (now() at time zone 'America/La_Paz')::date + 15, 'c', 'g', 'f', case when $2 = 'confirmado' then 'aceptada' else 'enviada' end,
       '{}'::jsonb, q.created_by from q returning consulta_id as id`,
    [datos.placa, estado, datos.dias ?? 0, datos.numero, datos.total ?? 500],
  );
  return id;
}

/**
 * Cotiza por la pantalla a un cliente registrado con un solo vehículo (así se genera su PDF): un servicio de una sola
 * opción, con su precio sugerido. Devuelve el id de la cotización.
 */
export async function cotizarEnPantalla(page: Page, clienteId: number, servicio: string, modo: "En persona" | "Por fotos" = "En persona"): Promise<number> {
  await page.goto(`/panel/cotizaciones/nueva?cliente=${clienteId}`, { waitUntil: "networkidle" });
  // Pedido 40: empieza en el vehículo, con el suyo ya marcado
  await page.getByRole("button", { name: "Siguiente: servicios" }).click();
  // La primera fila de servicio ya está para elegir (pulido final del 09/11)
  await page.getByLabel("Servicio 1", { exact: true }).selectOption({ label: servicio });
  await page.getByRole("radio", { name: new RegExp(`^${modo}`) }).check();
  await page.getByRole("button", { name: "Crear cotización" }).click();
  await expect(page).toHaveURL(/\/panel\/cotizaciones\/\d+\?creada=1(?:[?&]volver=[^&#]*)?$/);
  return Number(new URL(page.url()).pathname.split("/").at(-1));
}

/**
 * Marca "bien" en la base todas las partes del checklist (pedido 12) que la reserva todavía no tiene revisadas: para las
 * pruebas que reciben un vehículo sin probar el checklist. Llamarla justo antes de "Recibir vehículo".
 */
export async function revisarChecklistEnBase(trabajoId: number) {
  await consultar(
    `insert into trabajo_revision (trabajo_id, parte_id, parte, estado, created_by)
     select $1, p.id, p.nombre, 'bien', (select created_by from trabajo where id = $1) from parte_revision p
     on conflict (trabajo_id, parte_id) do nothing`,
    [trabajoId],
  );
}

/** Firma con el mouse en el recuadro de "Entregar vehículo" (pedido 13); espera a que la firma esté lista. */
export async function firmarEnRecuadro(page: Page) {
  const recuadro = page.getByRole("img", { name: "Recuadro para la firma del cliente" });
  // Una ventana que se está cerrando (la de "Registrar pago") taparía el recuadro y el trazo no llegaría
  await expect(page.getByRole("dialog")).toHaveCount(0);
  // El mouse firma donde está el recuadro en la pantalla: primero, al centro de la vista (lejos del pie fijo del celular)
  await recuadro.evaluate((e) => e.scrollIntoView({ block: "center" }));
  const caja = (await recuadro.boundingBox())!;
  const y = caja.y + caja.height / 2;
  await page.mouse.move(caja.x + 20, y);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(caja.x + 20 + i * 15, y + (i % 2 ? 25 : -25));
  await page.mouse.up();
  await expect(page.getByRole("button", { name: "Borrar firma" })).toBeEnabled();
}

/** Marca "El cliente no puede firmar" con un motivo (pedido 13): para las pruebas que entregan sin probar la firma. */
export async function entregarSinFirma(page: Page, motivo = "Prueba: retira otra persona.") {
  const form = page.getByRole("form", { name: "Entregar vehículo" });
  await form.getByText("El cliente no puede firmar", { exact: true }).click();
  await form.getByLabel("Motivo").fill(motivo);
  await expect(form.getByLabel("Motivo")).toHaveValue(motivo);
}

/**
 * El modal "Nuevo servicio" de la lista del catálogo, abierto (el botón se habilita al cargar la página), con la
 * duración ya escrita (2 días, hallazgo 2): las pruebas escriben el nombre y crean.
 */
export async function abrirNuevoServicio(page: Page): Promise<Locator> {
  await page.goto("/panel/catalogo", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Nuevo servicio" }).click();
  const modal = page.getByRole("dialog", { name: "Nuevo servicio" });
  await modal.getByLabel("Duración estimada").fill("2");
  return modal;
}

/**
 * Crea un servicio como lo hace el dueño: en el catálogo (nace oculto) y después su página en el sitio, con el resumen y
 * visible. Devuelve su id y la dirección de su página. Para las pruebas que necesitan un servicio propio en el sitio.
 */
export async function crearServicioPublicado(page: Page, nombre: string, resumen = "Servicio de prueba."): Promise<{ id: string; slug: string }> {
  const nuevo = await abrirNuevoServicio(page);
  await nuevo.getByLabel("Nombre del servicio").fill(nombre);
  await nuevo.getByRole("button", { name: "Crear servicio" }).click();
  await expect(page).toHaveURL(/\/panel\/catalogo\/\d+\?creado=1(?:[?&]volver=[^&#]*)?$/);
  const id = page.url().match(/catalogo\/(\d+)/)![1];
  await page.goto(`/panel/sitio/servicios/${id}`);
  await page.getByRole("button", { name: "Editar resumen" }).click();
  const modal = page.getByRole("dialog", { name: "Resumen" });
  await modal.getByLabel("Resumen").fill(resumen);
  await modal.getByRole("button", { name: "Guardar resumen" }).click();
  await expect(modal).toHaveCount(0);
  await mostrarServicio(page, true);
  const enlace = await page.getByRole("link", { name: "Ver en el sitio" }).getAttribute("href");
  return { id, slug: enlace!.replace("/servicios/", "") };
}

/** Desde la ficha de un servicio del sitio: "Más" > mostrar u ocultar (pulido 13.19). */
/**
 * Cierra los avisos que quedan a la vista: en el celular van arriba, sobre el encabezado, y pueden tapar el menú "Más"
 * de una ficha (26/11: hu-07 en el CI, "Mostrar en el sitio" debajo del aviso de lo recién guardado).
 */
export async function cerrarAvisos(page: Page): Promise<void> {
  const avisos = page.locator("[data-sonner-toast]");
  // Su X, con el teclado (con el mouse aparece al pasar por encima): uno por vez, el de adelante
  for (let vuelta = 0; vuelta < 5 && (await avisos.count()) > 0; vuelta++) {
    const cerrar = avisos.first().getByRole("button", { name: "Cerrar el aviso" });
    await cerrar.focus();
    await page.keyboard.press("Enter");
    await expect(avisos).toHaveCount(0, { timeout: 2000 }).catch(() => {});
  }
  await expect(avisos).toHaveCount(0);
}

export async function mostrarServicio(page: Page, mostrar: boolean): Promise<void> {
  await cerrarAvisos(page);
  await page.getByRole("button", { name: "Más" }).click();
  await page.getByRole("menuitem", { name: mostrar ? "Mostrar en el sitio" : "Ocultar del sitio" }).click();
  await expect(page.getByText(mostrar ? "En el sitio" : "Oculto", { exact: true })).toBeVisible();
}

/**
 * Configuración > Negocio (pulido 13.26): abre el modal de una parte ("Contacto", "Ubicación", "Horario de atención",
 * "Redes sociales", "Datos para facturar") desde su "Editar". Devuelve el modal, para llenarlo y guardarlo.
 */
export async function abrirParteNegocio(page: Page, parte: string): Promise<Locator> {
  await page.getByRole("button", { name: `Editar ${parte.toLowerCase()}` }).click();
  const modal = page.getByRole("dialog", { name: parte });
  await expect(modal).toBeVisible();
  return modal;
}

/** Cuánto se espera a que un modal pregunte o se cierre con la máquina cargada (cancelarConCambios). */
const ESPERA_MODAL = 15_000;

/**
 * Cierra un modal con cambios sin guardar como un cierre sin querer (un toque afuera, sobre el fondo oscuro): el pie
 * pregunta y se descartan (C6, pulido 13.48). "Cancelar" pregunta igual (hallazgo 7). No con Escape: un campo de hora se lo
 * queda.
 */
export async function cancelarConCambios(page: Page, modal: Locator): Promise<void> {
  await page.mouse.click(8, 8);
  // Si la prueba escribió antes de que el modal tomara lo que tenía al abrirse (con la máquina cargada), no hay cambio
  // que preguntar y ya se cerró; si no, pregunta y se descarta
  // Con la máquina cargada (la suite entera, o el CI) el modal puede tardar más de 5 s en preguntar o en cerrarse: falló
  // así en hu-04, hu-05 y hu-40 (14/11 y 19/11), y solas pasaban. Más margen aquí, no en cada prueba
  const descartar = modal.getByRole("button", { name: "Descartar cambios" });
  await expect(descartar.or(page.locator("body:not(:has([data-slot=dialog-content]:not([data-closed])))"))).toBeVisible({ timeout: ESPERA_MODAL });
  if (await descartar.isVisible()) await descartar.click();
  await expect(modal).toHaveCount(0, { timeout: ESPERA_MODAL });
}

/**
 * Un enlace con o sin la pantalla de origen (pedido 43, `?volver=`): para comprobar a dónde lleva sin depender de por
 * dónde se entró.
 */
export function conVolver(href: string): RegExp {
  const exacto = href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${exacto}(?:[?&]volver=[^&#]*)?$`);
}

/**
 * La lista "Por reservar" de la Agenda, abierta: desde el lavado de cara (16/11) va plegada en una fila
 * ("N cotizaciones por reservar") para no empujar el tablero hacia abajo.
 */
export async function verPorReservar(page: Page): Promise<Locator> {
  const fila = page.getByText(/^Cotizaci(ón|ones) por reservar$/).filter({ visible: true });
  await expect(fila).toBeVisible();
  // Al volver a la Agenda puede seguir abierta (la pantalla anterior queda guardada): tocarla la cerraría
  const abierta = await page.locator("details").filter({ has: fila }).evaluate((d) => (d as HTMLDetailsElement).open);
  if (!abierta) await fila.click();
  const lista = page.getByRole("list", { name: "Por reservar" });
  await expect(lista).toBeVisible();
  return lista;
}

/**
 * Las filas de "Por reservar" con un texto, con la lista abierta (plegada no se ven y la cuenta daría 0 siempre). Sin
 * ninguna por reservar, la fila no está: el localizador no encuentra nada.
 */
export async function enPorReservar(page: Page, texto: string): Promise<Locator> {
  await page.getByRole("heading", { level: 1, name: "Agenda" }).waitFor();
  await page.waitForLoadState("networkidle");
  const hay = await page.getByText(/^Cotizaci(ón|ones) por reservar$/).filter({ visible: true }).count();
  if (hay > 0) await verPorReservar(page);
  return page.getByRole("list", { name: "Por reservar" }).getByRole("link").filter({ hasText: texto });
}

/** Nueva reserva (20/11): de la fecha al paso del adelanto. */
export async function alAdelanto(page: Page) {
  await page.getByRole("button", { name: "Siguiente: adelanto" }).click();
  await expect(page.getByRole("radiogroup", { name: "¿Dejó adelanto?" })).toBeVisible();
}

/** Nueva reserva (20/11): pasa al adelanto y responde "No, sin adelanto". */
export async function sinAdelantoEnReserva(page: Page) {
  await alAdelanto(page);
  await page.getByRole("radio", { name: "No, sin adelanto" }).click();
}

/**
 * Elige de una lista de un flujo de pasos (24/11: "elegir y confirmar"): marca la tarjeta y toca "Siguiente". Para el
 * cliente y el vehículo de Nueva reserva y Nueva cotización, y el nuevo dueño de un vehículo.
 */
export async function elegirEnLista(page: Page, etiqueta: "Elegir cliente" | "Elegir vehículo", opcion: string | RegExp) {
  await page.getByRole("radiogroup", { name: etiqueta }).getByRole("radio", { name: opcion }).click();
  await page.getByRole("button", { name: /^Siguiente/ }).filter({ visible: true }).click();
}

/** Marca "Cliente nuevo" u "Otro vehículo" (24/11): sus campos se abren ahí mismo, dentro de su tarjeta. */
export async function marcarNuevo(page: Page, etiqueta: "Elegir cliente" | "Elegir vehículo") {
  await page.getByRole("radiogroup", { name: etiqueta }).getByRole("radio", { name: etiqueta === "Elegir cliente" ? /^Cliente nuevo/ : /^Otro vehículo/ }).click();
}
