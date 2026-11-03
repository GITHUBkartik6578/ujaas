// Link crawl for T-NAV-01 / T-CARD-01: follows every internal link from the home page and reports
// broken links, placeholder links, pages without exactly one h1, and pages without lang="hi".
// Usage: node scripts/crawl.mjs http://localhost:3000
const base = (process.argv[2] ?? 'http://localhost:3000').replace(/\/$/, '');
const seen = new Map(); // path -> status
const problems = [];
const queue = ['/'];

const decode = (s) => s.replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/&quot;/g, '"');

while (queue.length > 0 && seen.size < 400) {
  const path = queue.shift();
  if (seen.has(path)) continue;
  let res;
  try {
    res = await fetch(base + path, { redirect: 'manual' });
  } catch (e) {
    seen.set(path, 0);
    problems.push(`${path}: request failed (${e.message})`);
    continue;
  }
  seen.set(path, res.status);
  if (res.status >= 300 && res.status < 400) continue;
  if (res.status !== 200) {
    problems.push(`${path}: HTTP ${res.status}`);
    continue;
  }
  const html = await res.text();
  if (!/<html[^>]*lang="hi"/.test(html)) problems.push(`${path}: missing lang="hi"`);
  const h1s = (html.match(/<h1[\s>]/g) ?? []).length;
  if (h1s !== 1) problems.push(`${path}: ${h1s} h1 elements`);
  if (!/<title>[^<]+<\/title>/.test(html)) problems.push(`${path}: missing title`);
  for (const m of html.matchAll(/<a\s[^>]*href="([^"]*)"/g)) {
    const href = decode(m[1]);
    if (href === '#' || href === '' || href.startsWith('#') && href.length === 1) {
      problems.push(`${path}: placeholder link href="${href}"`);
      continue;
    }
    if (/^(mailto:|tel:|https?:\/\/)/.test(href) || href.startsWith('#')) continue;
    if (href.startsWith('/_next') || href.startsWith('/media/')) continue;
    const clean = href.split('#')[0];
    if (clean && !seen.has(clean)) queue.push(clean);
  }
}

const broken = [...seen].filter(([, s]) => s !== 200 && !(s >= 300 && s < 400));
console.log(JSON.stringify({ pages_checked: seen.size, broken, problems }, null, 2));
process.exit(broken.length === 0 && problems.length === 0 ? 0 : 1);
