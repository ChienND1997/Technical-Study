import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

// Advisory lock id: prevents two instances from migrating at the same time during a deploy.
const LOCK_ID = 727274;

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

/**
 * Applies every `db/migrations/NNNN_*.sql` file that has not run yet, in file-name order.
 *
 * - Each file runs in its own transaction (an error rolls the whole file back).
 * - A file that is already recorded in schema_migrations is skipped by name (its content is not compared).
 */
export async function migrate({ db, migrationsDir, log = console.log }) {
  const files = (await fs.readdir(migrationsDir)).filter((f) => /^\d+.*\.sql$/.test(f)).sort();
  const client = await db.pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [LOCK_ID]);
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      version    text PRIMARY KEY,
      checksum   text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now())`);
    const { rows } = await client.query('SELECT version, checksum FROM schema_migrations');
    const applied = new Map(rows.map((r) => [r.version, r.checksum]));

    let ran = 0;
    for (const file of files) {
      const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
      const checksum = sha(sql);
      if (applied.has(file)) continue; // already applied: the name alone decides, content is not compared
      log(`migrate: applying ${file}`);
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2)', [file, checksum]);
        await client.query('COMMIT');
        ran++;
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        err.message = `Migration ${file} failed: ${err.message}`;
        throw err;
      }
    }
    log(ran ? `migrate: done, applied ${ran} file(s)` : 'migrate: schema is up to date');
    return ran;
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [LOCK_ID]).catch(() => {});
    client.release();
  }
}
