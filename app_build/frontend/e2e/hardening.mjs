// Hardening checks in a real Chrome (T-A11Y-01, T-RES-01, T-PERF-01, T-SEC-01, T-SEC-02, T-STA-01):
// every public and admin page at 390, 768, 1366 and 1920 px: sideways overflow, accessibility (axe, WCAG 2.2 AA tags),
// console errors and CSP violations, requests to other hosts, response headers, keyboard use, reduced motion,
// scripts switched off, and load timing (LCP, layout shift).
//   E2E_EMAIL=... E2E_PASSWORD=... [E2E_BASE=http://localhost:3000] node e2e/hardening.mjs
// It adds a development consent text and one published issue to the local database and removes them afterwards.
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const require = createRequire(new URL('../../backend/package.json', import.meta.url));
const { MongoClient } = require('mongodb');
const axeSource = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');

const BASE = process.env.E2E_BASE ?? 'http://localhost:3000';
const MONGO = process.env.E2E_MONGO ?? 'mongodb://127.0.0.1:27018/?replicaSet=testset';
const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;
if (!EMAIL || !PASSWORD) throw new Error('Set E2E_EMAIL and E2E_PASSWORD');
const OUT = new URL('../../../.taste-skill/hardening/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
mkdirSync(OUT, { recursive: true });
const HOST = new URL(BASE).host;

const mongo = await MongoClient.connect(MONGO);
const db = mongo.db('ujaas');
const savedConsent = await db.collection('consent_texts').find({}).toArray();
await db.collection('consent_texts').deleteMany({});
await db.collection('consent_texts').insertOne({
  version: 'dev-hardening', dev_data: true, approved_at: new Date(),
  text_original: 'DEV DATA: मूल रचना का नमूना कथन', text_publication: 'DEV DATA: प्रकाशन अनुमति का नमूना कथन', text_privacy: 'DEV DATA: गोपनीयता का नमूना कथन',
});
// one published issue so the magazine pages have something to show
const cover = await db.collection('media_assets').findOne({ storage_key: 'dev-cover-with-alt.png' });
const members = await db.collection('contents').find({ status: 'published' }).limit(3).toArray();
const issueId = (await db.collection('magazine_issues').insertOne({
  title: 'कठोरीकरण परीक्षण अंक', slug: 'kathorikaran-ank', issue_number: 99999, period_label: 'जनवरी–मार्च', publication_date: new Date('2026-03-01'),
  cover_media_id: cover?._id, editorial_intro: 'परीक्षण के लिए अंक का परिचय।', publication_details: 'परीक्षण विवरण', status: 'published', show_in_archive: true,
  published_at: new Date('2026-03-01'), dev_data: true, created_at: new Date(), updated_at: new Date(),
})).insertedId;
await db.collection('issue_items').insertMany(members.map((m, i) => ({ issue_id: issueId, content_id: m._id, position: i + 1, section_label: i === 0 ? 'पहला खंड' : 'दूसरा खंड' })));
const anyContent = await db.collection('contents').findOne({});
const anyIssueAdmin = String(issueId);

const publicPages = [
  '/', '/sahitya', '/sahitya/kavita', '/rachna/aangan-ki-dhoop', '/rachnakar', '/rachnakar/rachnakar-ek', '/sangrah', '/sangrah/namuna-sangrah',
  '/khoj?q=%E0%A4%A8%E0%A4%AE%E0%A5%82%E0%A4%A8%E0%A4%BE', '/khoj?q=zzzz-kuch-nahin', '/e-patrika', '/e-patrika/kathorikaran-ank', '/rachna-bhejein', '/sampark', '/nope-not-here',
];
const adminPages = [
  '/admin', '/admin/content', '/admin/content/new', `/admin/content/${anyContent._id}`, '/admin/authors', '/admin/categories', '/admin/collections',
  '/admin/media', '/admin/homepage', '/admin/settings', '/admin/audit', '/admin/submissions', '/admin/messages', '/admin/issues', `/admin/issues/${anyIssueAdmin}`,
];
const widths = [390, 768, 1366, 1920];
const report = { overflow: [], axe: [], console: [], thirdParty: [], headers: [], perf: [], keyboard: [], misc: [] };
const note = (kind, text) => { report[kind].push(text); console.log(`FAIL  [${kind}] ${text}`); };
let checks = 0;
const pass = () => { checks += 1; };

const browser = await chromium.launch({ channel: 'chrome', headless: true });

async function inspectPage(context, path, { axeWidths = [390, 1366] } = {}) {
  const page = await context.newPage();
  const errors = [];
  const foreign = new Set();
  const expected404 = path.startsWith('/nope');
  page.on('console', (m) => { if (m.type() === 'error' && !(expected404 && /404/.test(m.text()))) errors.push(`${m.text().slice(0, 120)} ${m.location().url ?? ''}`); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${String(e).slice(0, 160)}`));
  page.on('request', (r) => { const u = new URL(r.url()); if (u.protocol.startsWith('http') && u.host !== HOST) foreign.add(u.host); });
  page.on('response', (r) => { if (r.status() >= 500) errors.push(`HTTP ${r.status()} ${r.url()}`); });
  for (const w of widths) {
    await page.setViewportSize({ width: w, height: 900 });
    const res = await page.goto(BASE + path, { waitUntil: 'networkidle' });
    if (!res || res.status() >= 500) note('misc', `${path} @${w}: HTTP ${res?.status()}`);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    over > 1 ? note('overflow', `${path} @${w}px scrolls sideways by ${over}px`) : pass();
    if (axeWidths.includes(w)) {
      await page.emulateMedia({ reducedMotion: 'reduce' }); // axe must judge the settled page, not a frame of a reveal animation
      await page.evaluate(axeSource);
      const result = await page.evaluate(async () => {
        const r = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } });
        return r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, sample: v.nodes[0]?.html.slice(0, 120), help: v.help }));
      });
      if (result.length === 0) pass();
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      for (const v of result) note('axe', `${path} @${w}px ${v.id} (${v.impact}, ${v.nodes} node(s)): ${v.help} e.g. ${v.sample}`);
    }
  }
  const uniqueErrors = [...new Set(errors)];
  uniqueErrors.length === 0 ? pass() : uniqueErrors.forEach((e) => note('console', `${path}: ${e}`));
  foreign.size === 0 ? pass() : note('thirdParty', `${path} contacted ${[...foreign].join(', ')}`);
  await page.close();
}

try {
  // ---------- public pages ----------
  const pubCtx = await browser.newContext();
  for (const p of publicPages) await inspectPage(pubCtx, p);

  // headers on the web server (T-SEC-01)
  const head = await pubCtx.request.get(BASE + '/rachna/aangan-ki-dhoop');
  const h = head.headers();
  const csp = h['content-security-policy'] ?? '';
  const need = [
    ['x-content-type-options', (v) => v === 'nosniff'], ['referrer-policy', (v) => !!v], ['permissions-policy', (v) => /camera=\(\)/.test(v)],
    ['strict-transport-security', (v) => /max-age=\d+/.test(v)], ['content-security-policy', () => /default-src 'self'/.test(csp) && /frame-ancestors 'none'/.test(csp) && /script-src[^;]*nonce-/.test(csp) && /object-src 'none'/.test(csp)],
  ];
  for (const [name, ok] of need) ok(h[name] ?? '') ? pass() : note('headers', `public page header ${name} missing or wrong: ${h[name]}`);
  /'unsafe-inline'/.test(csp.match(/script-src[^;]*/)?.[0] ?? '') ? note('headers', 'script-src allows unsafe-inline') : pass();
  h['x-powered-by'] ? note('headers', 'x-powered-by is exposed') : pass();
  const apiHead = await pubCtx.request.get(BASE + '/api/v1/health');
  (apiHead.headers()['x-content-type-options'] === 'nosniff') ? pass() : note('headers', 'API response lacks nosniff');
  const robots = await (await pubCtx.request.get(BASE + '/robots.txt')).text();
  /Disallow: \//.test(robots) ? pass() : note('headers', 'robots.txt does not block a non-production site');
  /noindex/.test(await (await pubCtx.request.get(BASE + '/')).text()) ? pass() : note('headers', 'home page is indexable while indexing is off');

  // keyboard: the skip link is the first stop and works; focus is visible (T-A11Y-01)
  const kp = await pubCtx.newPage();
  await kp.setViewportSize({ width: 1366, height: 900 });
  await kp.goto(BASE + '/sahitya', { waitUntil: 'networkidle' });
  await kp.keyboard.press('Tab');
  const first = await kp.evaluate(() => ({ text: document.activeElement?.textContent?.trim(), cls: document.activeElement?.className }));
  /skip-link/.test(first.cls) ? pass() : report.keyboard.push(`first Tab stop is not the skip link: ${JSON.stringify(first)}`);
  await kp.keyboard.press('Enter');
  const target = await kp.evaluate(() => location.hash);
  target === '#main' ? pass() : report.keyboard.push(`skip link did not move to main: ${target}`);
  let visibleFocus = 0, stops = 0;
  await kp.goto(BASE + '/sahitya', { waitUntil: 'networkidle' });
  for (let i = 0; i < 25; i++) {
    await kp.keyboard.press('Tab');
    const f = await kp.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return null; const s = getComputedStyle(e); return { w: s.outlineWidth, st: s.outlineStyle, tag: e.tagName }; });
    if (f) { stops++; if (f.st !== 'none' && parseFloat(f.w) >= 2) visibleFocus++; }
  }
  stops > 5 && visibleFocus === stops ? pass() : report.keyboard.push(`only ${visibleFocus} of ${stops} focus stops show a focus ring of 2px or more`);
  // a text search works from the keyboard alone
  await kp.goto(BASE + '/', { waitUntil: 'networkidle' });
  await kp.focus('#header-q');
  await kp.keyboard.type('नमूना');
  await kp.keyboard.press('Enter');
  await kp.waitForURL(/\/khoj\?q=/);
  pass();
  // pick list on the home page responds to the keyboard
  await kp.goto(BASE + '/', { waitUntil: 'networkidle' });
  await kp.locator('.pick-title button').nth(1).focus();
  const stage = await kp.textContent('.stage-title');
  stage && stage.length > 0 ? pass() : report.keyboard.push('focusing a pick does not show it on the stage');
  await kp.close();
  report.keyboard.forEach((m) => console.log(`FAIL  [keyboard] ${m}`));

  // reduced motion and scripts off
  const rm = await browser.newContext({ reducedMotion: 'reduce' });
  const rp = await rm.newPage();
  await rp.goto(BASE + '/', { waitUntil: 'networkidle' });
  const animating = await rp.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length);
  animating === 0 ? pass() : note('misc', `${animating} animation(s) still run with reduced motion`);
  await rm.close();
  const noJs = await browser.newContext({ javaScriptEnabled: false });
  const np = await noJs.newPage();
  for (const p of ['/', '/rachna/aangan-ki-dhoop', '/sahitya', '/e-patrika/kathorikaran-ank']) {
    await np.goto(BASE + p);
    const txt = (await np.textContent('main')) ?? '';
    txt.trim().length > 40 && (await np.locator('h1').count()) === 1 ? pass() : note('misc', `${p} has no readable content without scripts`);
  }
  await noJs.close();

  // load timing: LCP and layout shift (a local server, so absolute values are only a floor)
  const perfCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  for (const p of ['/', '/rachna/aangan-ki-dhoop', '/sahitya', '/e-patrika/kathorikaran-ank']) {
    const pp = await perfCtx.newPage();
    await pp.addInitScript(() => {
      window.__m = { lcp: 0, cls: 0 };
      new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__m.lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__m.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
    });
    await pp.goto(BASE + p, { waitUntil: 'load' });
    await pp.waitForTimeout(1500);
    const m = await pp.evaluate(() => window.__m);
    report.perf.push({ path: p, lcp_ms: Math.round(m.lcp), cls: Number(m.cls.toFixed(3)) });
    m.lcp <= 2500 && m.cls <= 0.1 ? pass() : note('perf', `${p}: LCP ${Math.round(m.lcp)} ms, CLS ${m.cls.toFixed(3)}`);
    await pp.close();
  }
  await perfCtx.close();
  await pubCtx.close();

  // ---------- admin pages ----------
  const adminCtx = await browser.newContext();
  const lp = await adminCtx.newPage();
  await lp.goto(BASE + '/admin/login', { waitUntil: 'networkidle' });
  await lp.fill('#email', EMAIL);
  await lp.fill('#password', PASSWORD);
  await lp.click('button[type=submit]');
  await lp.waitForURL(BASE + '/admin');
  await lp.close();
  await inspectPage(await browser.newContext(), '/admin/login');
  for (const p of adminPages) await inspectPage(adminCtx, p);
  await adminCtx.close();
} catch (err) {
  note('misc', `unexpected error: ${String(err).split('\n')[0]}`);
} finally {
  await db.collection('issue_items').deleteMany({ issue_id: issueId });
  await db.collection('magazine_issues').deleteOne({ _id: issueId });
  await db.collection('consent_texts').deleteMany({});
  if (savedConsent.length > 0) await db.collection('consent_texts').insertMany(savedConsent);
  await mongo.close();
  await browser.close();
}
writeFileSync(`${OUT}report.json`, JSON.stringify({ checks, ...report }, null, 2));
const failures = report.overflow.length + report.axe.length + report.console.length + report.thirdParty.length + report.headers.length + report.keyboard.length + report.perf.filter((x) => x.lcp_ms > 2500 || x.cls > 0.1).length + report.misc.length;
console.log(`\n${checks} checks passed, ${failures} problem(s). LCP/CLS (390 px, local server):`);
for (const p of report.perf) console.log(`  ${p.path}  LCP ${p.lcp_ms} ms  CLS ${p.cls}`);
process.exit(failures === 0 ? 0 : 1);
