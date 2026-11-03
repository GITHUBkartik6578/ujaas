/**
 * Local development database: a single-node MongoDB replica set (transactions need a replica set).
 * Uses the mongod already installed on the machine. Data lives in app_build/.data (git-ignored).
 *
 *   npm run dev:db        then put the printed URI in backend/.env as MONGODB_URI
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

const dbPath = path.resolve(import.meta.dirname, '../../.data/mongo');
mkdirSync(dbPath, { recursive: true });

if (!process.env.MONGOMS_SYSTEM_BINARY) {
  console.log('Tip: set MONGOMS_SYSTEM_BINARY to your mongod path to avoid a download.');
}

const rs = await MongoMemoryReplSet.create({
  replSet: { count: 1, storageEngine: 'wiredTiger', dbName: 'ujaas' },
  instanceOpts: [{ port: 27018, dbPath, storageEngine: 'wiredTiger' }],
});
console.log(`MongoDB replica set ready.\nMONGODB_URI=${rs.getUri('ujaas')}`);

const stop = async () => {
  await rs.stop({ doCleanup: false });
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
