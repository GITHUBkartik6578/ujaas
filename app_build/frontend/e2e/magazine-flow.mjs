// End-to-end check of the e-magazine in a real Chrome (T-MAG-01..03).
// Needs the API, the web server and the seeded development database running:
//   E2E_EMAIL=... E2E_PASSWORD=... [E2E_BASE=http://localhost:3000] node e2e/magazine-flow.mjs
// It creates its own issues and removes them, and restores the one creation it unpublishes.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const require = createRequire(new URL('../../backend/package.json', import.meta.url));
const { MongoClient } = require('mongodb');
const BASE = process.env.E2E_BASE ?? 'http://localhost:3000';
const MONGO = process.env.E2E_MONGO ?? 'mongodb://127.0.0.1:27018/?replicaSet=testset';
const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;
if (!EMAIL || !PASSWORD) throw new Error('Set E2E_EMAIL and E2E_PASSWORD');
const SHOTS = new URL('../../../.taste-skill/e2e/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
mkdirSync(SHOTS, { recursive: true });

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`); };

const mongo = await MongoClient.connect(MONGO);
const db = mongo.db('ujaas');
const stamp = Date.now().toString(36);
const T1 = 'नमूना कविता: आँगन की धूप';
const T2 = 'नमूना ग़ज़ल: ज़िंदगी';
const T3 = 'नमूना कहानी: बारिश की रात';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const page = await context.newPage();
page.on('dialog', (d) => d.accept());
const pub = await context.newPage();

async function makeIssue(title, number, date, period) {
  await page.goto(`${BASE}/admin/issues`);
  await page.click('button:has-text("नया अंक")');
  await page.fill('#i-title', title);
  await page.fill('#i-num', String(number));
  await page.fill('#i-date', date);
  await page.fill('#i-period', period);
  await page.click('button[type=submit]:has-text("बनाएँ")');
  await page.waitForURL(/\/admin\/issues\/[a-f0-9]{24}$/);
  await page.waitForSelector('#t');
  return page.url().split('/').pop();
}
const base = 9000 + (Date.now() % 900);

try {
  const existing = await db.collection('magazine_issues').countDocuments({ status: 'published' });
  if (existing === 0) {
    const r = await pub.goto(`${BASE}/e-patrika`);
    check('before the first issue the page is an honest "coming soon", with no covers', r.status() === 200 && (await pub.content()).includes('पहला अंक जल्द आ रहा है') && (await pub.locator('.issue-tile, .current-issue').count()) === 0);
    check('and the home page has no issue block', !(await (await pub.goto(`${BASE}/`)).text()).includes('नवीनतम ई-पत्रिका'));
  }

  // sign in
  await page.goto(`${BASE}/admin/login`);
  await page.fill('#email', EMAIL);
  await page.fill('#password', PASSWORD);
  await page.click('button[type=submit]');
  await page.waitForURL(`${BASE}/admin`);

  // 1. build an issue: details, cover, ordered contents with section labels
  const idA = await makeIssue(`ई2ई अंक ${stamp}`, base, '2026-06-15', 'अप्रैल–जून');
  await page.click('button:has-text("अंक प्रकाशित करें")');
  await page.waitForSelector('.banner[role=alert]');
  const blocked = await page.textContent('.banner[role=alert]');
  check('publishing without a cover and contents is refused, naming what is missing', blocked.includes('आवरण चित्र') && blocked.includes('कम से कम एक प्रकाशित रचना'), blocked);

  const coverValue = await page.locator('#cv option', { hasText: 'नमूना आवरण' }).first().getAttribute('value');
  await page.selectOption('#cv', coverValue);
  await page.fill('#intro', 'ई2ई अंक का संपादकीय परिचय');
  await page.fill('#det', 'ई2ई प्रकाशन विवरण');
  for (const t of [T1, T2, T3]) await page.selectOption('#add', { label: t });
  await page.fill('#sec-0', 'काव्य खंड');
  await page.fill('#sec-1', 'काव्य खंड');
  await page.fill('#sec-2', 'कथा खंड');
  await page.click(`button[aria-label="${T1} नीचे करें"]`); // reorder: T2, T1, T3
  await page.click('button[type=submit]:has-text("सहेजें")');
  await page.waitForSelector('text=सहेजा गया');
  const order = await page.locator('.ordered-title').allTextContents();
  check('contents can be reordered with buttons and the order is saved', order[0].includes('ज़िंदगी') && order[1].includes('आँगन') && order[2].includes('बारिश'));
  await page.click('button:has-text("अंक प्रकाशित करें")');
  await page.waitForSelector('.pill-published');
  check('the issue is published from the admin', true);
  await page.screenshot({ path: `${SHOTS}issue-editor-1366.png`, fullPage: true });

  // 2. a second issue stays a draft
  const idB = await makeIssue(`ई2ई मसौदा अंक ${stamp}`, base + 1, '2026-07-01', 'जुलाई–सितंबर');
  const draftSlug = await page.inputValue('#slug');

  // 3. public landing, archive, issue page
  await pub.goto(`${BASE}/e-patrika`);
  const landing = await pub.content();
  check('the landing page names the newest issue and lists the archive with a year filter', landing.includes(`ई2ई अंक ${stamp}`) && landing.includes('सभी वर्ष') && (await pub.locator('a[href="/e-patrika?year=2026"]').count()) === 1);
  check('a draft issue is not in the archive', !landing.includes(`ई2ई मसौदा अंक ${stamp}`));
  const draftRes = await pub.goto(`${BASE}/e-patrika/${draftSlug}`);
  check('a draft issue address is a real 404', draftRes.status() === 404);
  await pub.goto(`${BASE}/e-patrika?year=2019`);
  check('a year with no issues says so', (await pub.content()).includes('इस वर्ष का कोई अंक नहीं है'));

  const slugA = await db.collection('magazine_issues').findOne({ title: `ई2ई अंक ${stamp}` }).then((d) => d.slug);
  const issueRes = await pub.goto(`${BASE}/e-patrika/${slugA}`);
  check('the issue page opens (200)', issueRes.status() === 200);
  const headings = await pub.locator('h3').allTextContents();
  check('contents are grouped under their section labels, in the saved order', headings.join('|').includes('काव्य खंड') && headings.join('|').includes('कथा खंड') && (await pub.locator('.contents-list a').allTextContents())[0].includes('ज़िंदगी'));
  check('the cover, number, period and publishing details are shown', (await pub.locator('.issue-cover-large img').count()) === 1 && (await pub.textContent('.facts')).includes('अप्रैल–जून') && (await pub.textContent('.facts')).includes('ई2ई प्रकाशन विवरण'));
  const ld = await pub.locator('script[type="application/ld+json"]').first().textContent();
  check('the issue carries PublicationIssue markup', ld.includes('PublicationIssue'));
  await pub.screenshot({ path: `${SHOTS}issue-page-1366.png`, fullPage: true });

  // 4. reading through the issue: prev/next, canonical stays on the article
  await pub.click(`.contents-list a:has-text("आँगन")`);
  await pub.waitForURL(/\/rachna\/aangan-ki-dhoop\?issue=/);
  check('reading through an issue shows previous and next in that issue', (await pub.locator('.issue-nav a[rel=prev]').count()) === 1 && (await pub.locator('.issue-nav a[rel=next]').count()) === 1);
  check('the article keeps its own canonical address', (await pub.locator('link[rel=canonical]').getAttribute('href')).endsWith('/rachna/aangan-ki-dhoop'));
  await pub.click('.issue-nav a[rel=next]');
  await pub.waitForURL(/\/rachna\/barish-ki-raat\?issue=/);
  check('next leads to the next article in the issue', (await pub.textContent('h1')).includes('बारिश'));

  // 5. the home page shows the current issue
  await pub.goto(`${BASE}/`);
  check('the home page shows the current issue with its cover', (await pub.content()).includes(`ई2ई अंक ${stamp}`) && (await pub.locator('.plate-cover img').count()) === 1);

  // 6. a creation that is no longer published leaves the public issue, with a warning in the admin
  await db.collection('contents').updateOne({ title: T3 }, { $set: { status: 'unpublished' } });
  await pub.goto(`${BASE}/e-patrika/${slugA}`);
  check('an unpublished creation disappears from the public issue page', !(await pub.content()).includes('बारिश की रात'));
  await page.goto(`${BASE}/admin/issues/${idA}`);
  await page.waitForSelector('.ordered-title');
  check('the admin editor warns that the member is not published', (await page.textContent('.ordered')).includes('प्रकाशित नहीं है'));

  // 7. archive removes the issue everywhere public
  await page.click('button:has-text("संग्रहित करें")');
  await page.waitForSelector('.pill-archived');
  const gone = await pub.goto(`${BASE}/e-patrika/${slugA}`);
  check('an archived issue is a real 404 and leaves the archive', gone.status() === 404 && !(await (await pub.goto(`${BASE}/e-patrika`)).text()).includes(`ई2ई अंक ${stamp}`));

  // 8. phone widths
  await db.collection('contents').updateOne({ title: T3 }, { $set: { status: 'published' } });
  await page.click('button:has-text("मसौदे में लौटाएँ")');
  await page.waitForSelector('.pill-draft');
  await page.click('button:has-text("अंक प्रकाशित करें")');
  await page.waitForSelector('.pill-published');
  await pub.setViewportSize({ width: 390, height: 844 });
  await pub.goto(`${BASE}/e-patrika/${slugA}`);
  await pub.screenshot({ path: `${SHOTS}issue-page-390.png`, fullPage: true });
  check('the issue page does not scroll sideways at 390 px', !(await pub.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)));
  await pub.goto(`${BASE}/e-patrika`);
  await pub.screenshot({ path: `${SHOTS}magazine-390.png`, fullPage: true });
  check('the magazine landing does not scroll sideways at 390 px', !(await pub.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/admin/issues`);
  await page.waitForSelector('table');
  check('the issue list does not scroll sideways at 390 px', !(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)));
  void idB;
} catch (err) {
  check('flow completed without an unexpected error', false, String(err).split('\n')[0]);
  await page.screenshot({ path: `${SHOTS}failure-magazine.png`, fullPage: true }).catch(() => undefined);
} finally {
  const ours = await db.collection('magazine_issues').find({ title: { $regex: `ई2ई.*${stamp}` } }).toArray();
  const ids = ours.map((d) => d._id);
  await db.collection('issue_items').deleteMany({ issue_id: { $in: ids } });
  await db.collection('magazine_issues').deleteMany({ _id: { $in: ids } });
  await db.collection('contents').updateOne({ title: T3 }, { $set: { status: 'published' } });
  await mongo.close();
  await browser.close();
}
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length === 0 ? 0 : 1);
