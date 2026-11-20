import { expect, test, type TestInfo } from "@playwright/test";
import { crearClienteEnBase, crearCotizacionEnBase, crearOrdenLista, crearUsuario, ingresar, ingresarComoDueno, PERFIL_TALLER } from "./apoyo";

// C7 §5.6 (18/11): la historia de la ficha del cliente junta sus reservas, órdenes y cotizaciones en una sola lista, lo
// más reciente arriba; una cotización aceptada con su reserva no se repite; los montos, solo a quien los ve (RN-12).
// Cada proyecto y reintento con sus teléfonos y placas, y sus días en el taller lejos de hoy (los espacios no chocan).

const sufijo = (info: TestInfo) => (info.project.name === "celular" ? "C" : "E") + info.retry;
const telefono = (info: TestInfo, n: number) => `5917${info.project.name === "celular" ? 7 : 8}79${info.retry}0${n}0`;
const dias = (info: TestInfo) => 1900 + (info.project.name === "celular" ? 0 : 10) + info.retry * 3;

test("la historia junta reservas, órdenes y cotizaciones, de lo más reciente a lo más viejo", async ({ page }, info) => {
  const s = sufijo(info);
  const placa = `HI7${s}1`;
  const id = await crearClienteEnBase({ nombre: `Historia ${s}`, telefono: telefono(info, 1), placa });
  // Una cotización perdida hace 30 días, una pendiente de hoy y una orden en el futuro lejano
  await crearCotizacionEnBase({ placa, numero: `2077-${s}1`, estado: "perdido", dias: 30 });
  await crearCotizacionEnBase({ placa, numero: `2077-${s}2` });
  await crearOrdenLista({ placa, dias: dias(info), precio: 500, pagado: 100 });
  await ingresarComoDueno(page);
  await page.goto(`/panel/clientes/${id}`);

  const filas = page.getByRole("list", { name: "Historia" }).getByRole("link");
  await expect(filas).toHaveCount(3);
  // La orden (más adelante), la pendiente (hoy) y la perdida (hace 30 días)
  await expect(filas.nth(0)).toContainText("Debe 400 Bs");
  await expect(filas.nth(1)).toContainText(`2077-${s}2`);
  await expect(filas.nth(2)).toContainText(`2077-${s}1`);
  await expect(filas.nth(2)).toContainText("Rechazada");
});

test("sin Pagos ni Cotizaciones la historia no muestra montos ni cotizaciones (RN-12)", async ({ page }, info) => {
  const s = sufijo(info);
  const placa = `HI7${s}2`;
  const id = await crearClienteEnBase({ nombre: `Sin montos ${s}`, telefono: telefono(info, 2), placa });
  await crearCotizacionEnBase({ placa, numero: `2077-${s}3` });
  await crearOrdenLista({ placa, dias: dias(info) + 1, precio: 800, pagado: 0 });
  // El perfil Taller, con Clientes para poder abrir la ficha
  await crearUsuario({ usuario: `historia-${s.toLowerCase()}`, nombre: "Del taller", contrasena: "taller-123", rol: "encargado", permisos: [...PERFIL_TALLER, "clientes"] });
  await ingresar(page, `historia-${s.toLowerCase()}`, "taller-123");
  await expect(page).toHaveURL(/\/panel$/);
  await page.goto(`/panel/clientes/${id}`);

  const historia = page.getByRole("list", { name: "Historia" });
  await expect(historia.getByRole("link")).toHaveCount(1);
  await expect(historia).toContainText(placa);
  await expect(historia).not.toContainText(/Bs|Pagado|Debe /);
  await expect(historia).not.toContainText(`2077-${s}3`);
});
