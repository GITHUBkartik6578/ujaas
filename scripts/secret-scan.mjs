// Secret scan (security checklist: no credentials in the repository).
//   node scripts/secret-scan.mjs
// Looks at every file git would commit (tracked or new, not ignored) for private keys, connection strings with a
// password, cloud keys and assignments of long values to secret-like names. Lines marked `secret-scan-ignore` and
// test or example files are skipped. A finding is a reason to rotate the secret, not just to delete the line.
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';

const RULES = [
  ['private key block', /-----BEGIN (RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/],
  ['connection string with password', /(mongodb(\+srv)?|postgres(ql)?|mysql|redis):\/\/[^/\s:@]+:[^@\s/]{3,}@/],
  ['AWS access key id', /\bAKIA[0-9A-Z]{16}\b/],
  ['GitHub token', /\bgh[pousr]_[A-Za-z0-9]{30,}\b/],
  ['Slack token', /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/],
  ['generic API key', /\b(api[_-]?key|secret[_-]?key|access[_-]?token|auth[_-]?token)\b\s*[:=]\s*['"][A-Za-z0-9_\-/+=]{20,}['"]/i],
  ['long secret assignment', /\b(SESSION_SECRET|IP_HASH_SALT|CSRF_SECRET|JWT_SECRET|DB_PASSWORD|ADMIN_PASSWORD)\b\s*=\s*[^\s#]{12,}/],
];
const files = execFileSync('git', ['ls-files', '-co', '--exclude-standard'], { encoding: 'utf8' }).split('\n').filter(Boolean)
  .filter((f) => !/(package-lock\.json|\.png|\.jpg|\.jpeg|\.webp|\.woff2?|\.pdf|\.ico)$/i.test(f) && !/^designs\//.test(f) && !/^\.agents\/\.skills\//.test(f))
  .filter((f) => !/(^|\/)(tests|__tests__)\//.test(f) && !/\.env\.example$/.test(f) && !/^scripts\/secret-scan\.mjs$/.test(f));

const hits = [];
for (const f of files) {
  try { if (statSync(f).size > 1_000_000) continue; } catch { continue; }
  const text = readFileSync(f, 'utf8');
  text.split('\n').forEach((line, i) => {
    if (/secret-scan-ignore/.test(line)) return;
    for (const [name, re] of RULES) if (re.test(line)) hits.push(`${f}:${i + 1}  ${name}`);
  });
}
console.log(`Scanned ${files.length} file(s).`);
for (const h of hits) console.log(`HIT  ${h}`);
console.log(hits.length === 0 ? 'No secrets found.' : `${hits.length} possible secret(s).`);
process.exit(hits.length === 0 ? 0 : 1);
