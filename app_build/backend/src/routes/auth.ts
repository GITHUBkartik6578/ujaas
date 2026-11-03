import { randomBytes } from 'node:crypto';
import { Router, type Request } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import type { Env } from '../config/env.js';
import type { HydratedDocument } from 'mongoose';
import { AdminUser, type AdminUserDoc } from '../models/index.js';
import { AppError, unauthenticated, validationFailed } from '../lib/errors.js';
import { hashPassword, passwordProblems, verifyPassword } from '../lib/password.js';
import { requireAuth, SESSION_COOKIE } from '../middleware/auth.js';
import { limits, requireCsrf } from '../middleware/security.js';
import { writeAudit } from '../services/audit.js';

const MAX_FAILURES = 5;
const LOCK_MS = 15 * 60 * 1000;

const loginBody = z.object({ email: z.string().email().max(254), password: z.string().min(1).max(256) });
const changeBody = z.object({ old_password: z.string().min(1).max(256), new_password: z.string().min(1).max(256) });

const regenerate = (req: Request) =>
  new Promise<void>((resolve, reject) => req.session.regenerate((e) => (e ? reject(e) : resolve())));
const destroy = (req: Request) =>
  new Promise<void>((resolve, reject) => req.session.destroy((e) => (e ? reject(e) : resolve())));

let dummyHash: string | undefined;
async function equaliseTiming(password: string) {
  dummyHash ??= await hashPassword('timing-equaliser-not-a-real-password');
  await verifyPassword(dummyHash, password);
}

const genericLoginError = () =>
  new AppError(401, 'unauthenticated', 'Invalid email or password', 'ईमेल या पासवर्ड सही नहीं है');

export function createAuthRouter(env: Env): Router {
  const r = Router();

  r.post('/login', limits.loginIp(env.RATE_LIMIT_SCALE), limits.login(), async (req, res, next) => {
    try {
      const parsed = loginBody.safeParse(req.body);
      if (!parsed.success) return next(genericLoginError());
      const email = parsed.data.email.toLowerCase();
      const user = (await AdminUser.findOne({ email }).select('+password_hash')) as HydratedDocument<AdminUserDoc> | null;
      if (!user || !user.is_active) {
        await equaliseTiming(parsed.data.password);
        return next(genericLoginError());
      }
      // While locked the answer is the same generic error, so locks do not reveal that an account exists.
      if (user.locked_until && user.locked_until > new Date()) {
        await equaliseTiming(parsed.data.password);
        return next(genericLoginError());
      }
      const ok = await verifyPassword(user.password_hash, parsed.data.password);
      if (!ok) {
        user.failed_logins = (user.failed_logins ?? 0) + 1;
        if (user.failed_logins >= MAX_FAILURES) {
          user.locked_until = new Date(Date.now() + LOCK_MS);
          user.failed_logins = 0;
          await writeAudit({ actor_id: String(user._id), action: 'auth.locked', entity: 'admin_user', entity_id: String(user._id), request_id: (req as { id?: string }).id });
        }
        await user.save();
        return next(genericLoginError());
      }
      user.failed_logins = 0;
      user.locked_until = undefined;
      user.last_login_at = new Date();
      await user.save();

      await regenerate(req); // new session id on login
      req.session.user_id = String(user._id);
      req.session.created_at = Date.now();
      req.session.csrf = randomBytes(32).toString('hex');
      await writeAudit({ actor_id: String(user._id), action: 'auth.login', entity: 'admin_user', entity_id: String(user._id), request_id: (req as { id?: string }).id });
      res.json({
        user: { id: String(user._id), email: user.email, display_name: user.display_name, role: user.role },
        csrf_token: req.session.csrf,
      });
    } catch (err) {
      next(err);
    }
  });

  r.get('/me', requireAuth, (req, res) => {
    res.json({ user: req.admin, csrf_token: req.session.csrf });
  });

  r.post('/logout', requireAuth, requireCsrf, async (req, res, next) => {
    try {
      const id = req.admin!.id;
      await destroy(req);
      res.clearCookie(SESSION_COOKIE);
      await writeAudit({ actor_id: id, action: 'auth.logout', entity: 'admin_user', entity_id: id, request_id: (req as { id?: string }).id });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  r.post('/change-password', requireAuth, requireCsrf, async (req, res, next) => {
    try {
      const parsed = changeBody.safeParse(req.body);
      if (!parsed.success) return next(validationFailed([{ field: 'body', code: 'invalid' }]));
      const user = (await AdminUser.findById(req.admin!.id).select('+password_hash')) as HydratedDocument<AdminUserDoc> | null;
      if (!user) return next(unauthenticated());
      if (!(await verifyPassword(user.password_hash, parsed.data.old_password))) {
        return next(validationFailed([{ field: 'old_password', code: 'incorrect', message_hi: 'पुराना पासवर्ड सही नहीं है' }]));
      }
      const problems = passwordProblems(parsed.data.new_password, user.email);
      if (problems.length > 0) {
        return next(validationFailed(problems.map((p) => ({ field: 'new_password', code: p.code }))));
      }
      user.password_hash = await hashPassword(parsed.data.new_password);
      await user.save();
      // Rotate the current session (new id, new CSRF token), then kill every other session of this user.
      const createdAt = req.session.created_at;
      await regenerate(req);
      req.session.user_id = String(user._id);
      req.session.created_at = createdAt ?? Date.now(); // the 24 h absolute limit still counts from login
      req.session.csrf = randomBytes(32).toString('hex');
      await new Promise<void>((resolve, reject) => req.session.save((e) => (e ? reject(e) : resolve())));
      await mongoose.connection.collection('sessions').deleteMany({ 'session.user_id': String(user._id), _id: { $ne: req.sessionID as never } });
      await writeAudit({ actor_id: String(user._id), action: 'auth.password_changed', entity: 'admin_user', entity_id: String(user._id), request_id: (req as { id?: string }).id });
      res.json({ csrf_token: req.session.csrf }); // the old token died with the old session
    } catch (err) {
      next(err);
    }
  });

  return r;
}
