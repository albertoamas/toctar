import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as esquema from "./esquema";

// En desarrollo la recarga en caliente re-ejecuta este módulo; se reutiliza el pool
// para no abrir conexiones nuevas en cada cambio.
const globalParaDb = globalThis as unknown as { pool?: Pool };

// Tiempos máximos: si se agotan las conexiones o una consulta se traba, el pedido falla en vez de quedar
// esperando para siempre (y con él, el resto de la app).
const pool =
  globalParaDb.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 10_000,
    statement_timeout: 30_000,
    idle_in_transaction_session_timeout: 30_000,
  });

if (process.env.NODE_ENV !== "production") globalParaDb.pool = pool;

export const db = drizzle({ client: pool, schema: esquema });

/** La transacción que recibe `db.transaction(async (tx) => …)`, para las funciones que escriben dentro de una. */
export type Transaccion = Parameters<Parameters<typeof db.transaction>[0]>[0];
