import { randomUUID, timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';
import helmet from 'helmet';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { AppError } from '../lib/errors.js';
import type { Env } from '../config/env.js';

export const requestId: RequestHandler = (req, res, next) => {
  const incoming = req.header('x-request-id');
  const id = incoming && /^[A-Za-z0-9_-]{8,64}$/.test(incoming) ? incoming : `req_${randomUUID()}`;
  (req as { id?: string }).id = id;
  res.setHeader('X-Request-Id', id);
  next();
};

export function securityHeaders(env: Env): RequestHandler {
  return helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
    },
    hsts: env.NODE_ENV === 'production' ? { maxAge: 63072000, includeSubDomains: true } : false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    crossOriginResourcePolicy: { policy: 'same-site' },
  });
}

export const permissionsPolicy: RequestHandler = (_req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  next();
};

/** Origin check for every state-changing request (also covers public POSTs). */
export function originCheck(env: Env): RequestHandler {
  const allowed = new URL(env.PUBLIC_BASE_URL).origin;
  return (req, _res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    const origin = req.header('origin');
    if (origin) {
      if (origin !== allowed) return next(new AppError(403, 'csrf_failed', 'Origin not allowed'));
    } else if (env.NODE_ENV === 'production') {
      return next(new AppError(403, 'csrf_failed', 'Origin header required'));
    }
    next();
  };
}

/** CSRF token check for authenticated admin calls (token lives in the server-side session). */
export const requireCsrf: RequestHandler = (req, _res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const expected = req.session?.csrf;
  const given = req.header('x-csrf-token');
  if (!expected || !given) return next(new AppError(403, 'csrf_failed', 'CSRF token missing'));
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return next(new AppError(403, 'csrf_failed', 'CSRF token invalid'));
  }
  next();
};

interface LimiterOptions {
  windowMs: number;
  limit: number;
  keyFrom?: (req: Parameters<RequestHandler>[0]) => string;
}

/**
 * Rate limiter that answers with the shared error shape and Retry-After.
 * ASSUMPTION: single API instance, in-memory store. Use a shared store if several instances run.
 */
export function makeLimiter(opts: LimiterOptions): RequestHandler {
  return rateLimit({
    windowMs: opts.windowMs,
    limit: opts.limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req) => {
      const ip = ipKeyGenerator(req.ip ?? '');
      return opts.keyFrom ? `${ip}|${opts.keyFrom(req)}` : ip;
    },
    handler: (_req, res, next, options) => {
      const retry = Math.ceil(options.windowMs / 1000);
      next(
        new AppError(429, 'rate_limited', 'Too many requests', 'बहुत अधिक अनुरोध, कृपया कुछ देर बाद प्रयास करें', undefined, {
          'Retry-After': String(retry),
        }),
      );
    },
  });
}

// docs/api-contract.md §1.3. `scale` multiplies public limits (RATE_LIMIT_SCALE); the per-account login limit is never scaled.
export const limits = {
  publicGeneral: (scale = 1) => makeLimiter({ windowMs: 60_000, limit: 120 * scale }),
  // Images: a page shows many, so the limit is high; it only stops someone hammering the media lookup.
  media: (scale = 1) => makeLimiter({ windowMs: 60_000, limit: 600 * scale }),
  search: (scale = 1) => makeLimiter({ windowMs: 60_000, limit: 30 * scale }),
  submissions: (scale = 1) => makeLimiter({ windowMs: 3_600_000, limit: 5 * scale }),
  contact: (scale = 1) => makeLimiter({ windowMs: 3_600_000, limit: 5 * scale }),
  // Per address, across all emails: stops one machine trying many accounts (password spraying).
  // The per-account limit below still applies to each email.
  loginIp: (scale = 1) => makeLimiter({ windowMs: 15 * 60_000, limit: 20 * scale }),
  login: () =>
    makeLimiter({
      windowMs: 15 * 60_000,
      limit: 5,
      keyFrom: (req) => String((req.body as { email?: unknown } | undefined)?.email ?? '').toLowerCase().slice(0, 254),
    }),
};
