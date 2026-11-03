import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { AuditLog, Category, ConsentText, ContactMessage, Content, IdempotencyKey, Submission, SubmissionEvent } from '../src/models/index.js';
import type { Role } from '../src/lib/workflow.js';
import { ORIGIN, loginAgent, makeAdmin, startHarness, testEnv, type Harness } from './helpers.js';

let h: Harness;
interface Client { agent: ReturnType<typeof request.agent>; csrf: string; id: string }
const clients = {} as Record<Role, Client>;
const ROLE_LIST: Role[] = ['site_admin', 'editor_in_chief', 'editor', 'content_manager'];
type Method = 'get' | 'post' | 'patch' | 'put' | 'delete';
const call = (c: Client, method: Method, path: string, body?: unknown) => {
  const req = c.agent[method](`/api/v1/admin${path}`).set('Origin', ORIGIN).set('X-CSRF-Token', c.csrf);
  return body === undefined ? req : req.send(body as object);
};
const pubGet = (path: string) => request(h.app).get(`/api/v1${path}`);

const VERSION = 'test-1';
const good = (over: Record<string, unknown> = {}) => ({
  display_name: 'परीक्षण लेखक', email: 'writer@example.org', title: 'परीक्षण रचना', creation_type: 'kavita',
  body: 'पहली पंक्ति\nदूसरी पंक्ति', description: 'छोटा विवरण',
  consent_original: true, consent_publication: true, consent_privacy: true, consent_text_version: VERSION,
  form_started_at: Date.now() - 10_000, website: '', ...over,
});
let counter = 0;
/** A submission nobody has sent before (unique body, so the duplicate check stays out of the way). */
const fresh = (over: Record<string, unknown> = {}) => good({ body: `अनूठा पाठ संख्या ${++counter} ${Date.now()}`, ...over });
const submit = (body: unknown, headers: Record<string, string> = {}) => {
  let r = request(h.app).post('/api/v1/submissions').set('Origin', ORIGIN);
  for (const [k, v] of Object.entries(headers)) r = r.set(k, v);
  return r.send(body as object);
};
let categoryId = '';

beforeAll(async () => {
  h = await startHarness({ ENABLED_ROLES: ROLE_LIST.join(','), RATE_LIMIT_SCALE: '100' });
  for (const role of ROLE_LIST) {
    const { email, user } = await makeAdmin(role);
    const l = await loginAgent(h.app, email);
    clients[role] = { agent: l.agent, csrf: l.csrf!, id: String(user._id) };
  }
  categoryId = String((await Category.create({ name: 'कविता', slug: 'kavita' }))._id);
});
afterAll(async () => {
  await h.close();
});
afterEach(() => vi.restoreAllMocks());

describe('the form is closed until the owner supplies the consent wording (D-03)', () => {
  it('reports closed and refuses submissions while no consent text exists', async () => {
    expect((await pubGet('/submission-config')).body).toEqual({ open: false });
    const res = await submit(fresh());
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('submissions_closed');
    expect(await Submission.countDocuments()).toBe(0);
  });
  it('opens once a consent text exists and serves the three statements', async () => {
    await ConsentText.create({
      version: VERSION, dev_data: true, approved_at: new Date(),
      text_original: 'परीक्षण: मूल रचना', text_publication: 'परीक्षण: प्रकाशन की अनुमति', text_privacy: 'परीक्षण: गोपनीयता',
    });
    const c = (await pubGet('/submission-config')).body;
    expect(c).toMatchObject({ open: true, version: VERSION, body_max: 10000 });
    expect(c.consents).toEqual({ original: 'परीक्षण: मूल रचना', publication: 'परीक्षण: प्रकाशन की अनुमति', privacy: 'परीक्षण: गोपनीयता' });
  });
  it('in production a development consent text does not open the form', async () => {
    const prod = createApp(testEnv({ NODE_ENV: 'production', PUBLIC_BASE_URL: 'https://example.org', SESSION_SECRET: 'p'.repeat(40) }));
    expect((await request(prod).get('/api/v1/submission-config')).body).toEqual({ open: false });
  });
});

describe('T-SUB-01 validation, on the server, with field messages in Hindi', () => {
  const cases: Array<[string, Record<string, unknown>, string]> = [
    ['no display name', { display_name: '' }, 'display_name'],
    ['bad email', { email: 'not-an-email' }, 'email'],
    ['no title', { title: '   ' }, 'title'],
    ['unknown type', { creation_type: 'novel' }, 'creation_type'],
    ['empty body', { body: '' }, 'body'],
    ['body too long', { body: 'क'.repeat(10_001) }, 'body'],
    ['description too long', { description: 'क'.repeat(301) }, 'description'],
    ['original-work declaration missing', { consent_original: false }, 'consent_original'],
    ['publication permission missing', { consent_publication: false }, 'consent_publication'],
    ['privacy acknowledgement missing', { consent_privacy: undefined }, 'consent_privacy'],
    ['stale consent version', { consent_text_version: 'old-0' }, 'consent_text_version'],
    ['control character in the body', { body: 'a\u0000b' }, 'body'],
  ];
  for (const [name, over, field] of cases) {
    it(`rejects ${name}`, async () => {
      const before = await Submission.countDocuments();
      const res = await submit(fresh(over));
      expect(res.status, JSON.stringify(res.body)).toBe(422);
      expect(res.body.error.fields.map((f: { field: string }) => f.field)).toContain(field);
      expect(res.body.error.fields.find((f: { field: string }) => f.field === field).message_hi).toBeTruthy();
      expect(await Submission.countDocuments()).toBe(before);
    });
  }
  it('strips tags, keeps line breaks, stores NFC, and answers with the reference only', async () => {
    const res = await submit(fresh({ title: '<b>क़बीर</b>', body: '<i>पहली</i>\r\nदूसरी\n\nतीसरी', email: ' Writer@Example.ORG ' }));
    expect(res.status).toBe(201);
    expect(Object.keys(res.body)).toEqual(['reference_id']);
    expect(res.body.reference_id).toMatch(/^UJ-[A-HJ-NP-Z2-9]{8}$/);
    const doc = await Submission.findOne({ reference_id: res.body.reference_id }).lean();
    expect(doc?.title).toBe('क़बीर'.normalize('NFC'));
    expect(doc?.body).toBe('पहली\nदूसरी\n\nतीसरी');
    expect(doc?.email).toBe('writer@example.org');
    expect(JSON.stringify(res.body)).not.toMatch(/writer|पहली/);
  });
});

describe('T-SUB-02 consent record', () => {
  it('stores the three consents, the text version, the time and only hashes of IP and user agent', async () => {
    const res = await submit(fresh(), { 'User-Agent': 'TestBrowser/1.0 (secret-agent-string)' });
    const doc = await Submission.findOne({ reference_id: res.body.reference_id }).lean();
    expect(doc).toMatchObject({ consent_original: true, consent_publication: true, consent_privacy: true, consent_text_version: VERSION, status: 'pending_review' });
    expect(Date.now() - new Date(doc!.consent_at).getTime()).toBeLessThan(10_000);
    expect(doc!.ip_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(doc!.ua_hash).toMatch(/^[0-9a-f]{64}$/);
    const raw = JSON.stringify(doc);
    expect(raw).not.toContain('127.0.0.1');
    expect(raw).not.toContain('secret-agent-string');
    const events = await SubmissionEvent.find({ submission_id: doc!._id }).lean();
    expect(events.map((e) => [e.kind, e.to_status, e.actor])).toEqual([['submitted', 'pending_review', 'writer']]);
  });
});

describe('T-SUB-03 spam, duplicates and limits', () => {
  it('a honeypot hit and a too-fast form look like success but store nothing', async () => {
    const before = await Submission.countDocuments();
    for (const over of [{ website: 'http://spam.example' }, { form_started_at: Date.now() - 500 }, { form_started_at: undefined }]) {
      const res = await submit(fresh(over));
      expect(res.status).toBe(201);
      expect(res.body.reference_id).toMatch(/^UJ-/);
    }
    expect(await Submission.countDocuments()).toBe(before);
  });
  it('the same text from the same email within 30 days is refused without naming the earlier reference', async () => {
    const body = good({ body: 'दोहराई जाने वाली रचना', email: 'dup@example.org' });
    const first = await submit(body);
    expect(first.status).toBe(201);
    const again = await submit(body);
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('duplicate_submission');
    expect(JSON.stringify(again.body)).not.toContain(first.body.reference_id);
    expect((await submit({ ...body, email: 'other@example.org' })).status).toBe(201); // a different sender is not a duplicate
    await Submission.collection.updateMany({ email: 'dup@example.org' }, { $set: { created_at: new Date(Date.now() - 31 * 86_400_000) } });
    expect((await submit(body)).status).toBe(201); // after 30 days it is allowed again
  });
  it('limits one email to 20 submissions a day (429)', async () => {
    const stub = (i: number) => ({
      reference_id: `UJ-LIMIT${String(i).padStart(3, '0')}`, display_name: 'x', email: 'busy@example.org', title: 't', creation_type: 'kavita', body: `b${i}`,
      consent_original: true, consent_publication: true, consent_privacy: true, consent_text_version: VERSION, consent_at: new Date(),
      ip_hash: 'h', ua_hash: 'h', dedupe_hash: `d${i}`, status: 'pending_review', created_at: new Date(),
    });
    await Submission.collection.insertMany(Array.from({ length: 20 }, (_, i) => stub(i)) as never);
    const res = await submit(fresh({ email: 'busy@example.org' }));
    expect(res.status).toBe(429);
    expect(res.headers['retry-after']).toBeTruthy();
  });
  it('limits one address to 5 submissions an hour (429 with Retry-After)', async () => {
    const strict = createApp(testEnv()); // limits are not scaled, as in production
    const codes: number[] = [];
    let retry: string | undefined;
    for (let i = 0; i < 7; i++) {
      const r = await request(strict).post('/api/v1/submissions').set('Origin', ORIGIN).send(fresh({ email: `lim${i}@example.org` }));
      codes.push(r.status);
      retry = r.headers['retry-after'];
    }
    expect(codes.slice(0, 5)).toEqual([201, 201, 201, 201, 201]);
    expect(codes.slice(5)).toEqual([429, 429]);
    expect(retry).toBeTruthy();
  });
});

describe('T-SUB-04 failures leave nothing half saved', () => {
  it('a repeated Idempotency-Key returns the same reference and stores one record', async () => {
    const body = fresh({ email: 'idem@example.org' });
    const a = await submit(body, { 'Idempotency-Key': 'key-abc-123' });
    const b = await submit(body, { 'Idempotency-Key': 'key-abc-123' });
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    expect(b.body.reference_id).toBe(a.body.reference_id);
    expect(await Submission.countDocuments({ email: 'idem@example.org' })).toBe(1);
    expect(await IdempotencyKey.countDocuments({ key: 'key-abc-123' })).toBe(1);
  });
  it('a database failure is a 503, nothing is stored, and the same form can be sent again', async () => {
    const body = fresh({ email: 'down@example.org' });
    vi.spyOn(Submission, 'create').mockRejectedValueOnce(new Error('connection lost'));
    const failed = await submit(body);
    expect(failed.status).toBe(503);
    expect(failed.body.error.code).toBe('service_unavailable');
    expect(await Submission.countDocuments({ email: 'down@example.org' })).toBe(0);
    expect(await SubmissionEvent.countDocuments({ note: 'down@example.org' })).toBe(0);
    vi.restoreAllMocks();
    expect((await submit(body)).status).toBe(201);
  });
});

describe('private data stays out of logs and public routes (T-SEC-02, T-SUB-05)', () => {
  it('no log line contains the body, title, name or email of a submission', async () => {
    const lines: string[] = [];
    const spy = vi.spyOn(process.stdout, 'write').mockImplementation(((chunk: unknown) => { lines.push(String(chunk)); return true; }) as never);
    const loud = createApp(testEnv({ LOG_LEVEL: 'info' }));
    const res = await request(loud).post('/api/v1/submissions').set('Origin', ORIGIN)
      .send(fresh({ email: 'logcheck@example.org', display_name: 'लॉगजाँचनाम', title: 'लॉगजाँचशीर्षक', body: 'लॉगजाँचपाठ विशेष' }));
    spy.mockRestore();
    expect(res.status).toBe(201);
    const out = lines.join('');
    expect(out).toContain('/api/v1/submissions'); // it did log the request, without the content
    for (const secret of ['logcheck@example.org', 'लॉगजाँचनाम', 'लॉगजाँचशीर्षक', 'लॉगजाँचपाठ']) expect(out).not.toContain(secret);
  });
  it('a submission is reachable from no public route', async () => {
    const res = await submit(fresh({ email: 'hidden@example.org', title: 'गुप्तप्रविष्टिशीर्षक', body: 'गुप्तप्रविष्टिपाठ अनूठा' }));
    expect(res.status).toBe(201);
    for (const p of ['/contents?page_size=50', '/home', '/sitemap-data', `/search?q=${encodeURIComponent('गुप्तप्रविष्टिपाठ')}`, '/authors', '/collections', '/categories']) {
      const r = await pubGet(p);
      const text = JSON.stringify(r.body.items ?? r.body); // a search echoes the visitor's own query, nothing else
      expect(text, p).not.toContain('गुप्तप्रविष्टि');
      expect(text, p).not.toContain('hidden@example.org');
      expect(text, p).not.toContain(res.body.reference_id);
    }
    const doc = await Submission.findOne({ reference_id: res.body.reference_id }).lean();
    expect((await pubGet(`/submissions/${doc!._id}`)).status).toBe(404);
    expect((await pubGet('/submissions')).status).toBe(404);
    expect((await pubGet(`/contents/${res.body.reference_id.toLowerCase()}`)).status).toBe(404);
  });
});

describe('admin routes: only editors and above, every other role refused (T-ADM-03)', () => {
  const ZERO = '000000000000000000000000';
  const routes: Array<[Method, string, unknown?]> = [
    ['get', '/submissions'], ['get', `/submissions/${ZERO}`], ['post', `/submissions/${ZERO}/transition`, { to: 'under_review' }],
    ['post', `/submissions/${ZERO}/assign`, { assigned_to: null }], ['post', `/submissions/${ZERO}/notes`, { note: 'x' }],
    ['post', `/submissions/${ZERO}/convert`, { category_id: ZERO }], ['get', '/staff'], ['get', '/messages'], ['patch', `/messages/${ZERO}`, { status: 'handled' }],
  ];
  it('matches the permission table', async () => {
    const wrong: string[] = [];
    for (const [method, path, body] of routes) {
      for (const role of ROLE_LIST) {
        const res = await call(clients[role], method, path, body);
        const allowed = role !== 'content_manager';
        if (allowed === (res.status === 403)) wrong.push(`${role} ${method} ${path} -> ${res.status}`);
      }
    }
    expect(wrong).toEqual([]);
  });
  it('every route answers 401 without a session', async () => {
    for (const [method, path] of routes) {
      const res = await request(h.app)[method](`/api/v1/admin${path}`).set('Origin', ORIGIN);
      expect(res.status, `${method} ${path}`).toBe(401);
    }
  });
});

describe('T-SUB-06 review workflow, history, conversion, withdrawal', () => {
  const make = async (over: Record<string, unknown> = {}) => {
    const res = await submit(fresh({ email: `flow${++counter}@example.org`, ...over }));
    expect(res.status).toBe(201);
    const doc = await Submission.findOne({ reference_id: res.body.reference_id }).lean();
    return { id: String(doc!._id), ref: res.body.reference_id as string };
  };
  const tr = (c: Role, id: string, to: string, note?: string) => call(clients[c], 'post', `/submissions/${id}/transition`, { to, note });

  it('lists and finds submissions by reference; the list shows no body or email', async () => {
    const { ref } = await make({ title: 'खोजने योग्य प्रविष्टि' });
    const list = await call(clients.editor, 'get', `/submissions?q=${ref}`);
    expect(list.status).toBe(200);
    expect(list.body.items).toHaveLength(1);
    expect(list.body.items[0]).toMatchObject({ reference_id: ref, status: 'pending_review', title: 'खोजने योग्य प्रविष्टि' });
    expect(JSON.stringify(list.body)).not.toMatch(/@example\.org|ip_hash|dedupe/);
    expect((await call(clients.editor, 'get', '/submissions?status=approved')).body.items).toEqual([]);
  });

  it('shows the detail with consent and history, records who opened it, and hides the hashes', async () => {
    const { id, ref } = await make();
    const d = (await call(clients.editor, 'get', `/submissions/${id}`)).body;
    expect(d).toMatchObject({ reference_id: ref, status: 'pending_review', consent: { original: true, publication: true, privacy: true, version: VERSION } });
    expect(d.email).toMatch(/@example\.org$/);
    expect(d.events.map((e: { kind: string }) => e.kind)).toEqual(['submitted']);
    expect(JSON.stringify(d)).not.toMatch(/ip_hash|ua_hash|dedupe_hash/);
    expect(await AuditLog.countDocuments({ action: 'submission.view', entity_id: id })).toBe(1);
  });

  it('follows the state table: who may approve, notes required, illegal moves, terminal states', async () => {
    const { id } = await make();
    expect((await tr('editor', id, 'approved')).status).toBe(422); // pending cannot jump to approved
    expect((await tr('editor', id, 'under_review')).body.status).toBe('under_review');
    expect((await tr('editor', id, 'approved')).status).toBe(403); // only the chief approves
    const noNote = await tr('editor', id, 'revision_requested');
    expect(noNote.status).toBe(422);
    expect(noNote.body.error.fields[0].code).toBe('note_required');
    const rev = await tr('editor', id, 'revision_requested', 'कृपया अंतिम पंक्ति सुधारें');
    expect(rev.body.status).toBe('revision_requested');
    expect((await tr('editor', id, 'pending_review')).body.status).toBe('pending_review'); // writer replied by contact; handled by hand
    await tr('editor', id, 'under_review');
    expect((await tr('editor_in_chief', id, 'rejected')).status).toBe(422); // a reason is required
    const rej = await tr('editor_in_chief', id, 'rejected', 'विषय हमारे अनुकूल नहीं');
    expect(rej.body.status).toBe('rejected');
    expect((await tr('site_admin', id, 'approved')).status).toBe(422); // rejected is final
    const history = rej.body.events.map((e: { from: string | null; to: string | null; kind: string }) => `${e.kind}:${e.from}>${e.to}`);
    expect(history).toEqual([
      'submitted:null>pending_review', 'status:pending_review>under_review', 'status:under_review>revision_requested',
      'status:revision_requested>pending_review', 'status:pending_review>under_review', 'status:under_review>rejected',
    ]);
    expect(rej.body.events.at(-1).note).toBe('विषय हमारे अनुकूल नहीं');
  });

  it('adds private notes and assigns an editor (unknown editors are refused)', async () => {
    const { id } = await make();
    const n = await call(clients.editor, 'post', `/submissions/${id}/notes`, { note: '<b>निजी टिप्पणी</b>' });
    expect(n.status).toBe(201);
    expect(n.body.events.at(-1)).toMatchObject({ kind: 'note', note: 'निजी टिप्पणी' });
    const a = await call(clients.editor_in_chief, 'post', `/submissions/${id}/assign`, { assigned_to: clients.editor.id });
    expect(a.body.assigned_to.id).toBe(clients.editor.id);
    expect((await call(clients.editor, 'post', `/submissions/${id}/assign`, { assigned_to: '1'.repeat(24) })).status).toBe(422);
    expect((await call(clients.editor, 'post', `/submissions/${id}/assign`, { assigned_to: null })).body.assigned_to).toBeNull();
  });

  it('converts approved work into a DRAFT only: approved is not published, and the link stays private', async () => {
    const { id, ref } = await make({ title: 'रूपांतरण परीक्षण', creation_type: 'kavita', body: 'पंक्ति एक\nपंक्ति दो' });
    expect((await call(clients.editor, 'post', `/submissions/${id}/convert`, { category_id: categoryId })).status).toBe(422); // not approved yet
    await tr('editor', id, 'under_review');
    await tr('editor_in_chief', id, 'approved');
    expect((await call(clients.editor, 'post', `/submissions/${id}/convert`, { category_id: '1'.repeat(24) })).status).toBe(422);
    const done = await call(clients.editor, 'post', `/submissions/${id}/convert`, { category_id: categoryId });
    expect(done.status).toBe(200);
    const content = await Content.findById(done.body.content_id).lean();
    expect(content).toMatchObject({ status: 'draft', title: 'रूपांतरण परीक्षण', body_format: 'verse', body: 'पंक्ति एक\nपंक्ति दो' });
    expect(String(content!.submission_id)).toBe(id);
    expect(content!.rights_note).toContain(ref);
    expect(content!.final_approved).toBe(false);
    expect((await pubGet(`/contents/${content!.slug}`)).status).toBe(404); // a draft is not public
    const after = (await call(clients.editor, 'get', `/submissions/${id}`)).body;
    expect(after.status).toBe('converted');
    expect(after.converted_content_id).toBe(done.body.content_id);
    expect((await call(clients.editor, 'post', `/submissions/${id}/convert`, { category_id: categoryId })).status).toBe(422); // only once
    const adminView = (await call(clients.editor, 'get', `/contents/${done.body.content_id}`)).body;
    expect(adminView.status).toBe('draft');
  });

  it('withdrawal is a controlled step: chief or admin, with a recorded reason, then final', async () => {
    const { id } = await make();
    expect((await tr('editor', id, 'withdrawn', 'लेखक का अनुरोध')).status).toBe(403);
    expect((await tr('editor_in_chief', id, 'withdrawn')).status).toBe(422);
    const w = await tr('editor_in_chief', id, 'withdrawn', 'लेखक के अनुरोध पर, ईमेल से पुष्टि');
    expect(w.body.status).toBe('withdrawn');
    expect(w.body.events.at(-1)).toMatchObject({ to: 'withdrawn', note: 'लेखक के अनुरोध पर, ईमेल से पुष्टि' });
    expect((await tr('site_admin', id, 'under_review')).status).toBe(422);
    expect(await AuditLog.countDocuments({ entity_id: id, action: 'submission.transition' })).toBe(1);
  });
});

describe('contact form (T-CON-01)', () => {
  const contact = (body: unknown) => request(h.app).post('/api/v1/contact').set('Origin', ORIGIN).send(body as object);
  const msg = (over: Record<string, unknown> = {}) => ({ name: 'पाठक', email: 'reader@example.org', subject: 'सुझाव', message: 'आपकी पत्रिका अच्छी है।', form_started_at: Date.now() - 10_000, website: '', ...over });

  it('validates, stores privately, and answers with ok only', async () => {
    for (const over of [{ name: '' }, { email: 'x' }, { subject: '' }, { message: '' }, { message: 'क'.repeat(1001) }]) {
      expect((await contact(msg(over))).status, JSON.stringify(over)).toBe(422);
    }
    const ok = await contact(msg({ message: '<b>नमस्ते</b>' }));
    expect(ok.status).toBe(201);
    expect(ok.body).toEqual({ ok: true });
    const doc = await ContactMessage.findOne({ email: 'reader@example.org' }).lean();
    expect(doc?.message).toBe('नमस्ते');
    expect(doc!.ip_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(await pubGet('/settings/public'))).not.toContain('reader@example.org');
  });
  it('a honeypot hit stores nothing', async () => {
    const before = await ContactMessage.countDocuments();
    expect((await contact(msg({ website: 'x' }))).status).toBe(201);
    expect((await contact(msg({ form_started_at: Date.now() }))).status).toBe(201);
    expect(await ContactMessage.countDocuments()).toBe(before);
  });
  it('limits one address to 5 messages an hour', async () => {
    const strict = createApp(testEnv());
    const codes: number[] = [];
    for (let i = 0; i < 6; i++) codes.push((await request(strict).post('/api/v1/contact').set('Origin', ORIGIN).send(msg())).status);
    expect(codes).toEqual([201, 201, 201, 201, 201, 429]);
  });
  it('editors read the inbox and mark messages handled; content managers cannot', async () => {
    const list = (await call(clients.editor, 'get', '/messages?status=new')).body;
    expect(list.items.length).toBeGreaterThan(0);
    const m = list.items.find((x: { email: string }) => x.email === 'reader@example.org');
    expect(m.message).toBeTruthy();
    expect(JSON.stringify(list)).not.toContain('ip_hash');
    expect((await call(clients.editor, 'patch', `/messages/${m.id}`, { status: 'handled' })).body.status).toBe('handled');
    expect((await call(clients.content_manager, 'get', '/messages')).status).toBe(403);
  });
});

describe('connections', () => {
  it('uses a replica set so each submission is one transaction', async () => {
    const s = await mongoose.startSession();
    await s.withTransaction(async () => { await Submission.countDocuments({}, { session: s }); });
    await s.endSession();
  });
});
