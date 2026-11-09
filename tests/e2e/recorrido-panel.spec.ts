import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { consultar, crearClienteEnBase, crearCotizacionEnBase, crearUsuario, ingresar, ingresarComoDueno, PERFIL_TALLER } from "./apoyo";

// C6, fase 5 (docs/08-desarrollo/etapas/C6-consistencia-del-panel.md §9): el recorrido final por las pantallas del panel en
// 360, 390, 768 y 1366 px, con el dueño, con un encargado con todos los permisos y con uno con el perfil Taller. En cada
// una: que cargue, que tenga un solo título y que nada se salga de la pantalla. Las capturas de 390 y 1366 px quedan
// como archivos del CI ("recorrido-panel", en test-results) para revisarlas a ojo: no se comparan píxel por píxel (Windows
// y Linux dibujan distinto). Solo en el proyecto escritorio: el tamaño lo pone la prueba.

const ANCHOS = [
  { ancho: 360, alto: 740 },
  { ancho: 390, alto: 844 },
  { ancho: 768, alto: 1024 },
  { ancho: 1366, alto: 800 },
];

type Ids = { cliente: number; vehiculo: number; cotizacion: number; reserva: number; orden: number; reclamo: number; servicio: number; usuario: number };

/** Los datos del recorrido, propios de cada intento: un cliente con su vehículo, una cotización, una reserva de hoy, una orden lista, un reclamo y un usuario. */
async function prepararDatos(info: TestInfo, rol: string): Promise<Ids> {
  const n = `${rol}${info.retry}${Math.floor(Math.random() * 1e4)}`;
  const placa = `R${Math.floor(100 + Math.random() * 899)}${rol.slice(0, 2).toUpperCase()}${info.retry}`;
  const cliente = await crearClienteEnBase({ nombre: `Recorrido ${n}`, telefono: `5917${Math.floor(1e6 + Math.random() * 8e6)}`, placa });
  const [{ vehiculo }] = await consultar<{ vehiculo: number }>("select id as vehiculo from vehiculo where placa = $1", [placa]);
  const cotizacion = await crearCotizacionEnBase({ placa, numero: `REC-${n}` });
  // Un espacio propio y desactivado: las tres pruebas corren a la vez con trabajos de hoy, y las demás cuentan los activos
  const [{ espacio }] = await consultar<{ espacio: number }>(
    "insert into espacio_taller (sucursal_id, nombre, orden, activo) select id, $1, 999, false from sucursal order by id limit 1 returning id as espacio",
    [`Recorrido ${n}`],
  );
  const trabajo = async (estado: "agendado" | "listo", dia: string) => {
    const [{ id }] = await consultar<{ id: number }>(
      `insert into trabajo (sucursal_id, cliente_id, vehiculo_id, espacio_id, fecha_inicio, fecha_fin, estado, recibido_at, listo_at, created_by)
       select e.sucursal_id, v.cliente_id, v.id, e.id, ${dia}, ${dia}, $3,
         case when $3 = 'listo' then now() end, case when $3 = 'listo' then now() end, v.created_by
       from vehiculo v, espacio_taller e where v.placa = $1 and e.id = $2 returning id`,
      [placa, espacio, estado],
    );
    return id;
  };
  // Una orden lista de ayer, con un servicio y un adelanto, y una reserva de hoy sin recibir ("Recibir vehículo" ya se ofrece)
  // El día de Bolivia, no el de la base (UTC): después de las 20:00 en Bolivia, la base ya va en el día siguiente
  const hoy = "(now() at time zone 'America/La_Paz')::date";
  const orden = await trabajo("listo", `${hoy} - 1`);
  await consultar(
    `insert into trabajo_linea (trabajo_id, variante_id, descripcion, precio, orden)
     select $1, v.id, s.nombre, 300, 0 from variante v join servicio s on s.id = v.servicio_id order by v.id limit 1`,
    [orden],
  );
  await consultar("insert into pago (trabajo_id, monto, metodo, tipo, fecha, created_by) select id, 100, 'qr', 'adelanto', (now() at time zone 'America/La_Paz')::date, created_by from trabajo where id = $1", [orden]);
  const reserva = await trabajo("agendado", hoy);
  const [{ reclamo }] = await consultar<{ reclamo: number }>(
    "insert into reclamo (nombre, telefono, placa, descripcion, ip_hash) values ($1, '59176543210', $2, 'Recorrido del panel.', 'e2e') returning id as reclamo",
    [`Recorrido ${n}`, placa],
  );
  const [{ servicio }] = await consultar<{ servicio: number }>("select id as servicio from servicio order by id limit 1");
  const [{ usuario }] = await consultar<{ usuario: number }>("select id as usuario from usuario where nombre_usuario = 'dueno'");
  return { cliente, vehiculo, cotizacion, reserva, orden, reclamo, servicio, usuario };
}

/** Las pantallas del panel (§5 de C6), con los ids del recorrido. */
const pantallas = (i: Ids) => [
  "/panel",
  "/panel/agenda",
  "/panel/agenda/nueva",
  `/panel/agenda/${i.reserva}`,
  "/panel/ordenes",
  `/panel/ordenes/${i.orden}`,
  `/panel/ordenes/${i.reserva}/recibir`,
  `/panel/ordenes/${i.orden}/entregar`,
  "/panel/clientes",
  "/panel/clientes/nuevo",
  `/panel/clientes/${i.cliente}`,
  `/panel/clientes/${i.cliente}/vehiculos/${i.vehiculo}/dueno`,
  "/panel/cotizaciones",
  "/panel/cotizaciones/nueva",
  `/panel/cotizaciones/${i.cotizacion}`,
  `/panel/cotizaciones/${i.cotizacion}/nueva-version`,
  "/panel/pagos",
  "/panel/mantenimientos",
  "/panel/reclamos",
  `/panel/reclamos/${i.reclamo}`,
  "/panel/sitio",
  "/panel/sitio/servicios",
  `/panel/sitio/servicios/${i.servicio}`,
  "/panel/sitio/textos",
  "/panel/sitio/preguntas",
  "/panel/sitio/galeria",
  "/panel/catalogo",
  `/panel/catalogo/${i.servicio}`,
  "/panel/usuarios",
  "/panel/usuarios/nuevo",
  `/panel/usuarios/${i.usuario}`,
  "/panel/configuracion",
  "/panel/configuracion/negocio",
  "/panel/configuracion/taller",
  "/panel/configuracion/parametros",
  "/panel/configuracion/mensajes",
  "/panel/sin-acceso",
];

async function recorrer(page: Page, info: TestInfo, rol: string, ids: Ids) {
  const problemas: string[] = [];
  for (const { ancho, alto } of ANCHOS) {
    await page.setViewportSize({ width: ancho, height: alto });
    for (const ruta of pantallas(ids)) {
      await page.goto(ruta, { waitUntil: "networkidle" });
      // Que termine de cargar: sin la silueta gris a la vista
      await expect(page.locator(".tt-cargando").locator("visible=true")).toHaveCount(0, { timeout: 15_000 });
      const donde = `${rol} ${ancho}px ${ruta} (llegó a ${new URL(page.url()).pathname})`;
      if ((await page.locator("main h1").count()) !== 1) problemas.push(`${donde}: no tiene un solo título`);
      const { sw, cw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
      if (sw > cw) problemas.push(`${donde}: se sale de la pantalla (${sw} px de ${cw})`);
      if (ancho === 390 || ancho === 1366) {
        const nombre = `recorrido-${rol}-${ancho}-${ruta.replace(/^\/panel\/?/, "").replaceAll("/", "-") || "inicio"}.jpg`;
        // Lo que se ve al abrirla: en una de página completa, el pie fijo ("Recibir vehículo") queda pintado a mitad de página
        await page.screenshot({ path: info.outputPath(nombre), type: "jpeg", quality: 55 });
      }
    }
  }
  expect(problemas, problemas.join("\n")).toEqual([]);
}

/** El tamaño lo pone la prueba: con un proyecto alcanza. */
const soloEscritorio = (info: TestInfo) => test.skip(info.project.name !== "escritorio", "El tamaño lo pone la prueba");

test.describe("recorrido final del panel (C6, fase 5)", () => {
  // 37 pantallas en 4 tamaños
  test.setTimeout(600_000);

  test("con el dueño", async ({ page }, info) => {
    soloEscritorio(info);
    const ids = await prepararDatos(info, "dueno");
    await ingresarComoDueno(page);
    await recorrer(page, info, "dueno", ids);
  });

  test("con un encargado con todos los permisos", async ({ page }, info) => {
    soloEscritorio(info);
    const ids = await prepararDatos(info, "todo");
    const usuario = `recorrido-todo-${info.retry}-${Math.floor(Math.random() * 1e6)}`;
    await crearUsuario({
      usuario,
      nombre: "Encargado de todo",
      contrasena: "encargado-123",
      rol: "encargado",
      permisos: ["agenda", "ordenes", "clientes", "cotizaciones", "pagos", "mantenimientos", "reclamos", "sitio", "entrega_con_saldo"],
    });
    await ingresar(page, usuario, "encargado-123");
    await expect(page).toHaveURL(/\/panel$/);
    await recorrer(page, info, "encargado-todo", ids);
  });

  test("con un encargado con el perfil Taller", async ({ page }, info) => {
    soloEscritorio(info);
    const ids = await prepararDatos(info, "taller");
    const usuario = `recorrido-taller-${info.retry}-${Math.floor(Math.random() * 1e6)}`;
    await crearUsuario({ usuario, nombre: "Encargado del taller", contrasena: "encargado-123", rol: "encargado", permisos: PERFIL_TALLER });
    await ingresar(page, usuario, "encargado-123");
    await expect(page).toHaveURL(/\/panel$/);
    await recorrer(page, info, "encargado-taller", ids);
  });
});
