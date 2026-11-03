import { createHmac, randomInt } from 'node:crypto';

/** Salted HMAC for IPs and user agents. Raw values are never stored (privacy). */
export function saltedHash(value: string, salt: string): string {
  return createHmac('sha256', salt).update(value).digest('hex');
}

// No I, O, 0, 1: avoids confusion when a writer reads the reference aloud.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Random, non-sequential submission reference: UJ- + 8 characters (D-01 assumption). */
export function newReferenceId(): string {
  let s = '';
  for (let i = 0; i < 8; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return `UJ-${s}`;
}
