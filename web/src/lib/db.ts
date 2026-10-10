import { Pool, types } from "pg";

// Return DATE columns as "YYYY-MM-DD" strings and REAL as numbers.
types.setTypeParser(1082, (v) => v);
types.setTypeParser(700, (v) => parseFloat(v));
types.setTypeParser(20, (v) => parseInt(v, 10));

const url = process.env.DATABASE_URL ?? "";
const g = globalThis as unknown as { pool?: Pool };
export const pool =
  g.pool ??
  new Pool({
    connectionString: url,
    max: 5,
    ssl: /localhost|127\.0\.0\.1/.test(url) || /sslmode=disable/.test(url) ? false : { rejectUnauthorized: false },
  });
if (process.env.NODE_ENV !== "production") g.pool = pool;

export async function q<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  const res = await pool.query(sql, params);
  return res.rows as T[];
}

export async function one<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T | null> {
  return (await q<T>(sql, params))[0] ?? null;
}

export async function tx<T>(fn: (query: typeof q) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  const query = (async (sql: string, params: unknown[] = []) => (await client.query(sql, params)).rows) as typeof q;
  try {
    await client.query("BEGIN");
    const out = await fn(query);
    await client.query("COMMIT");
    return out;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
