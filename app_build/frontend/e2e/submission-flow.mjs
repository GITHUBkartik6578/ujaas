// End-to-end check of the writer submission flow in a real Chrome (T-SUB-01..06, T-CON-01).
// Needs the API, the web server and a seeded database running. Credentials come from the environment:
//   E2E_EMAIL=... E2E_PASSWORD=... [E2E_BASE=http://localhost:3000] node e2e/submission-flow.mjs
// The script adds a development consent text to the database for the open-form half and removes it afterwards.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const require = createRequire(new URL('../../backend/package.json', import.meta.url));
const { MongoClient } = require('mongodb');

const BASE = process.env.E2E_BASE ?? 'http://localhost:3000';
const MONGO = process.env.E2E_MONGO ?? 'mongodb://127.0.0.1:27018/?replicaSet=testset';
const DB = process.env.E2E_DB ?? 'ujaas';
const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;
if (!EMAIL || !PASSWORD) throw new Error('Set E2E_EMAIL and E2E_PASSWORD');
const SHOTS = new URL('../../../.taste-skill/e2e/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
mkdirSync(SHOTS, { recursive: true });

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`); };

const mongo = await MongoClient.connect(MONGO);
const db = mongo.db(DB);
const consentRows = db.collection('consent_texts');
const savedConsent = await consentRows.find({}).toArray();
await consentRows.deleteMany({}); // start closed, whatever the database had

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const page = await context.newPage();
const dialogs = [];
page.on('dialog', async (d) => { dialogs.push(d.message()); await d.accept(); });
const stamp = Date.now().toString(36);

try {
  // 1. closed until the owner supplies the consent wording
  let res = await page.goto(`${BASE}/rachna-bhejein`);
  check('the form page is closed while no consent text exists', res.status() === 200 && (await page.content()).includes('रचनाएँ अभी स्वीकार नहीं की जा रहीं') && (await page.locator('form').count()) === 1 /* only the search box */);
  await page.goto(`${BASE}/`);
  check('and no link or button invites writers to it', (await page.locator('a[href="/rachna-bhejein"]').count()) === 0);

  // 2. open it with a clearly marked development consent text
  await consentRows.insertOne({
    version: 'dev-e2e', dev_data: true, approved_at: new Date(),
    text_original: 'DEV DATA: मूल रचना का नमूना कथन', text_publication: 'DEV DATA: प्रकाशन अनुमति का नमूना कथन', text_privacy: 'DEV DATA: गोपनीयता का नमूना कथन',
  });
  await page.goto(`${BASE}/`);
  check('once open, the header links to the form', (await page.locator('header a[href="/rachna-bhejein"]').count()) === 1);
  await page.goto(`${BASE}/rachna-bhejein`);
  check('the form shows the three consent statements, unticked', (await page.locator('.consents input[type=checkbox]').count()) === 3 && (await page.locator('.consents input:checked').count()) === 0);

  const fill = async (title) => {
    await page.fill('#display_name', 'ई2ई लेखक');
    await page.fill('#email', `e2e-${stamp}@example.org`);
    await page.selectOption('#creation_type', 'kavita');
    await page.fill('#title', title);
    await page.fill('#body', `ई2ई ${stamp} पहली पंक्ति\nदूसरी पंक्ति`);
  };

  // 3. a script that fills the form instantly is told "thanks" and nothing is stored
  const botTitle = `तेज़ बॉट ${stamp}`;
  await fill(botTitle);
  for (const box of await page.locator('.consents input[type=checkbox]').all()) await box.check();
  await page.click('button[type=submit]:has-text("रचना भेजें")');
  await page.waitForURL(/\/rachna-bhejein\/prapti$/);
  check('a form sent in under three seconds looks accepted', /UJ-[A-Z2-9]{8}/.test(await page.textContent('.reference')));

  // 4. consent is required (browser stops a form with an unticked box)
  await page.goto(`${BASE}/rachna-bhejein`);
  await page.waitForTimeout(3300);
  await fill(`असली रचना ${stamp}`);
  await page.locator('.consents input[type=checkbox]').nth(0).check();
  await page.locator('.consents input[type=checkbox]').nth(1).check();
  await page.click('button[type=submit]:has-text("रचना भेजें")');
  await page.waitForTimeout(500);
  check('with one consent unticked the form does not send', page.url().endsWith('/rachna-bhejein'));
  await page.locator('.consents input[type=checkbox]').nth(2).check();

  // 5. a server failure keeps everything the writer typed
  await page.route('**/api/v1/submissions', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { code: 'service_unavailable' } }) }));
  await page.click('button[type=submit]:has-text("रचना भेजें")');
  await page.waitForSelector('.form-banner');
  check('a 503 keeps the text and says it is safe to retry', (await page.inputValue('#title')).includes('असली रचना') && (await page.textContent('.form-banner')).includes('सुरक्षित'));
  await page.screenshot({ path: `${SHOTS}submit-1366.png`, fullPage: true });
  await page.reload();
  const restored = await page.waitForFunction(() => document.querySelector('#title')?.value.includes('असली रचना'), null, { timeout: 4000 }).then(() => true, () => false);
  check('the typed text survives a page reload (kept in this browser)', restored);
  await page.unroute('**/api/v1/submissions');
  await page.waitForTimeout(3300);
  for (const box of await page.locator('.consents input[type=checkbox]').all()) await box.check();
  await page.click('button[type=submit]:has-text("रचना भेजें")');
  await page.waitForURL(/\/rachna-bhejein\/prapti$/);
  const ref = (await page.textContent('.reference')).trim();
  check('after the retry the receipt shows a reference, and the saved draft is cleared', /^UJ-[A-Z2-9]{8}$/.test(ref) && !(await page.evaluate(() => localStorage.getItem('ujaas.submission.draft'))));
  check('the reference is not in the address bar', !page.url().includes(ref));
  await page.screenshot({ path: `${SHOTS}receipt-1366.png`, fullPage: true });
  const fresh = await context.newPage();
  await fresh.goto(`${BASE}/rachna-bhejein/prapti`);
  await fresh.waitForURL(/\/rachna-bhejein$/);
  check('the receipt page cannot be opened later or elsewhere', true);
  await fresh.close();

  // 6. nothing from the submission is public
  const pub = await context.newPage();
  const found = await pub.goto(`${BASE}/khoj?q=${encodeURIComponent(`ई2ई ${stamp}`)}`);
  check('the submission is not found by public search', found.status() === 200 && !(await pub.content()).includes(`असली रचना ${stamp}`));

  // 7. the editors review it
  await page.goto(`${BASE}/admin/login`);
  await page.fill('#email', EMAIL);
  await page.fill('#password', PASSWORD);
  await page.click('button[type=submit]');
  await page.waitForURL(`${BASE}/admin`);
  await page.goto(`${BASE}/admin/submissions?status=pending_review`);
  await page.fill('#s-q', ref);
  await page.click('button:has-text("लागू करें")');
  await page.waitForSelector(`text=${ref}`);
  check('the submission is in the inbox, and the instantly-sent one is not', (await page.content()).includes(`असली रचना ${stamp}`));
  await page.fill('#s-q', botTitle);
  await page.click('button:has-text("लागू करें")');
  await page.waitForSelector('text=कोई प्रविष्टि नहीं मिली');
  check('the form sent in under three seconds stored nothing', true);

  await page.fill('#s-q', ref);
  await page.click('button:has-text("लागू करें")');
  await page.click(`a:has-text("असली रचना ${stamp}")`);
  await page.waitForSelector('text=दर्ज सहमति');
  const detail = await page.textContent('main');
  check('the detail shows the private contact, the text and the recorded consent version', detail.includes(`e2e-${stamp}@example.org`) && detail.includes('dev-e2e') && detail.includes(`ई2ई ${stamp} पहली पंक्ति`));
  await page.screenshot({ path: `${SHOTS}submission-detail-1366.png`, fullPage: true });

  await page.click('button:has-text("समीक्षा शुरू करें")');
  await page.waitForSelector('.pill:has-text("समीक्षा में")');
  await page.click('button:has-text("संशोधन माँगें")');
  await page.waitForSelector('.banner[role=alert]');
  check('asking for a revision without a note is refused', (await page.textContent('.banner[role=alert]')).length > 0);
  await page.fill('#sub-note', 'कृपया दूसरी पंक्ति देखें');
  await page.click('button:has-text("संशोधन माँगें")');
  await page.waitForSelector('.pill:has-text("संशोधन माँगा")');
  await page.click('button:has-text("लेखक का उत्तर मिला")');
  await page.click('button:has-text("समीक्षा शुरू करें")');
  await page.waitForSelector('.pill:has-text("समीक्षा में")');
  await page.click('button:has-text("स्वीकृत करें")');
  await page.waitForSelector('text=मसौदे में बदलें');
  await page.selectOption('#conv-cat', { index: 1 });
  await page.click('button:has-text("मसौदा बनाएँ")');
  await page.waitForSelector('a:has-text("बना हुआ मसौदा खोलें")');
  check('approved work becomes a draft, not a published item', true);
  const timeline = await page.textContent('.timeline');
  check('the history lists every step in order with the note', timeline.indexOf('प्राप्त हुई') < timeline.indexOf('संशोधन माँगा') && timeline.includes('कृपया दूसरी पंक्ति देखें') && timeline.includes('मसौदे में बदली'));
  await page.click('a:has-text("बना हुआ मसौदा खोलें")');
  await page.waitForSelector('.pill-draft');
  const slug = await page.inputValue('#slug');
  const draftPage = await pub.goto(`${BASE}/rachna/${slug}`);
  check('the converted draft is not on the public site (a real 404)', draftPage.status() === 404);

  // 8. contact form and inbox
  await pub.goto(`${BASE}/sampark`);
  await pub.waitForTimeout(3300);
  await pub.fill('#c-name', 'ई2ई पाठक');
  await pub.fill('#c-email', `reader-${stamp}@example.org`);
  await pub.fill('#c-subject', `ई2ई विषय ${stamp}`);
  await pub.fill('#c-message', 'यह परीक्षण संदेश है।');
  await pub.click('button:has-text("संदेश भेजें")');
  await pub.waitForSelector('text=संदेश भेजा गया');
  check('the contact form sends a message', true);
  check('contact details are not invented: none shown when settings are empty', (await pub.locator('.contact-details').count()) === 0);
  await page.goto(`${BASE}/admin/messages`);
  await page.waitForSelector(`text=ई2ई विषय ${stamp}`);
  await page.click(`li:has-text("ई2ई विषय ${stamp}") button:has-text("निपटाया हुआ")`);
  await page.waitForSelector('text=सहेजा गया');
  check('the message is in the inbox and can be marked handled', true);

  // 9. phone widths
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/rachna-bhejein`);
  await page.waitForSelector('#display_name');
  await page.screenshot({ path: `${SHOTS}submit-390.png`, fullPage: true });
  check('the writer form does not scroll sideways at 390 px', !(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)));
  await page.goto(`${BASE}/admin/submissions`);
  await page.waitForSelector('table');
  await page.screenshot({ path: `${SHOTS}submissions-390.png`, fullPage: true });
  check('the inbox does not scroll sideways at 390 px', !(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)));
} catch (err) {
  check('flow completed without an unexpected error', false, String(err).split('\n')[0]);
  await page.screenshot({ path: `${SHOTS}failure-submission.png`, fullPage: true }).catch(() => undefined);
} finally {
  await consentRows.deleteMany({});
  if (savedConsent.length > 0) await consentRows.insertMany(savedConsent);
  await mongo.close();
  await browser.close();
}
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length === 0 ? 0 : 1);
