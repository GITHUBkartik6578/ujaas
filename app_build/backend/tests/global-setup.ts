import { MongoMemoryReplSet } from 'mongodb-memory-server';

let rs: MongoMemoryReplSet | undefined;

/** One replica set for the whole run (transactions need it). Each test file uses its own database. */
export async function setup() {
  if (!process.env.MONGOMS_SYSTEM_BINARY && process.platform === 'win32') {
    // Falls back to a download when no local mongod is configured.
  }
  rs = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  process.env.TEST_MONGODB_URI = rs.getUri();
}

export async function teardown() {
  await rs?.stop();
}
