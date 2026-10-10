import { sql } from "drizzle-orm";
import { connection } from "next/server";
import { db } from "@/db";

// Verificación de estado para Coolify y UptimeRobot: responde 200 si la app y la base están arriba.
export async function GET() {
  // Se ejecuta en cada pedido; nunca se pre-genera en el build (ahí no hay base).
  await connection();
  try {
    await db.execute(sql`select 1`);
    return Response.json({ estado: "ok", base: "ok" });
  } catch {
    return Response.json({ estado: "error", base: "sin conexión" }, { status: 503 });
  }
}
