import type { RequestHandler } from 'express';
import type { Env } from '../config/env.js';
import { AdminUser } from '../models/index.js';
import { forbidden, sessionExpired, unauthenticated } from '../lib/errors.js';
import type { Role } from '../lib/workflow.js';

export const SESSION_COOKIE = 'ujaas.sid';
export const ABSOLUTE_SESSION_MS = 24 * 60 * 60 * 1000; // 24 h absolute
export const IDLE_SESSION_MS = 8 * 60 * 60 * 1000; // 8 h idle

declare module 'express-session' {
  interface SessionData {
    user_id?: string;
    csrf?: string;
    created_at?: number;
  }
}

export interface AdminContext {
  id: string;
  email: string;
  display_name: string;
  role: Role;
}

declare module 'express-serve-static-core' {
  interface Request {
    admin?: AdminContext;
  }
}

/** Deny by default: loads the admin from the session, enforces the absolute timeout and is_active. */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const s = req.session;
    const hadCookie = Boolean(req.headers.cookie?.includes(`${SESSION_COOKIE}=`));
    if (!s?.user_id || !s.created_at) return next(hadCookie ? sessionExpired() : unauthenticated());
    if (Date.now() - s.created_at > ABSOLUTE_SESSION_MS) {
      await new Promise<void>((resolve) => s.destroy(() => resolve()));
      return next(sessionExpired());
    }
    const user = await AdminUser.findById(s.user_id).lean();
    if (!user || !user.is_active) {
      await new Promise<void>((resolve) => s.destroy(() => resolve()));
      return next(sessionExpired());
    }
    req.admin = {
      id: String(user._id),
      email: user.email,
      display_name: user.display_name,
      role: user.role as Role,
    };
    next();
  } catch (err) {
    next(err);
  }
};

/** Server-side role check. A role must be both enabled (ENABLED_ROLES, D-05) and listed for the route. */
export function requireRole(env: Env, ...allowed: Role[]): RequestHandler {
  return (req, _res, next) => {
    const role = req.admin?.role;
    if (!role) return next(unauthenticated());
    if (!env.ENABLED_ROLES.includes(role) || !allowed.includes(role)) return next(forbidden());
    next();
  };
}
