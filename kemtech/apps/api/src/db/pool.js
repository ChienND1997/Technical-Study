import pg from 'pg';

// `bigint`/`bigserial` (OID 20) columns come back from `pg` as strings by default, since JS numbers
// aren't safe above 2^53 — but every id in this app is a normal auto-increment PK, nowhere near that
// range, and the rest of the codebase (zod schemas, strict equality against req.userId, etc.) assumes
// ids are numbers. Parse int8 as a number everywhere so a bigint id behaves exactly like the serial
// (int4) ids elsewhere, instead of silently becoming a string that fails `z.number()` downstream.
pg.types.setTypeParser(20, (v) => parseInt(v, 10));

/** Postgres access: `query` for single statements, `tx` to run several in one transaction. */
export function createDb(databaseUrl) {
  const pool = new pg.Pool({
    connectionString: databaseUrl || process.env.DATABASE_URL || 'postgres://kemtech:kemtech@localhost:5432/kemtech',
  });

  return {
    pool,
    query: (text, params) => pool.query(text, params),
    /** Runs fn(client) between BEGIN and COMMIT; rolls back when fn throws. */
    async tx(fn) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    },
    close: () => pool.end(),
  };
}
