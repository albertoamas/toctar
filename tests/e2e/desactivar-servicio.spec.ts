import { expect, test, type TestInfo } from "@playwright/test";
import { abrirNuevoServicio, consultar, crearClienteEnBase, ingresarComoDueno } from "./apoyo";

// Hallazgo 1 de la prueba en celulares (15/11): desactivar un servicio va en "Más", con confirmación. No se desactiva
// si hay vehículos con su mantenimiento de ese servicio pendiente: inactivo, no se podrían reservar.

const telefono = (info: TestInfo) => `5917${info.project.name === "celular" ? 7 : 8}56${info.retry}010`;

test("con mantenimientos pendientes de ese servicio, no se desactiva; cerrados, sí", async ({ page }, info) => {
  const s = `${info.project.name === "celular" ? "C" : "E"}${info.retry}`;
  const nombre = `Desactivar con pendientes ${s}`;
  const placa = `DS${s}1`;
  await crearClienteEnBase({ nombre: `Cliente ${nombre}`, telefono: telefono(info), placa });
  await ingresarComoDueno(page);
  const nuevo = await abrirNuevoServicio(page);
  await nuevo.getByLabel("Nombre del servicio").fill(nombre);
  await nuevo.getByRole("button", { name: "Crear servicio" }).click();
  await page.getByRole("dialog", { name: `Precios de ${nombre}` }).getByRole("button", { name: "Cancelar" }).click();
  const id = Number(page.url().match(/catalogo\/(\d+)/)![1]);
  // Un vehículo con su mantenimiento de este servicio pendiente
  const [{ r }] = await consultar<{ r: number }>(
    `with t as (
       insert into trabajo (sucursal_id, cliente_id, vehiculo_id, espacio_id, fecha_inicio, fecha_fin, estado, recibido_at, listo_at, entregado_at, created_by)
       select e.sucursal_id, v.cliente_id, v.id, e.id, current_date - 100, current_date - 100, 'entregado', now(), now(), now() - interval '100 days', v.created_by
       from vehiculo v, (select * from espacio_taller where activo order by orden limit 1) e where v.placa = $1 returning id, cliente_id, vehiculo_id
     )
     insert into recordatorio_mantenimiento (trabajo_origen_id, cliente_id, vehiculo_id, servicio_id, servicio_mantenimiento_id, intervalo_meses, fecha_programada)
     select t.id, t.cliente_id, t.vehiculo_id, $2, $2, 3, current_date + 10 from t returning id as r`,
    [placa, id],
  );

  const desactivar = async () => {
    await page.getByRole("main").getByRole("button", { name: "Más" }).click();
    await page.getByRole("menuitem", { name: "Desactivar servicio" }).click();
    await page.getByRole("dialog", { name: `¿Desactivar ${nombre}?` }).getByRole("button", { name: "Sí, desactivar" }).click();
  };
  await desactivar();
  await expect(page.getByText("Un vehículo tiene su mantenimiento de este servicio pendiente: ciérralo o resérvalo en Mantenimientos primero.")).toBeVisible();
  expect((await consultar<{ activo: boolean }>("select activo from servicio where id = $1", [id]))[0].activo).toBe(true);

  // Cerrado, ya se puede
  await consultar("update recordatorio_mantenimiento set estado = 'no_interesado' where id = $1", [r]);
  await page.getByRole("dialog", { name: `¿Desactivar ${nombre}?` }).getByRole("button", { name: "Cancelar" }).click();
  await desactivar();
  await expect(page.getByText(`${nombre} desactivado.`)).toBeVisible();
  await expect(page.getByRole("button", { name: "Reactivar servicio" })).toBeVisible();
});
