import argon2 from 'argon2';

// A short built-in deny list. A larger list can be added later; this is a floor, not a guarantee.
const COMMON = new Set([
  'password1234', 'password12345', '123456789012', 'qwertyuiop12', 'letmein12345', 'administrator',
  'welcome12345', 'changeme1234', 'iloveyou1234', 'admin1234567', 'ujaas1234567', 'ujaas@123456',
]);

export interface PasswordProblem {
  code: 'too_short' | 'common' | 'contains_email';
}

export function passwordProblems(password: string, email: string): PasswordProblem[] {
  const out: PasswordProblem[] = [];
  if ([...password].length < 12) out.push({ code: 'too_short' });
  const lower = password.toLowerCase();
  if (COMMON.has(lower) || /^(.)\1+$/.test(password)) out.push({ code: 'common' });
  const local = email.split('@')[0]?.toLowerCase();
  if (local && local.length >= 4 && lower.includes(local)) out.push({ code: 'contains_email' });
  return out;
}

export const hashPassword = (password: string) =>
  argon2.hash(password, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });

export const verifyPassword = (hash: string, password: string) =>
  argon2.verify(hash, password).catch(() => false);
