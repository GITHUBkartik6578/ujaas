/**
 * Loads DEV DATA into the local or staging database. Refuses to run in production.
 *   npm run seed:dev
 */
import 'dotenv/config';
import { getEnv } from '../src/config/env.js';
import { connectDb, disconnectDb } from '../src/db/connect.js';
import { runMigrations } from '../src/db/migrate.js';
import { Content } from '../src/models/index.js';
import { seedDevData, writeDevMedia } from '../src/seed/dev.js';

const env = getEnv();
if (env.NODE_ENV === 'production') {
  console.error('Refusing to seed DEV DATA in production.');
  process.exit(1);
}
await connectDb(env.MONGODB_URI);
await runMigrations();
if ((await Content.countDocuments()) > 0) {
  console.error('The database already has content; seed only an empty development database.');
  await disconnectDb();
  process.exit(1);
}
const res = await seedDevData();
await writeDevMedia(env.MEDIA_DIR);
console.log(`Seeded DEV DATA: ${Object.keys(res.slugs).length} contents, 4 categories, 4 authors, 1 collection.`);
await disconnectDb();
