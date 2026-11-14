/**
 * Sets a new password for an existing administrator (local development recovery). Refuses to run in production.
 *
 *   npm run reset-admin-password -- --email dev.admin@example.org
 *
 * The password comes from ADMIN_PASSWORD or, if unset, a random one is generated and printed once.
 * Also clears the failed-login counter and any lockout.
 */
import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { getEnv } from '../src/config/env.js';
import { connectDb, disconnectDb } from '../src/db/connect.js';
import { hashPassword, passwordProblems } from '../src/lib/password.js';
import { AdminUser } from '../src/models/index.js';

const i = process.argv.indexOf('--email');
const email = (i >= 0 ? process.argv[i + 1] : undefined)?.toLowerCase();
if (!email) {
  console.error('Usage: npm run reset-admin-password -- --email <email>');
  process.exit(2);
}
const env = getEnv();
if (env.NODE_ENV === 'production') {
  console.error('Refusing to reset a password this way in production.');
  process.exit(1);
}
await connectDb(env.MONGODB_URI);
const user = await AdminUser.findOne({ email });
if (!user) {
  console.error(`No administrator with the email ${email}.`);
  await disconnectDb();
  process.exit(1);
}
const generated = !process.env.ADMIN_PASSWORD;
const password = process.env.ADMIN_PASSWORD ?? `${randomBytes(12).toString('base64url')}!7a`;
const problems = passwordProblems(password, email);
if (problems.length > 0) {
  console.error(`Password rejected: ${problems.map((p) => p.code).join(', ')}`);
  await disconnectDb();
  process.exit(1);
}
await AdminUser.updateOne(
  { _id: user._id },
  { $set: { password_hash: await hashPassword(password), failed_logins: 0, is_active: true }, $unset: { locked_until: '' } },
);
console.log(`Password reset for ${email}.`);
if (generated) console.log(`New password (shown once, store it safely): ${password}`);
await disconnectDb();
