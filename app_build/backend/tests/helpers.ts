import { randomBytes } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { Express } from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import { parseEnv, type Env } from '../src/config/env.js';
import { connectDb, disconnectDb } from '../src/db/connect.js';
import { runMigrations } from '../src/db/migrate.js';
import { createApp } from '../src/app.js';
import { hashPassword } from '../src/lib/password.js';
import { AdminUser } from '../src/models/index.js';
import type { Role } from '../src/lib/workflow.js';

export const PASSWORD = 'correct-horse-battery-9';
export const ORIGIN = 'http://localhost:3000';

export function testEnv(overrides: Record<string, string> = {}): Env {
  return parseEnv({
    NODE_ENV: 'test',
    MONGODB_URI: process.env.TEST_MONGODB_URI ?? 'mongodb://127.0.0.1:1/unused',
    SESSION_SECRET: 'x'.repeat(40),
    IP_HASH_SALT: 'y'.repeat(20),
    PUBLIC_BASE_URL: ORIGIN,
    MEDIA_DIR: mkdtempSync(path.join(tmpdir(), 'ujaas-media-')),
    LOG_LEVEL: process.env.TEST_LOG ?? 'silent',
    ...overrides,
  });
}

export interface Harness {
  env: Env;
  app: Express;
  dbName: string;
  close: () => Promise<void>;
}

export async function startHarness(overrides: Record<string, string> = {}): Promise<Harness> {
  const env = testEnv(overrides);
  const dbName = `t_${randomBytes(6).toString('hex')}`;
  await connectDb(env.MONGODB_URI, dbName);
  await runMigrations();
  const app = createApp(env);
  return {
    env,
    app,
    dbName,
    close: async () => {
      await mongoose.connection.dropDatabase();
      await disconnectDb();
    },
  };
}

let counter = 0;
export async function makeAdmin(role: Role = 'site_admin', password = PASSWORD) {
  counter += 1;
  const email = `admin${counter}-${randomBytes(3).toString('hex')}@example.org`;
  const user = await AdminUser.create({
    email,
    display_name: 'Test Admin',
    password_hash: await hashPassword(password),
    role,
    is_active: true,
  });
  return { user, email, password };
}

export async function loginAgent(app: Express, email: string, password = PASSWORD) {
  const agent = request.agent(app);
  const res = await agent.post('/api/v1/admin/auth/login').set('Origin', ORIGIN).send({ email, password });
  return { agent, res, csrf: res.body?.csrf_token as string | undefined };
}
