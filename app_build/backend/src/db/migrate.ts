import mongoose from 'mongoose';
import { Migration } from '../models/index.js';

interface MigrationStep {
  name: string;
  up: () => Promise<void>;
}

/** Add new steps at the end; never edit a step that has shipped. */
const STEPS: MigrationStep[] = [
  {
    name: '001-sync-indexes',
    up: async () => {
      for (const m of Object.values(mongoose.models)) await m.syncIndexes();
    },
  },
];

export async function runMigrations(): Promise<string[]> {
  const applied: string[] = [];
  // Make sure the migrations collection exists before any transaction touches it.
  await Migration.createCollection().catch(() => undefined);
  for (const step of STEPS) {
    const done = await Migration.findOne({ name: step.name }).lean();
    if (done) continue;
    await step.up();
    await Migration.create({ name: step.name });
    applied.push(step.name);
  }
  return applied;
}
