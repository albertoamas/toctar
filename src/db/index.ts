import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as esquema from "./esquema";

// En desarrollo la recarga en caliente re-ejecuta este módulo; se reutiliza el pool
// para no abrir conexiones nuevas en cada cambio.
const globalParaDb = globalThis as unknown as { pool?: Pool };

const pool =
  globalParaDb.pool ?? new Pool({ connectionString: process.env.DATABASE_URL });

if (process.env.NODE_ENV !== "production") globalParaDb.pool = pool;

export const db = drizzle({ client: pool, schema: esquema });
