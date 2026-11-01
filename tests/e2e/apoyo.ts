import { expect, type Locator, type Page } from "@playwright/test";
import { hashPassword } from "better-auth/crypto";
import pg from "pg";

// Datos y ayudas compartidas por las pruebas de punta a punta.

const URL_BASE_E2E = "postgres://toctar:toctar@localhost:5432/toctar_e2e";

/** PNG de 1 × 1 píxel, para las pruebas que suben fotos. */
export const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");

export const DUENO = { usuario: "dueno", nombre: "Dueño de prueba", contrasena: "dueno-e2e-123" };

/** Crea (o reemplaza) un usuario directo en la base de pruebas. */
export async function crearUsuario(datos: {
  usuario: string;
  nombre: string;
  contrasena: string;
  rol: "dueno" | "encargado" | "tecnico";
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
 * que los espacios del taller no choquen con otras pruebas. Devuelve su id.
 */
export async function crearOrdenLista(datos: { placa: string; espacio: number; dias: number; precio: number; pagado: number; servicio?: string }): Promise<number> {
  const [{ id }] = await consultar<{ id: number }>(
    `insert into trabajo (sucursal_id, cliente_id, vehiculo_id, espacio_id, fecha_inicio, fecha_fin, estado, recibido_at, listo_at, created_by)
     select e.sucursal_id, v.cliente_id, v.id, e.id, current_date + $3::int, current_date + $3::int, 'listo', now(), now(), v.created_by
     from vehiculo v, (select * from espacio_taller where activo order by orden offset $2 limit 1) e where v.placa = $1 returning id`,
    [datos.placa, datos.espacio, datos.dias],
  );
  await consultar(
    `insert into trabajo_linea (trabajo_id, variante_id, descripcion, precio, orden)
     select $1, v.id, s.nombre, $2, 0 from variante v join servicio s on s.id = v.servicio_id
     where s.slug = $3 order by v.id limit 1`,
    [id, datos.precio, datos.servicio ?? "pulido-y-nano-ceramico"],
  );
  if (datos.pagado > 0) {
    await consultar("insert into pago (trabajo_id, monto, metodo, tipo, fecha, created_by) select $1, $2, 'qr', 'adelanto', current_date, created_by from trabajo where id = $1", [
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

/** Mensaje de error del formulario (Next.js agrega otro role="alert" para anunciar rutas). */
export function alertaDeIngreso(page: Page) {
  return page.locator("form").getByRole("alert");
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
     select q.id, $4, 1, false, $5::numeric, 0, $5::numeric, 0, current_date + 15, 'c', 'g', 'f', case when $2 = 'confirmado' then 'aceptada' else 'enviada' end,
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
  await page.getByRole("button", { name: "Agregar servicio" }).click();
  await page.getByLabel("Servicio 1", { exact: true }).selectOption({ label: servicio });
  await page.getByRole("radio", { name: new RegExp(`^${modo}`) }).check();
  await page.getByRole("button", { name: "Crear cotización" }).click();
  await expect(page).toHaveURL(/\/panel\/cotizaciones\/\d+\?creada=1$/);
  return Number(new URL(page.url()).pathname.split("/").at(-1));
}

/** El modal "Nuevo servicio" de la lista del catálogo, abierto (el botón se habilita al cargar la página). */
export async function abrirNuevoServicio(page: Page): Promise<Locator> {
  await page.goto("/panel/catalogo", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Agregar servicio" }).click();
  return page.getByRole("dialog", { name: "Nuevo servicio" });
}

/**
 * Crea un servicio como lo hace el dueño: en el catálogo (nace oculto) y después su página en el sitio, con el resumen y
 * visible. Devuelve su id y la dirección de su página. Para las pruebas que necesitan un servicio propio en el sitio.
 */
export async function crearServicioPublicado(page: Page, nombre: string, resumen = "Servicio de prueba."): Promise<{ id: string; slug: string }> {
  const nuevo = await abrirNuevoServicio(page);
  await nuevo.getByLabel("Nombre del servicio").fill(nombre);
  await nuevo.getByRole("button", { name: "Crear servicio" }).click();
  await expect(page).toHaveURL(/\/panel\/catalogo\/\d+\?creado=1$/);
  const id = page.url().match(/catalogo\/(\d+)/)![1];
  await page.goto(`/panel/sitio/servicios/${id}`);
  await page.getByLabel("Resumen").fill(resumen);
  await page.getByRole("checkbox", { name: /Mostrar en el sitio/ }).check();
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Cambios guardados.")).toBeVisible();
  return { id, slug: await page.getByLabel("Dirección de la página").inputValue() };
}
