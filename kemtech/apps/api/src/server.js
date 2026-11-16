import { loadConfig } from './config/index.js';
import { createContainer } from './container.js';
import { migrate } from './db/migrate.js';
import { buildApp } from './app.js';

/** Process entrypoint: migrate, optionally ingest content, then start listening. */
async function main() {
  const config = loadConfig();
  const container = createContainer(config);

  if (config.autoMigrate) {
    await migrate({ db: container.db, migrationsDir: config.migrationsDir });
  }
  if (config.ingestOnStart) {
    // A broken content folder must not take the API down: previously ingested data keeps working.
    await container.ingest.run().catch((e) => console.error('ingest failed, continuing:', e.message));
  }

  const app = await buildApp({ services: container.services, hub: container.hub });
  await app.listen({ port: config.port, host: '0.0.0.0' });

  const stop = async () => {
    await app.close();
    await container.close();
    process.exit(0);
  };
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});