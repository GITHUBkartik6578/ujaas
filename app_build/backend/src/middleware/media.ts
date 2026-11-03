import type { RequestHandler } from 'express';
import type { Env } from '../config/env.js';
import { notFound } from '../lib/errors.js';
import { mediaKey, verifyMediaToken } from '../lib/preview.js';
import { MediaAsset } from '../models/index.js';
import { sessionAdmin } from './auth.js';

/** Stored files are always `<32 hex>.<ext>` (services/media.ts storeImage). */
export const STORAGE_KEY = /^[a-f0-9]{32}\.(?:jpg|png|webp)$/;

/**
 * Access check in front of the uploaded-images folder.
 * - a file with no media record (never registered, or deleted) is a 404;
 * - a public image is served to anyone and may be cached;
 * - a private image is served only to a signed-in admin, or with a short-lived signed `?t=` link that a preview
 *   page carries. Everyone else gets the same 404 as a missing file, so private files cannot be probed.
 */
export function mediaAccess(env: Env): RequestHandler {
  const secret = mediaKey(env);
  return async (req, res, next) => {
    try {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next(notFound());
      const key = req.path.replace(/^\//, '');
      if (!STORAGE_KEY.test(key)) return next(notFound());
      const asset = (await MediaAsset.findOne({ storage_key: key }).select('is_public').lean()) as { is_public?: boolean } | null;
      if (!asset) return next(notFound());
      if (asset.is_public) {
        res.locals.mediaPublic = true;
        return next();
      }
      const token = typeof req.query.t === 'string' ? req.query.t : undefined;
      if ((token && verifyMediaToken(key, token, secret)) || (await sessionAdmin(req))) return next();
      next(notFound());
    } catch (err) {
      next(err);
    }
  };
}
