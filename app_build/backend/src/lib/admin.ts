import type { Request, RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { validationFailed, zodToFields } from './errors.js';
import type { Actor } from '../services/content.js';

/** JSON handler wrapper for admin routes: errors flow to the shared error handler. */
export const ah = (fn: (req: Request) => Promise<unknown>, status = 200): RequestHandler => async (req, res, next) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    const out = await fn(req);
    if (out === undefined) res.status(204).end();
    else res.status(status).json(out);
  } catch (err) {
    next(err);
  }
};

export function parseWith<T>(schema: ZodType<T>, input: unknown): T {
  const r = schema.safeParse(input);
  if (!r.success) throw validationFailed(zodToFields(r.error));
  return r.data;
}

export const actorOf = (req: Request): Actor => ({
  id: req.admin!.id,
  role: req.admin!.role,
  request_id: (req as { id?: string }).id,
});

export const OBJECT_ID = /^[a-f0-9]{24}$/i;
