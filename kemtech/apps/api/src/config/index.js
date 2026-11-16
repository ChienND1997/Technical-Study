import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Loads KEY=VALUE lines of the project `.env` into process.env (real environment variables win). */
function loadDotEnv(file) {
  let text = '';
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return; // no .env file: defaults apply
  }
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

/** Reads settings from the environment (defaults suit local development). */
export function loadConfig() {
  const rootDir = path.resolve(__dirname, '../../../..'); // the kemtech folder
  loadDotEnv(path.join(rootDir, '.env'));
  return {
    port: parseInt(process.env.API_PORT || '3000', 10),
    databaseUrl: process.env.DATABASE_URL || 'postgres://kemtech:kemtech@localhost:5432/kemtech',
    contentDir: process.env.CONTENT_DIR || path.resolve(rootDir, '../docs-v2'),
    topicsFile: path.resolve(rootDir, 'content/topics.json'),
    tracksFile: path.resolve(rootDir, 'content/tracks.json'),
    migrationsDir: path.resolve(rootDir, 'db/migrations'),
    autoMigrate: process.env.AUTO_MIGRATE !== 'false',
    ingestOnStart: process.env.INGEST_ON_START === 'true',
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
    sessionSecret: process.env.SESSION_SECRET || 'kemtech-dev-secret-change-me',
    sessionTtlDays: parseInt(process.env.SESSION_TTL_DAYS || '30', 10),
    adminEmails: (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean),
    adminUser: process.env.ADMIN_USER || 'admin',
    adminPassword: process.env.ADMIN_PASSWORD || '123456',
  };
}
