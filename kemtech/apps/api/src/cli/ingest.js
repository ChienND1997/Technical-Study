import { loadConfig } from '../config/index.js';
import { createContainer } from '../container.js';

// `npm run ingest`: (re)load docs-v2 into the database and exit. Safe to run any time.
const config = loadConfig();
const container = createContainer(config);
try {
  await container.ingest.run();
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await container.close();
}
