import { loadConfig } from '../config/index.js';
import { createContainer } from '../container.js';
import { migrate } from '../db/migrate.js';

// `npm run migrate`: apply pending SQL migrations and exit.
const config = loadConfig();
const container = createContainer(config);
try {
  await migrate({ db: container.db, migrationsDir: config.migrationsDir });
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
} finally {
  await container.close();
}
