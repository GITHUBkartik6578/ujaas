/**
 * Local development database: a single-node MongoDB replica set (transactions need a replica set).
 * Uses the mongod already installed on the machine. Data lives in app_build/.data (git-ignored).
 *
 *   npm run dev:db        then put the printed URI in backend/.env as MONGODB_URI
 *
 * The library allows mongod 10 seconds by default, counted from before the process starts until it accepts
 * connections, so crash recovery counts against it. A stop on Windows ends mongod without a clean shutdown, and a
 * first start after days idle reads everything from a cold disk, so a healthy start can pass 10 seconds.
 * LAUNCH_TIMEOUT_MS leaves room for that. A real failure (bad data path, locked folder) still stops at once.
 */
import { mkdirSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

const PORT = 27018;
const LAUNCH_TIMEOUT_MS = 120_000;

const dbPath = path.resolve(import.meta.dirname, '../../.data/mongo');
mkdirSync(dbPath, { recursive: true });

const portInUse = (port: number) =>
  new Promise<boolean>((resolve) => {
    const socket = net.connect({ port, host: '127.0.0.1' });
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', () => resolve(false));
  });

// The library would quietly move to another free port, leaving MONGODB_URI pointing at something else.
if (await portInUse(PORT)) {
  console.error(`Port ${PORT} is already in use, so a second database was not started. If the dev database is already running, use it as it is.`);
  process.exit(1);
}

if (!process.env.MONGOMS_SYSTEM_BINARY) {
  console.log('Tip: set MONGOMS_SYSTEM_BINARY to your mongod path to avoid a download.');
}

const rs = await MongoMemoryReplSet.create({
  replSet: { count: 1, storageEngine: 'wiredTiger', dbName: 'ujaas' },
  instanceOpts: [{ port: PORT, dbPath, storageEngine: 'wiredTiger', launchTimeout: LAUNCH_TIMEOUT_MS }],
});
console.log(`MongoDB replica set ready.\nMONGODB_URI=${rs.getUri('ujaas')}`);

const stop = async () => {
  await rs.stop({ doCleanup: false });
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
