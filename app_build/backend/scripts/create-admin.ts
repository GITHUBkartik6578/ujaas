/**
 * One-time provisioning of the first administrator. There are no default credentials.
 *
 *   npm run create-admin -- --email you@example.org --name "Display Name"
 *
 * The password comes from ADMIN_PASSWORD or, if unset, a random one is generated and printed once.
 * The command refuses to run when an admin already exists.
 */
import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { getEnv } from '../src/config/env.js';
import { connectDb, disconnectDb } from '../src/db/connect.js';
import { runMigrations } from '../src/db/migrate.js';
import { hashPassword, passwordProblems } from '../src/lib/password.js';
import { AdminUser } from '../src/models/index.js';
import { writeAudit } from '../src/services/audit.js';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const email = arg('email')?.toLowerCase();
const name = arg('name');
if (!email || !name) {
  console.error('Usage: npm run create-admin -- --email <email> --name <display name>');
  process.exit(2);
}

const env = getEnv();
await connectDb(env.MONGODB_URI);
await runMigrations();

if ((await AdminUser.countDocuments()) > 0) {
  console.error('An administrator already exists. Create further accounts from the admin screens.');
  await disconnectDb();
  process.exit(1);
}

const generated = !process.env.ADMIN_PASSWORD;
const password = process.env.ADMIN_PASSWORD ?? randomBytes(15).toString('base64url');
const problems = passwordProblems(password, email);
if (problems.length > 0) {
  console.error(`Password rejected: ${problems.map((p) => p.code).join(', ')}`);
  await disconnectDb();
  process.exit(1);
}

const user = await AdminUser.create({
  email,
  display_name: name,
  password_hash: await hashPassword(password),
  role: 'site_admin',
  is_active: true,
});
await writeAudit({ action: 'admin.provisioned', entity: 'admin_user', entity_id: String(user._id) });
console.log(`Administrator created: ${email} (site_admin)`);
if (generated) console.log(`Generated password (shown once, store it safely): ${password}`);
await disconnectDb();
