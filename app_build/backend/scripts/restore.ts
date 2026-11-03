/**
 * Restores a backup made by backup.ts into an EMPTY database (it refuses a database that already holds data).
 *   npm run restore -- --from <folder> --db <new database name>
 * Recreates every collection, its documents and its indexes, and copies the images back to --media <folder> if given.
 */
import 'dotenv/config';
import { cp, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { EJSON } from 'bson';
import mongoose from 'mongoose';
import { getEnv } from '../src/config/env.js';
import { connectDb, disconnectDb } from '../src/db/connect.js';

type IndexDef = Record<string, unknown> & { name: string; key: Record<string, unknown>; weights?: Record<string, number> };
interface Manifest { counts: Record<string, number>; indexes: Record<string, IndexDef[]> }

/** A text index is stored by MongoDB as _fts/_ftsx; it has to be recreated from its weights. */
function toCreateArgs(ix: IndexDef) {
  const { v, ns, key, textIndexVersion, ...options } = ix as Record<string, unknown>;
  void v; void ns; void textIndexVersion;
  let spec = key as Record<string, unknown>;
  if ('_fts' in spec) {
    spec = Object.fromEntries(Object.keys((ix.weights ?? {}) as object).map((f) => [f, 'text']));
    return { spec, options };
  }
  const { weights, default_language, language_override, ...rest } = options;
  void weights; void default_language; void language_override;
  return { spec, options: rest };
}

export async function restoreFrom(dir: string, mediaTarget?: string): Promise<Record<string, number>> {
  const db = mongoose.connection.db!;
  const existing = (await db.listCollections({}, { nameOnly: true }).toArray()).filter((c) => !c.name.startsWith('system.'));
  const nonEmpty = [];
  for (const c of existing) if ((await db.collection(c.name).countDocuments()) > 0) nonEmpty.push(c.name);
  if (nonEmpty.length > 0) throw new Error(`Refusing to restore into a database that already holds data (${nonEmpty.join(', ')}).`);
  const manifest = JSON.parse(await readFile(path.join(dir, 'manifest.json'), 'utf8')) as Manifest;
  const restored: Record<string, number> = {};
  for (const name of Object.keys(manifest.counts)) {
    const text = await readFile(path.join(dir, 'collections', `${name}.ndjson`), 'utf8');
    const docs = text.split('\n').filter(Boolean).map((l) => EJSON.parse(l, { relaxed: false }) as Record<string, unknown>);
    if (docs.length > 0) await db.collection(name).insertMany(docs as never[]);
    else await db.createCollection(name).catch(() => undefined);
    for (const ix of manifest.indexes[name] ?? []) {
      if (ix.name === '_id_') continue;
      const { spec, options } = toCreateArgs(ix);
      await db.collection(name).createIndex(spec as never, options as never);
    }
    restored[name] = docs.length;
  }
  if (mediaTarget && existsSync(path.join(dir, 'media'))) await cp(path.join(dir, 'media'), mediaTarget, { recursive: true });
  return restored;
}

if (import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}`) {
  const arg = (n: string) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : undefined; };
  const from = arg('from');
  const dbName = arg('db');
  if (!from || !dbName) {
    console.error('Usage: npm run restore -- --from <folder> --db <new database name> [--media <folder>]');
    process.exit(2);
  }
  const env = getEnv();
  await connectDb(env.MONGODB_URI, dbName);
  const counts = await restoreFrom(path.resolve(from), arg('media') ? path.resolve(arg('media')!) : undefined);
  console.log(`Restored into "${dbName}": ${Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(', ')}`);
  await disconnectDb();
}
