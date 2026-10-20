import { expect, type Page } from "@playwright/test";
import { hashPassword } from "better-auth/crypto";
import pg from "pg";

// Datos y ayudas compartidas por las pruebas de punta a punta.

export const URL_BASE_E2E = "postgres://toctar:toctar@localhost:5432/toctar_e2e";

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
