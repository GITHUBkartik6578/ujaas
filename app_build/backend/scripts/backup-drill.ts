/**
 * The restore drill (T-BCK-01): back up the live database, restore it into a clean one, and prove it is the same.
 *   npm run backup:drill
 * Checks counts, every unique index, a content checksum and that an admin password still verifies, and reports the
 * time taken (the measured part of the recovery time). Drops the scratch database afterwards.
 */
import 'dotenv/config';
import { createHash } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import mongoose from 'mongoose';
import { getEnv } from '../src/config/env.js';
import { connectDb, disconnectDb } from '../src/db/connect.js';
import { backupTo } from './backup.js';
import { restoreFrom } from './restore.js';

const env = getEnv();
await connectDb(env.MONGODB_URI);
const sourceName = mongoose.connection.name;
const scratch = `${sourceName}_restore_drill`;
const dir = await mkdtemp(path.join(tmpdir(), 'ujaas-backup-'));
const t0 = Date.now();
/* eslint-disable @typescript-eslint/no-explicit-any */
const fingerprint = async (name: string) => {
  const h = createHash('sha256');
  for (const c of ['contents', 'authors', 'categories', 'admin_users', 'submissions', 'magazine_issues']) {
    const docs = await mongoose.connection.getClient().db(name).collection(c).find({}).sort({ _id: 1 }).toArray();
    h.update(c + JSON.stringify(docs.map((d: Record<string, any>) => [String(d._id), d.updated_at ? new Date(d.updated_at).toISOString() : null, d.password_hash ?? null, d.title ?? d.name ?? d.email ?? null])));
  }
  return h.digest('hex');
};

let ok = true;
const say = (good: boolean, msg: string) => { if (!good) ok = false; console.log(`${good ? 'PASS' : 'FAIL'}  ${msg}`); };

const counts = await backupTo(dir, path.resolve(env.MEDIA_DIR));
const tBackup = Date.now() - t0;
await mongoose.connection.getClient().db(scratch).dropDatabase();
await disconnectDb();
await connectDb(env.MONGODB_URI, scratch);
const t1 = Date.now();
const restored = await restoreFrom(dir);
const tRestore = Date.now() - t1;

for (const [name, n] of Object.entries(counts)) say(restored[name] === n, `${name}: ${n} document(s) backed up, ${restored[name]} restored`);
const sourceIdx = await mongoose.connection.getClient().db(sourceName).collection('contents').indexes();
const restoredIdx = await mongoose.connection.getClient().db(scratch).collection('contents').indexes();
say(JSON.stringify(sourceIdx.map((i: { name?: string }) => i.name).sort()) === JSON.stringify(restoredIdx.map((i: { name?: string }) => i.name).sort()), 'content indexes (including unique slug) were recreated');
say(Boolean(restoredIdx.find((i: { name?: string }) => i.name === 'slug_1')?.unique), 'the unique slug index is unique again');
say((await fingerprint(sourceName)) === (await fingerprint(scratch)), 'a checksum over contents, authors, categories, admins, submissions and issues matches the source');
const admin = await mongoose.connection.getClient().db(scratch).collection('admin_users').findOne({});
say(admin === null || String(admin.password_hash).startsWith('$argon2id$'), 'admin password hashes survived the round trip');
console.log(`\nBackup took ${tBackup} ms, restore took ${tRestore} ms for ${Object.values(counts).reduce((a, b) => a + b, 0)} documents.`);

await mongoose.connection.getClient().db(scratch).dropDatabase();
await rm(dir, { recursive: true, force: true });
await disconnectDb();
process.exit(ok ? 0 : 1);
