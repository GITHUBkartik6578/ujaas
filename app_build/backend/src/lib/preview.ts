import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Env } from '../config/env.js';
import { deriveKey } from './hash.js';

const TTL_MS = 30 * 60 * 1000; // a preview link (and the private images it shows) works for 30 minutes

/** The preview-link key, derived from SESSION_SECRET so the session secret itself never signs anything else. */
export const previewKey = (env: Pick<Env, 'SESSION_SECRET'>) => deriveKey(env.SESSION_SECRET, 'preview');
/** The key for short-lived links to private images shown inside a preview. */
export const mediaKey = (env: Pick<Env, 'SESSION_SECRET'>) => deriveKey(env.SESSION_SECRET, 'media');

const sign = (data: string, secret: string) => createHmac('sha256', secret).update(data).digest('base64url');

function sameSig(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Signed, time-limited token for previewing an unpublished item. Contains only the id and the expiry. */
export function signPreview(contentId: string, secret: string, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ id: contentId, exp: now + TTL_MS })).toString('base64url');
  return `${payload}.${sign(payload, secret)}`;
}

export function verifyPreview(token: string, secret: string, now = Date.now()): string | null {
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  if (!sameSig(sig, sign(payload, secret))) return null;
  try {
    const { id, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { id?: string; exp?: number };
    if (typeof id !== 'string' || typeof exp !== 'number' || exp < now) return null;
    return id;
  } catch {
    return null;
  }
}

/** Short-lived token that lets a preview show one private image file: `<expiry>.<signature>`. */
export function signMediaToken(storageKey: string, secret: string, now = Date.now()): string {
  const exp = String(now + TTL_MS);
  return `${exp}.${sign(`${storageKey}.${exp}`, secret)}`;
}

export function verifyMediaToken(storageKey: string, token: string, secret: string, now = Date.now()): boolean {
  const [exp, sig] = token.split('.');
  if (!exp || !sig || !/^\d{1,15}$/.test(exp) || Number(exp) < now) return false;
  return sameSig(sig, sign(`${storageKey}.${exp}`, secret));
}
