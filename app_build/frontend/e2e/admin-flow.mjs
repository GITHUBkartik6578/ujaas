// End-to-end check of the editorial flow in a real Chrome (T-PUB-01, T-PUB-03, T-REV-01, T-ADM-02, E5).
// Needs the API, the web server and a seeded database running. Credentials come from the environment:
//   E2E_BASE=http://localhost:3000 E2E_EMAIL=... E2E_PASSWORD=... node e2e/admin-flow.mjs
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const BASE = process.env.E2E_BASE ?? 'http://localhost:3000';
const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;
if (!EMAIL || !PASSWORD) throw new Error('Set E2E_EMAIL and E2E_PASSWORD');
const SHOTS = new URL('../../../.taste-skill/e2e/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
mkdirSync(SHOTS, { recursive: true });

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`); };

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const page = await context.newPage();
const dialogs = [];
let dialogPolicy = 'accept';
page.on('dialog', async (d) => { dialogs.push(d.message()); if (dialogPolicy === 'accept') await d.accept(); else await d.dismiss(); });

try {
  // 1. unauthenticated visitors never get admin pages
  await page.goto(`${BASE}/admin/content`);
  check('unauthenticated /admin/content redirects to the login page', page.url().endsWith('/admin/login'), page.url());
  check('login page is noindex', (await page.locator('meta[name="robots"]').getAttribute('content'))?.includes('noindex') ?? false);

  // 2. wrong password gives a generic error; right password reaches the dashboard
  await page.fill('#email', EMAIL);
  await page.fill('#password', 'definitely-not-the-password');
  await page.click('button[type=submit]');
  await page.waitForSelector('form [role=alert]');
  check('wrong password shows a generic error', (await page.textContent('form [role=alert]')).includes('सही नहीं'));
  await page.fill('#password', PASSWORD);
  await page.click('button[type=submit]');
  await page.waitForURL(`${BASE}/admin`);
  await page.waitForSelector('text=रचनाएँ स्थिति के अनुसार');
  check('login reaches the dashboard', true);
  await page.screenshot({ path: `${SHOTS}dashboard-1366.png`, fullPage: true });

  // 3. create a draft
  const stamp = Date.now().toString(36);
  const title = `ई2ई परीक्षण रचना ${stamp}`;
  await page.goto(`${BASE}/admin/content/new`);
  await page.fill('#title', title);
  await page.selectOption('#category', { index: 1 });
  await page.fill('#excerpt', 'ई2ई परीक्षण का संक्षिप्त अंश');
  await page.fill('#body', 'पहली पंक्ति\nदूसरी पंक्ति\n\nनया छंद');
  await page.selectOption('#add-author', { index: 1 });
  await page.click('button[type=submit]:has-text("सहेजें")');
  await page.waitForURL(/\/admin\/content\/[a-f0-9]{24}$/);
  const id = page.url().split('/').pop();
  check('a draft is created and the editor opens at its own address', Boolean(id));
  await page.waitForSelector('.pill-draft');

  // 4. unsaved changes are guarded
  await page.fill('#excerpt', 'बदला हुआ अंश जो सहेजा नहीं गया');
  dialogPolicy = 'dismiss';
  const before = dialogs.length;
  await page.click('nav[aria-label="प्रशासन"] >> text=रचनाएँ');
  check('leaving with unsaved changes asks first (and stays when refused)', dialogs.length === before + 1 && page.url().includes(id), dialogs.at(-1));
  dialogPolicy = 'accept';
  await page.click('button[type=submit]:has-text("सहेजें")');
  await page.waitForSelector('text=सहेजा गया');
  check('saving after the warning works', true);

  // 5. session expiry in place: clear the cookie, edit, save, sign in again in the dialog, nothing lost
  await context.clearCookies();
  await page.fill('#excerpt', 'सत्र समाप्त होने के बाद लिखा अंश');
  await page.click('button[type=submit]:has-text("सहेजें")');
  await page.waitForSelector('[role=dialog]');
  check('an expired session asks for the password in place', (await page.textContent('[role=dialog]')).includes('सत्र समाप्त'));
  await page.fill('#relogin-pw', PASSWORD);
  await page.click('[role=dialog] button[type=submit]');
  await page.waitForSelector('[role=dialog]', { state: 'detached' });
  await page.waitForSelector('text=सहेजा गया');
  check('after signing in again the save went through and the typed text was kept', (await page.inputValue('#excerpt')).includes('सत्र समाप्त होने के बाद'));

  // 6. workflow: review, approve, checks, publish
  await page.click('button:has-text("समीक्षा के लिए भेजें")');
  await page.waitForSelector('.pill-in_review');
  await page.click('button:has-text("स्वीकृत करें")');
  await page.waitForSelector('.pill-approved');
  await page.click('button:has-text("प्रकाशित करें")');
  await page.waitForSelector('.banner[role=alert]');
  const blocked = await page.textContent('.banner[role=alert]');
  check('publishing is blocked until the checks exist, naming what is missing', blocked.includes('भाषा जाँच') && blocked.includes('अनुमति नोट'), blocked);
  await page.check('label:has-text("भाषा जाँच पूरी") input');
  await page.check('label:has-text("प्रूफ़ जाँच पूरी") input');
  await page.check('label:has-text("अंतिम स्वीकृति") input');
  await page.fill('#rights', 'ई2ई परीक्षण: अनुमति ली गई');
  await page.click('button[type=submit]:has-text("सहेजें")');
  await page.waitForSelector('text=सहेजा गया');
  await page.click('button:has-text("प्रकाशित करें")');
  await page.waitForSelector('.pill-published');
  check('the item is published from the admin', true);
  await page.screenshot({ path: `${SHOTS}editor-1366.png`, fullPage: true });

  // 7. visible on the public site, found by search
  const pub = await context.newPage();
  const slug = await page.inputValue('#slug');
  const detail = await pub.goto(`${BASE}/rachna/${slug}`);
  check('the published item is public (200) with its title', detail.status() === 200 && (await pub.textContent('h1')) === title);
  const list = await pub.goto(`${BASE}/sahitya`);
  check('it appears in the literature list', list.status() === 200 && (await pub.content()).includes(title));
  await pub.goto(`${BASE}/khoj?q=${encodeURIComponent('ई2ई परीक्षण ' + stamp)}`);
  check('search finds it', (await pub.content()).includes(title));

  // 8. preview of a draft through the signed link
  await page.goto(`${BASE}/admin/content/new`);
  await page.fill('#title', `पूर्वावलोकन ${stamp}`);
  await page.selectOption('#category', { index: 1 });
  await page.fill('#excerpt', 'अंश');
  await page.fill('#body', 'केवल पूर्वावलोकन के लिए');
  await page.click('button[type=submit]:has-text("सहेजें")');
  await page.waitForURL(/\/admin\/content\/[a-f0-9]{24}$/);
  const [popup] = await Promise.all([page.waitForEvent('popup'), page.click('button:has-text("पूर्वावलोकन खोलें")')]);
  await popup.waitForLoadState();
  check('the preview link shows the draft with a not-published notice', (await popup.content()).includes('पूर्वावलोकन: यह रचना अभी प्रकाशित नहीं है'));
  check('the preview page is noindex', ((await popup.locator('meta[name="robots"]').getAttribute('content')) ?? '').includes('noindex'));
  await popup.close();

  // 9. unpublish removes it from the public site at once
  await page.goto(`${BASE}/admin/content/${id}`);
  await page.click('button:has-text("अप्रकाशित करें")');
  await page.waitForSelector('.pill-unpublished');
  const gone = await pub.goto(`${BASE}/rachna/${slug}`);
  check('after unpublishing the public address is a real 404', gone.status() === 404);
  await pub.goto(`${BASE}/sahitya`);
  check('and it is gone from the list', !(await pub.content()).includes(title));
  check('confirmation dialogs were shown for the destructive action', dialogs.some((m) => m.includes('सार्वजनिक साइट')));

  // 10. screens at phone width for review
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/admin/content`);
  await page.waitForSelector('table');
  await page.screenshot({ path: `${SHOTS}content-list-390.png`, fullPage: true });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  check('the content list does not scroll sideways at 390 px', !overflow);
  await page.goto(`${BASE}/admin/content/${id}`);
  await page.waitForSelector('#title');
  await page.screenshot({ path: `${SHOTS}editor-390.png`, fullPage: true });
  check('the editor does not scroll sideways at 390 px', !(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)));
} catch (err) {
  check('flow completed without an unexpected error', false, String(err).split('\n')[0]);
  await page.screenshot({ path: `${SHOTS}failure.png`, fullPage: true }).catch(() => undefined);
} finally {
  await browser.close();
}
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length === 0 ? 0 : 1);
