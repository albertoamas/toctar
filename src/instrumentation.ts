// Se ejecuta una vez al arrancar el servidor, antes de aceptar pedidos.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // Durante `next build` no hay base de datos (por ejemplo, en el build de Docker).
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const { prepararAlArrancar } = await import("./lib/arranque");
  await prepararAlArrancar();
}
