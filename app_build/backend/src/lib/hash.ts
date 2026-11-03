import { createHmac, randomInt } from 'node:crypto';

/** Salted HMAC for IPs and user agents. Raw values are never stored (privacy). */
export function saltedHash(value: string, salt: string): string {
  return createHmac('sha256', salt).update(value).digest('hex');
}

/**
 * Derives a separate key for one purpose from a master secret, so one secret is never used for two jobs
 * (session cookies, preview links, media links each get their own key).
 */
export function deriveKey(secret: string, purpose: 'preview' | 'media'): string {
  return createHmac('sha256', secret).update(`ujaas:${purpose}:v1`).digest('hex');
}

// No I, O, 0, 1: avoids confusion when a writer reads the reference aloud.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Random, non-sequential submission reference: UJ- + 8 characters (D-01 assumption). */
export function newReferenceId(): string {
  let s = '';
  for (let i = 0; i < 8; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return `UJ-${s}`;
}
