import { randomBytes } from 'node:crypto';

/** Latin letters and digits only; Hindi titles give an empty base, so callers fall back to a prefix and random suffix. */
export function asciiSlug(text: string): string {
  return text
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Returns a slug nobody has taken: base, base-2, base-3 ... then a random suffix. */
export async function uniqueSlug(isTaken: (slug: string) => Promise<boolean>, text: string, prefix: string): Promise<string> {
  const base = asciiSlug(text) || `${prefix}-${randomBytes(3).toString('hex')}`;
  if (!(await isTaken(base))) return base;
  for (let i = 2; i < 30; i++) {
    const candidate = `${base}-${i}`;
    if (!(await isTaken(candidate))) return candidate;
  }
  return `${base}-${randomBytes(3).toString('hex')}`;
}
