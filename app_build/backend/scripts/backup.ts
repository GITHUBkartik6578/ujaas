/**
 * Logical backup of the whole database and the uploaded images (docs/deployment.md section 6).
 *   npm run backup -- --out <folder>
 * Writes one file per collection (extended JSON, one document per line) plus a copy of the media folder and a
 * manifest with counts. Production uses the host's managed snapshots as well; this is the portable copy and the
 * thing the restore drill rehearses. The output holds private data (submissions, password hashes): store it as
 * carefully as the database itself.
 */
import 'dotenv/config';
import { cp, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { EJSON } from 'bson';
import mongoose from 'mongoose';
import { getEnv } from '../src/config/env.js';
import { connectDb, disconnectDb } from '../src/db/connect.js';

export async function backupTo(outDir: string, mediaDir: string): Promise<Record<string, number>> {
  const db = mongoose.connection.db!;
  await mkdir(path.join(outDir, 'collections'), { recursive: true });
  const counts: Record<string, number> = {};
  const indexes: Record<string, unknown[]> = {};
  for (const info of await db.listCollections({}, { nameOnly: true }).toArray()) {
    if (info.name.startsWith('system.') || info.name === 'sessions') continue; // sessions are disposable
    const docs = await db.collection(info.name).find({}).toArray();
    counts[info.name] = docs.length;
    indexes[info.name] = (await db.collection(info.name).indexes()) as unknown[]; // the full definitions: text, TTL and unique options included
    await writeFile(path.join(outDir, 'collections', `${info.name}.ndjson`), docs.map((d) => EJSON.stringify(d, { relaxed: false })).join('\n') + (docs.length ? '\n' : ''));
  }
  await cp(mediaDir, path.join(outDir, 'media'), { recursive: true }).catch(() => undefined); // no uploads yet is fine
  await writeFile(path.join(outDir, 'manifest.json'), JSON.stringify({ taken_at: new Date().toISOString(), database: db.databaseName, counts, indexes }, null, 2));
  return counts;
}

if (import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}`) {
  const i = process.argv.indexOf('--out');
  const out = i >= 0 ? process.argv[i + 1] : undefined;
  if (!out) {
    console.error('Usage: npm run backup -- --out <folder>');
    process.exit(2);
  }
  const env = getEnv();
  await connectDb(env.MONGODB_URI);
  const counts = await backupTo(path.resolve(out), path.resolve(env.MEDIA_DIR));
  console.log(`Backup written to ${path.resolve(out)}: ${Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(', ')}`);
  await disconnectDb();
}
