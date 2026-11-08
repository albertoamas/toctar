import { expect, test, type TestInfo } from "@playwright/test";
import { consultar, crearClienteEnBase, ingresarComoDueno } from "./apoyo";

// HU-31 Reprogramar o cancelar. Especificación: docs/08-desarrollo/etapas/C3-agenda-pagos.md §9.
// Cada proyecto usa sus propios días, lejos de hoy. En serie: las del dueño entran con el mismo usuario y, a la vez,
// chocaban con el límite de intentos de ingreso (RNF-04).
test.describe.configure({ mode: "serial" });

// Con el número de reintento: uno nuevo no choca con los clientes y placas que dejó el intento anterior
const sufijo = (info: TestInfo) => `${info.project.name === "celular" ? "C" : "E"}${info.retry || ""}`;
const telefono = (info: TestInfo, n: number) => `5917${info.project.name === "celular" ? 5 : 6}31${info.retry}0${n}0`;

/** Un día propio: dentro de 240 (celular) o 290 (escritorio) días, más un desplazamiento (se agenda hasta un año adelante). */
async function dia(info: TestInfo, mas: number): Promise<string> {
  const [{ d }] = await consultar<{ d: string }>("select to_char(current_date + $1::int, 'YYYY-MM-DD') as d", [(info.project.name === "celular" ? 240 : 290) + mas]);
  return d;
}

/** Una reserva agendada en la base, en el espacio de ese orden (0 = el primero). Devuelve su id. */
async function reserva(placa: string, espacio: number, desde: string, hasta: string, extra: { consultaId?: number; cotizacionId?: number } = {}): Promise<number> {
  const [{ id }] = await consultar<{ id: number }>(
    `insert into trabajo (sucursal_id, cliente_id, vehiculo_id, espacio_id, fecha_inicio, fecha_fin, consulta_id, cotizacion_id, created_by)
     select e.sucursal_id, v.cliente_id, v.id, e.id, $3::date, $4::date, $5, $6, v.created_by
     from vehiculo v, (select * from espacio_taller where activo order by orden offset $2 limit 1) e where v.placa = $1 returning id`,
    [placa, espacio, desde, hasta, extra.consultaId ?? null, extra.cotizacionId ?? null],
  );
  return id;
}

test("reprogramar solo ofrece espacios libres en las nuevas fechas y mueve la reserva", async ({ page }, info) => {
  const s = sufijo(info);
  await crearClienteEnBase({ nombre: `Mover ${s}`, telefono: telefono(info, 1), placa: `MV31${s}1` });
  await crearClienteEnBase({ nombre: `Ocupa ${s}`, telefono: telefono(info, 2), placa: `MV31${s}2` });
  const [d0, d10] = [await dia(info, 0), await dia(info, 10)];
  const id = await reserva(`MV31${s}1`, 0, d0, d0);
  // En la nueva fecha, el segundo espacio está ocupado
  await reserva(`MV31${s}2`, 1, d10, d10);
  const espacios = await consultar<{ id: number; nombre: string }>("select id, nombre from espacio_taller where activo order by orden");

  await ingresarComoDueno(page);
  await page.goto(`/panel/agenda/${id}`);
  // Desde "Más" (pulido 10.3)
  await page.getByRole("button", { name: "Más" }).click();
  await page.getByRole("menuitem", { name: "Reprogramar" }).click();
  const form = page.getByRole("form", { name: "Reprogramar" });
  await form.getByLabel("Ingresa el").fill(d10);
  await form.getByLabel("Entrega aproximada").fill(d10);
  const espacio = form.getByLabel("Espacio", { exact: true });
  await expect(espacio.locator("option")).toHaveText(["Elige el espacio", ...espacios.filter((_, i) => i !== 1).map((e) => e.nombre)]);
  await espacio.selectOption({ label: espacios[2]?.nombre ?? espacios[0].nombre });
  await form.getByRole("button", { name: "Mover reserva" }).click();
  await expect(page.getByText(/^Reserva movida al/)).toBeVisible();

  const [movida] = await consultar<{ inicio: string; espacio: number }>("select to_char(fecha_inicio, 'YYYY-MM-DD') as inicio, espacio_id as espacio from trabajo where id = $1", [id]);
  expect(movida).toEqual({ inicio: d10, espacio: (espacios[2] ?? espacios[0]).id });
  const [auditoria] = await consultar<{ accion: string }>("select accion from auditoria where entidad = 'trabajo' and entidad_id = $1", [id]);
  expect(auditoria.accion).toBe("reprogramar");
});

test("cancelar pide motivo, deja los pagos, libera el espacio y la consulta pasa a perdida con la cotización vigente", async ({ page }, info) => {
  const s = sufijo(info);
  await crearClienteEnBase({ nombre: `Cancela ${s}`, telefono: telefono(info, 3), placa: `CA31${s}3` });
  const d20 = await dia(info, 20);
  // Una cotización aceptada (su versión también) y la reserva con 150 Bs de adelanto
  const [c] = await consultar<{ consulta: number; cotizacion: number }>(
    `with q as (
       insert into consulta (cliente_id, vehiculo_id, estado, created_by)
       select v.cliente_id, v.id, 'confirmado', v.created_by from vehiculo v where v.placa = $1 returning id, created_by
     ), c as (
       insert into cotizacion (consulta_id, numero, version, es_estimado, subtotal, descuento, total, adelanto_sugerido, valida_hasta,
         condiciones, garantia, formas_pago, estado, datos_documento, created_by)
       select q.id, '2031-' || $2, 1, false, 500, 0, 500, 150, current_date + 15, 'c', 'g', 'f', 'aceptada', '{}'::jsonb, q.created_by from q returning id
     ), l as (
       insert into cotizacion_linea (cotizacion_id, variante_id, tamano_id, descripcion, precio, orden)
       select c.id, (select id from variante order by id limit 1), (select id from tamano_vehiculo order by id limit 1), 'Lavado', 500, 0 from c
     )
     select (select id from q) as consulta, (select id from c) as cotizacion`,
    [`CA31${s}3`, `${info.project.name === "celular" ? 1 : 2}${info.retry}00`],
  );
  const id = await reserva(`CA31${s}3`, 0, d20, d20, { consultaId: c.consulta, cotizacionId: c.cotizacion });
  await consultar("insert into pago (trabajo_id, monto, metodo, tipo, fecha, created_by) select $1, 150, 'efectivo', 'adelanto', current_date, created_by from trabajo where id = $1", [id]);

  await ingresarComoDueno(page);
  await page.goto(`/panel/agenda/${id}`);
  // Desde "Más" (pulido 10.3)
  await page.getByRole("button", { name: "Más" }).click();
  await page.getByRole("menuitem", { name: "Cancelar reserva" }).click();
  const form = page.getByRole("form", { name: "Cancelar reserva" });
  await expect(form.getByText("El adelanto no se devuelve: 150 Bs quedan como ingreso.")).toBeVisible();
  await form.getByRole("button", { name: "Cancelar reserva" }).click();
  await expect(form.getByText("Escribe el motivo.")).toBeVisible();
  await expect(form.getByLabel("Motivo")).toBeFocused();
  await form.getByLabel("Motivo").fill("El cliente viajó");
  await form.getByRole("button", { name: "Cancelar reserva" }).click();
  await expect(page.getByText(/^Reserva cancelada\./)).toBeVisible();
  await expect(page.getByText("Cancelada:", { exact: false })).toBeVisible();
  // Sin "Más": ya no se reprograma ni se cancela
  await expect(page.getByRole("button", { name: "Más" })).toHaveCount(0);

  const [r] = await consultar<{ estado: string; pagos: number; consulta: string; detalle: string; cotizacion: string }>(
    `select t.estado, (select count(*)::int from pago p where p.trabajo_id = t.id and not p.anulado) as pagos,
       q.estado as consulta, q.detalle_perdida as detalle, c.estado as cotizacion
     from trabajo t join consulta q on q.id = t.consulta_id join cotizacion c on c.id = t.cotizacion_id where t.id = $1`,
    [id],
  );
  expect(r).toEqual({ estado: "cancelado", pagos: 1, consulta: "perdido", detalle: "Reserva cancelada: El cliente viajó", cotizacion: "enviada" });
  // El espacio quedó libre esos días: otra reserva entra
  await crearClienteEnBase({ nombre: `Toma el lugar ${s}`, telefono: telefono(info, 4), placa: `CA31${s}4` });
  await reserva(`CA31${s}4`, 0, d20, d20);

  // Si el cliente vuelve: la cotización vuelve a pendiente y se agenda otra vez (la cancelada no cuenta)
  await page.goto(`/panel/cotizaciones/${c.consulta}`);
  await page.getByRole("button", { name: "Más" }).click();
  await page.getByRole("menuitem", { name: "Volver a pendiente" }).click();
  await page.getByRole("button", { name: "Sí, volver a pendiente" }).click();
  await expect(page.getByText("La cotización volvió a pendiente.")).toBeVisible();
  await page.getByRole("button", { name: "Aceptó", exact: true }).click();
  await page.getByRole("link", { name: "Reservar en Agenda" }).click();
  const d30 = await dia(info, 30);
  await page.getByLabel("Ingresa el").fill(d30);
  await page.getByLabel("Entrega aproximada").fill(d30);
  const espacio = page.getByLabel("Espacio", { exact: true });
  await expect(espacio.locator("option")).not.toHaveCount(1);
  await espacio.selectOption({ index: 1 });
  await page.getByText("Sin adelanto", { exact: true }).click();
  await page.getByRole("button", { name: "Reservar" }).click();
  await expect(page).toHaveURL(/\/panel\/agenda\/\d+\?agendada=1$/);
  const [otra] = await consultar<{ reservas: number; cotizacion: string }>(
    "select count(*)::int as reservas, (select estado from cotizacion where id = $1) as cotizacion from trabajo where cotizacion_id = $1",
    [c.cotizacion],
  );
  expect(otra).toEqual({ reservas: 2, cotizacion: "aceptada" });
});
