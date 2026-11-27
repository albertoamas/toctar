import { connection } from "next/server";

// La versión que está publicada (pedido 39). El panel la compara con la suya para avisar que hay una versión nueva.
// Pública: el número de versión no es un secreto. Sin base de datos ni sesión, y sin caché: siempre la del servidor.
export async function GET() {
  await connection();
  return Response.json({ version: process.env.NEXT_PUBLIC_VERSION_APP ?? "" }, { headers: { "Cache-Control": "no-store" } });
}
