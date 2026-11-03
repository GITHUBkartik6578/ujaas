import { createHmac, timingSafeEqual } from 'node:crypto';

const TTL_MS = 30 * 60 * 1000; // a preview link works for 30 minutes

/** Signed, time-limited token for previewing an unpublished item. Contains only the id and the expiry. */
export function signPreview(contentId: string, secret: string, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ id: contentId, exp: now + TTL_MS })).toString('base64url');
  const sig = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyPreview(token: string, secret: string, now = Date.now()): string | null {
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = createHmac('sha256', secret).update(payload).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const { id, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { id?: string; exp?: number };
    if (typeof id !== 'string' || typeof exp !== 'number' || exp < now) return null;
    return id;
  } catch {
    return null;
  }
}
