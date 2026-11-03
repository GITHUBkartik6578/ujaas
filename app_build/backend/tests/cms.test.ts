import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { runSchedulerOnce, schedulerState } from '../src/jobs/scheduler.js';
import { publishDue } from '../src/services/content.js';
import { signPreview } from '../src/lib/preview.js';
import { AuditLog, Content, ContentRevision, MediaAsset, Category } from '../src/models/index.js';
import type { Role } from '../src/lib/workflow.js';
import { ORIGIN, loginAgent, makeAdmin, startHarness, type Harness } from './helpers.js';

let h: Harness;
interface Client { agent: ReturnType<typeof request.agent>; csrf: string }
const clients = {} as Record<Role, Client>;
const ROLE_LIST: Role[] = ['site_admin', 'editor_in_chief', 'editor', 'content_manager'];

type Method = 'get' | 'post' | 'patch' | 'put' | 'delete';
const call = (c: Client, method: Method, path: string, body?: unknown, headers: Record<string, string> = {}) => {
  let req = c.agent[method](`/api/v1/admin${path}`).set('Origin', ORIGIN).set('X-CSRF-Token', c.csrf);
  for (const [k, v] of Object.entries(headers)) req = req.set(k, v);
  return body === undefined ? req : req.send(body as object);
};
const pub = (path: string) => request(h.app).get(`/api/v1${path}`);

let categoryId = '';
let authorId = '';
let altMediaId = '';

beforeAll(async () => {
  h = await startHarness({ ENABLED_ROLES: ROLE_LIST.join(','), RATE_LIMIT_SCALE: '100' });
  for (const role of ROLE_LIST) {
    const { email } = await makeAdmin(role);
    const l = await loginAgent(h.app, email);
    expect(l.res.status, role).toBe(200);
    clients[role] = { agent: l.agent, csrf: l.csrf! };
  }
  categoryId = (await call(clients.site_admin, 'post', '/categories', { name: 'कविता', slug: 'kavita' })).body.id;
  authorId = (await call(clients.site_admin, 'post', '/authors', { name: 'रचनाकार एक', is_public: true })).body.id;
  const m = await MediaAsset.create({ storage_key: 'cms-cover.png', mime: 'image/png', width: 10, height: 10, bytes: 10, alt_text: 'नमूना आवरण', is_public: false });
  altMediaId = String(m._id);
});
afterAll(async () => {
  await h.close();
});

const baseDraft = (over: Record<string, unknown> = {}) => ({
  title: 'परीक्षण रचना', content_type: 'kavita', body: 'पहली पंक्ति\nदूसरी पंक्ति', body_format: 'verse', excerpt: 'परीक्षण अंश',
  category_id: categoryId, credits: [{ author_id: authorId, role: 'author' }], ...over,
});

/** Walks one item to the point where it can be published. */
async function approvedItem(over: Record<string, unknown> = {}) {
  const created = await call(clients.content_manager, 'post', '/contents', baseDraft(over));
  expect(created.status).toBe(201);
  const id = created.body.id as string;
  expect((await call(clients.content_manager, 'post', `/contents/${id}/transition`, { to: 'in_review' })).status).toBe(200);
  expect((await call(clients.editor, 'post', `/contents/${id}/transition`, { to: 'approved' })).status).toBe(200);
  return { id, slug: created.body.slug as string };
}
async function readyToPublish(id: string) {
  const rev = (await call(clients.editor, 'get', `/contents/${id}`)).body.revision_no;
  const r1 = await call(clients.editor, 'patch', `/contents/${id}`, { lang_checked: true, proof_checked: true, rights_note: 'अनुमति प्राप्त' }, { 'If-Match': String(rev) });
  expect(r1.status, JSON.stringify(r1.body)).toBe(200);
  const r2 = await call(clients.editor_in_chief, 'patch', `/contents/${id}`, { final_approved: true }, { 'If-Match': String(r1.body.revision_no) });
  expect(r2.status).toBe(200);
  return r2.body.revision_no as number;
}

describe('T-ADM-03 role x route matrix and T-ADM-04 unauthenticated access', () => {
  const ZERO = '000000000000000000000000';
  const routes: Array<[Method, string, Role[], unknown?]> = [
    ['get', '/contents', ROLE_LIST], ['post', '/contents', ROLE_LIST, {}], ['get', `/contents/${ZERO}`, ROLE_LIST],
    ['get', `/contents/${ZERO}/revisions`, ['site_admin', 'editor_in_chief', 'editor']],
    ['post', `/contents/${ZERO}/revisions/1/restore`, ['site_admin', 'editor_in_chief', 'editor']],
    ['delete', `/contents/${ZERO}`, ['site_admin']],
    ['get', '/authors', ROLE_LIST], ['get', '/categories', ROLE_LIST], ['delete', `/categories/${ZERO}`, ['site_admin']],
    ['get', '/collections', ROLE_LIST], ['get', '/dashboard', ROLE_LIST], ['get', '/media', ROLE_LIST],
    ['delete', `/media/${ZERO}`, ['site_admin']],
    ['get', '/homepage', ['site_admin', 'editor_in_chief']], ['put', '/homepage', ['site_admin', 'editor_in_chief'], { featured_ids: [] }],
    ['get', '/settings', ['site_admin']], ['put', '/settings', ['site_admin'], { values: {} }],
    ['get', '/audit', ['site_admin', 'editor_in_chief']], ['get', '/ops/health', ['site_admin']],
  ];
  it('every role gets exactly the access the permission tables give it (server-side)', async () => {
    const wrong: string[] = [];
    for (const [method, path, allowed, body] of routes) {
      for (const role of ROLE_LIST) {
        const res = await call(clients[role], method, path, body);
        const denied = res.status === 403;
        if (allowed.includes(role) === denied) wrong.push(`${role} ${method.toUpperCase()} ${path} -> ${res.status}`);
      }
    }
    expect(wrong).toEqual([]);
  });
  it('no admin route answers an unauthenticated request with data', async () => {
    for (const [method, path] of routes) {
      const res = await request(h.app)[method](`/api/v1/admin${path}`).set('Origin', ORIGIN);
      expect(res.status, `${method} ${path}`).toBe(401);
    }
  });
  it('state-changing admin calls need the CSRF token', async () => {
    const res = await clients.site_admin.agent.post('/api/v1/admin/contents').set('Origin', ORIGIN).send(baseDraft());
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('csrf_failed');
  });
});

describe('T-REV-01 create, edit, revisions, conflicts', () => {
  it('creates a draft with a revision and a generated slug; Hindi text is stored NFC with line breaks', async () => {
    const res = await call(clients.content_manager, 'post', '/contents', baseDraft({ body: 'क़बीर\r\nदूसरी' }));
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('draft');
    expect(res.body.revision_no).toBe(1);
    expect(res.body.slug).toMatch(/^rachna-[0-9a-f]{6}$/);
    expect(res.body.body).toBe('क़बीर\nदूसरी'.normalize('NFC'));
    expect(await ContentRevision.countDocuments({ content_id: res.body.id })).toBe(1);
  });
  it('requires If-Match (428), rejects a stale one (409) and bumps the revision on success', async () => {
    const { id } = await approvedItem();
    const cur = (await call(clients.editor, 'get', `/contents/${id}`)).body;
    expect((await call(clients.editor, 'patch', `/contents/${id}`, { excerpt: 'नया अंश' })).status).toBe(428);
    const ok = await call(clients.editor, 'patch', `/contents/${id}`, { excerpt: 'नया अंश' }, { 'If-Match': String(cur.revision_no) });
    expect(ok.status).toBe(200);
    expect(ok.body.revision_no).toBe(cur.revision_no + 1);
    const stale = await call(clients.editor, 'patch', `/contents/${id}`, { excerpt: 'पुराना' }, { 'If-Match': String(cur.revision_no) });
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe('conflict');
  });
  it('restores an older revision as a NEW revision and clears the approvals', async () => {
    const { id } = await approvedItem({ title: 'पहला शीर्षक' });
    let rev = (await call(clients.editor, 'get', `/contents/${id}`)).body.revision_no;
    const r2 = await call(clients.editor, 'patch', `/contents/${id}`, { title: 'दूसरा शीर्षक', lang_checked: true }, { 'If-Match': String(rev) });
    rev = r2.body.revision_no;
    const list = await call(clients.editor, 'get', `/contents/${id}/revisions`);
    expect(list.body.items.map((x: { revision_no: number }) => x.revision_no)).toEqual([rev, rev - 1, 1].filter((v, i, a) => a.indexOf(v) === i));
    const restored = await call(clients.editor, 'post', `/contents/${id}/revisions/1/restore`);
    expect(restored.status).toBe(200);
    expect(restored.body.title).toBe('पहला शीर्षक');
    expect(restored.body.revision_no).toBe(rev + 1);
    expect(restored.body.lang_checked).toBe(false);
  });
  it('edit rights: a content manager cannot edit an approved item or set checks', async () => {
    const { id } = await approvedItem();
    const rev = (await call(clients.editor, 'get', `/contents/${id}`)).body.revision_no;
    expect((await call(clients.content_manager, 'patch', `/contents/${id}`, { excerpt: 'x' }, { 'If-Match': String(rev) })).status).toBe(403);
    const draft = (await call(clients.content_manager, 'post', '/contents', baseDraft())).body;
    expect((await call(clients.content_manager, 'patch', `/contents/${draft.id}`, { lang_checked: true }, { 'If-Match': '1' })).status).toBe(403);
    expect((await call(clients.editor, 'patch', `/contents/${draft.id}`, { final_approved: true }, { 'If-Match': '1' })).status).toBe(403);
  });
  it('validates input with field errors and rejects unknown references', async () => {
    expect((await call(clients.editor, 'post', '/contents', { title: 'x' })).status).toBe(422);
    const bad = await call(clients.editor, 'post', '/contents', baseDraft({ category_id: '0'.repeat(24) }));
    expect(bad.status).toBe(422);
    expect(bad.body.error.fields[0].field).toBe('category_id');
    expect((await call(clients.editor, 'post', '/contents', baseDraft({ body: 'a\u0000b' }))).status).toBe(422);
    expect((await call(clients.editor, 'post', '/contents', baseDraft({ title: '<script>alert(1)</script>शीर्षक' }))).body.title).toBe('शीर्षक');
  });
  it('a slug that is taken is refused', async () => {
    const a = await call(clients.editor, 'post', '/contents', baseDraft({ slug: 'same-slug' }));
    expect(a.status).toBe(201);
    const b = await call(clients.editor, 'post', '/contents', baseDraft({ slug: 'same-slug' }));
    expect(b.status).toBe(422);
    expect(b.body.error.fields[0].code).toBe('slug_taken');
  });
});

describe('T-PUB-01 / T-PUB-03 / T-PUB-04 publish, unpublish, archive', () => {
  it('walks the whole path and enforces who may do each step', async () => {
    const { id, slug } = await approvedItem({ title: 'प्रकाशन परीक्षण' });
    // publishing is blocked until every check, rights note and author exist, and it needs the chief
    expect((await call(clients.editor, 'post', `/contents/${id}/transition`, { to: 'published' })).status).toBe(403);
    const blocked = await call(clients.editor_in_chief, 'post', `/contents/${id}/transition`, { to: 'published' });
    expect(blocked.status).toBe(422);
    expect(blocked.body.error.code).toBe('publish_blocked');
    expect(blocked.body.error.fields.map((f: { field: string }) => f.field)).toEqual(['lang_checked', 'proof_checked', 'final_approved', 'rights_note']);
    expect((await pub(`/contents/${slug}`)).status).toBe(404); // approved is not published
    await readyToPublish(id);
    const done = await call(clients.editor_in_chief, 'post', `/contents/${id}/transition`, { to: 'published', note: 'पहली बार' });
    expect(done.status).toBe(200);
    expect(done.body.status).toBe('published');
    expect(done.body.published_at).toBeTruthy();
    // public now
    expect((await pub(`/contents/${slug}`)).status).toBe(200);
    expect(JSON.stringify((await pub('/contents?page_size=50')).body)).toContain(slug);
    expect((await pub(`/search?q=${encodeURIComponent('प्रकाशन परीक्षण')}`)).body.total).toBeGreaterThan(0);
    // unpublish removes it everywhere
    expect((await call(clients.editor, 'post', `/contents/${id}/transition`, { to: 'unpublished' })).status).toBe(403);
    expect((await call(clients.editor_in_chief, 'post', `/contents/${id}/transition`, { to: 'unpublished' })).status).toBe(200);
    expect((await pub(`/contents/${slug}`)).status).toBe(404);
    expect(JSON.stringify((await pub('/contents?page_size=50')).body)).not.toContain(slug);
    expect((await pub(`/search?q=${encodeURIComponent('प्रकाशन परीक्षण')}`)).body.total).toBe(0);
    expect(JSON.stringify((await pub('/sitemap-data')).body)).not.toContain(slug);
    // archive and restore to draft
    expect((await call(clients.editor_in_chief, 'post', `/contents/${id}/transition`, { to: 'archived' })).status).toBe(200);
    expect((await call(clients.editor, 'post', `/contents/${id}/transition`, { to: 'draft' })).body.status).toBe('draft');
  });
  it('illegal transitions return 422 state_transition_invalid', async () => {
    const draft = (await call(clients.editor, 'post', '/contents', baseDraft())).body;
    const res = await call(clients.site_admin, 'post', `/contents/${draft.id}/transition`, { to: 'published' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('state_transition_invalid');
    expect((await call(clients.site_admin, 'post', `/contents/${draft.id}/transition`, { to: 'nonsense' })).status).toBe(422);
  });
  it('a cover without alt text blocks publishing; publishing makes a cover with alt public', async () => {
    const noAlt = await MediaAsset.create({ storage_key: 'cms-noalt.png', mime: 'image/png', width: 10, height: 10, bytes: 10, alt_text: '', is_public: false });
    const { id, slug } = await approvedItem({ cover_media_id: String(noAlt._id) });
    await readyToPublish(id);
    const blocked = await call(clients.editor_in_chief, 'post', `/contents/${id}/transition`, { to: 'published' });
    expect(blocked.body.error.fields.map((f: { field: string }) => f.field)).toEqual(['cover_alt']);
    const rev = (await call(clients.editor, 'get', `/contents/${id}`)).body.revision_no;
    await call(clients.editor, 'patch', `/contents/${id}`, { cover_media_id: altMediaId }, { 'If-Match': String(rev) });
    expect((await call(clients.editor_in_chief, 'post', `/contents/${id}/transition`, { to: 'published' })).status).toBe(200);
    expect((await pub(`/contents/${slug}`)).body.cover).toMatchObject({ url: '/media/cms-cover.png', alt: 'नमूना आवरण' });
  });
  it('a renamed slug keeps working through a redirect, and the new slug is public', async () => {
    const { id, slug } = await approvedItem();
    await readyToPublish(id);
    await call(clients.editor_in_chief, 'post', `/contents/${id}/transition`, { to: 'published' });
    const rev = (await call(clients.editor, 'get', `/contents/${id}`)).body.revision_no;
    const renamed = await call(clients.editor, 'patch', `/contents/${id}`, { slug: `${slug}-naya` }, { 'If-Match': String(rev) });
    expect(renamed.status).toBe(200);
    expect((await pub(`/contents/${slug}`)).status).toBe(404);
    expect((await pub(`/redirects/content/${slug}`)).body).toEqual({ slug: `${slug}-naya` });
    expect((await pub(`/contents/${slug}-naya`)).status).toBe(200);
  });
  it('hard delete: only a never-published draft, only by site_admin; its revisions go too', async () => {
    const draft = (await call(clients.editor, 'post', '/contents', baseDraft())).body;
    expect((await call(clients.editor_in_chief, 'delete', `/contents/${draft.id}`)).status).toBe(403);
    expect((await call(clients.site_admin, 'delete', `/contents/${draft.id}`)).status).toBe(204);
    expect(await ContentRevision.countDocuments({ content_id: draft.id })).toBe(0);
    const { id } = await approvedItem();
    await readyToPublish(id);
    await call(clients.editor_in_chief, 'post', `/contents/${id}/transition`, { to: 'published' });
    expect((await call(clients.site_admin, 'delete', `/contents/${id}`)).status).toBe(422);
    expect(await Content.countDocuments({ _id: id })).toBe(1);
  });
});

describe('T-PUB-02 scheduling and the scheduler', () => {
  it('rejects a past time, publishes a due item as system, and records the actor', async () => {
    const { id, slug } = await approvedItem();
    await readyToPublish(id);
    const past = await call(clients.editor, 'post', `/contents/${id}/transition`, { to: 'scheduled', scheduled_at: new Date(Date.now() - 1000).toISOString() });
    expect(past.status).toBe(422);
    const at = new Date(Date.now() + 3_600_000);
    const sched = await call(clients.editor, 'post', `/contents/${id}/transition`, { to: 'scheduled', scheduled_at: at.toISOString() });
    expect(sched.status).toBe(200);
    expect((await pub(`/contents/${slug}`)).status).toBe(404);
    expect((await publishDue(new Date())).published).toEqual([]); // not due yet
    const res = await runSchedulerOnce(new Date(at.getTime() + 1000));
    expect(res.published).toContain(id);
    expect(schedulerState.last_run_at).toBeTruthy();
    expect((await pub(`/contents/${slug}`)).status).toBe(200);
    const row = await AuditLog.findOne({ entity_id: id, to: 'published' }).lean();
    expect(row?.actor).toBe('system');
  });
  it('a failed publication stays scheduled with an alert on the dashboard', async () => {
    const { id, slug } = await approvedItem();
    await readyToPublish(id);
    const at = new Date(Date.now() + 3_600_000);
    await call(clients.editor, 'post', `/contents/${id}/transition`, { to: 'scheduled', scheduled_at: at.toISOString() });
    const rev = (await call(clients.editor, 'get', `/contents/${id}`)).body.revision_no;
    await call(clients.editor, 'patch', `/contents/${id}`, { rights_note: null }, { 'If-Match': String(rev) }); // now not publishable
    const res = await publishDue(new Date(at.getTime() + 1000));
    expect(res.failed.map((f) => f.id)).toContain(id);
    expect((await pub(`/contents/${slug}`)).status).toBe(404);
    const dash = (await call(clients.content_manager, 'get', '/dashboard')).body;
    expect(dash.scheduler_alerts.map((a: { id: string }) => a.id)).toContain(id);
    expect((await call(clients.editor, 'get', `/contents/${id}`)).body.status).toBe('scheduled');
  });
});

describe('previews', () => {
  it('shows a draft through a signed link only, without private fields, and never to the public API', async () => {
    const draft = (await call(clients.content_manager, 'post', '/contents', baseDraft({ rights_note: 'निजी नोट', cover_media_id: altMediaId }))).body;
    expect((await pub(`/contents/${draft.slug}`)).status).toBe(404);
    const link = await call(clients.content_manager, 'post', `/contents/${draft.id}/preview-link`);
    expect(link.status).toBe(200);
    const res = await pub(`/preview/${link.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.title).toBe(draft.title);
    expect(res.body.preview).toBe(true);
    expect(res.body.cover.url).toBe('/media/cms-cover.png'); // a private cover is visible in preview
    expect(res.headers['x-robots-tag']).toMatch(/noindex/);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(JSON.stringify(res.body)).not.toMatch(/rights_note|निजी नोट|lang_checked|revision_no/);
  });
  it('rejects tampered and expired tokens', async () => {
    const draft = (await call(clients.content_manager, 'post', '/contents', baseDraft())).body;
    const token = signPreview(draft.id, h.env.SESSION_SECRET);
    expect((await pub(`/preview/${token}x`)).status).toBe(404);
    expect((await pub(`/preview/${signPreview(draft.id, 'another-secret-another-secret-1234')}`)).status).toBe(404);
    expect((await pub(`/preview/${signPreview(draft.id, h.env.SESSION_SECRET, Date.now() - 31 * 60_000)}`)).status).toBe(404);
    expect((await pub('/preview/garbage')).status).toBe(404);
  });
});

describe('authors, categories, collections, homepage, settings, media, audit', () => {
  it('authors: slug generated, public photo needs alt, private contact stays private', async () => {
    const a = await call(clients.content_manager, 'post', '/authors', { name: 'नया रचनाकार', bio: '<b>परिचय</b>', private_contact: 'निजी फ़ोन' });
    expect(a.status).toBe(201);
    expect(a.body.slug).toMatch(/^rachnakar-/);
    expect(a.body.bio).toBe('परिचय');
    expect(a.body.private_contact).toBe('निजी फ़ोन');
    const noAlt = await MediaAsset.create({ storage_key: 'a-noalt.png', mime: 'image/png', width: 1, height: 1, bytes: 1, alt_text: '' });
    const bad = await call(clients.content_manager, 'patch', `/authors/${a.body.id}`, { is_public: true, photo_media_id: String(noAlt._id) });
    expect(bad.status).toBe(422);
    expect((await call(clients.content_manager, 'patch', `/authors/${a.body.id}`, { is_public: true, photo_media_id: altMediaId })).status).toBe(200);
    const profile = await pub(`/authors/${a.body.slug}`);
    expect(profile.status).toBe(200);
    expect(JSON.stringify(profile.body)).not.toContain('निजी फ़ोन');
  });
  it('categories: delete only when unused and only by site_admin', async () => {
    const c = (await call(clients.content_manager, 'post', '/categories', { name: 'खाली श्रेणी' })).body;
    expect((await call(clients.editor, 'delete', `/categories/${c.id}`)).status).toBe(403);
    expect((await call(clients.site_admin, 'delete', `/categories/${c.id}`)).status).toBe(204);
    expect((await call(clients.site_admin, 'delete', `/categories/${categoryId}`)).status).toBe(422); // in use
    expect((await call(clients.content_manager, 'post', '/categories', { name: 'x', slug: 'kavita' })).status).toBe(422);
    expect(await Category.countDocuments({ _id: c.id })).toBe(0);
  });
  it('collections: only published items, order kept, replaced atomically, shown publicly in order', async () => {
    const mk = async (title: string) => {
      const { id, slug } = await approvedItem({ title });
      await readyToPublish(id);
      await call(clients.editor_in_chief, 'post', `/contents/${id}/transition`, { to: 'published' });
      return { id, slug };
    };
    const [x, y] = [await mk('संग्रह रचना एक'), await mk('संग्रह रचना दो')];
    const draft = (await call(clients.editor, 'post', '/contents', baseDraft())).body;
    const col = (await call(clients.content_manager, 'post', '/collections', { title: 'परीक्षण संग्रह', status: 'published' })).body;
    expect(col.status).toBe('published');
    const bad = await call(clients.content_manager, 'put', `/collections/${col.id}/items`, { content_ids: [x.id, draft.id] });
    expect(bad.status).toBe(422);
    expect(bad.body.error.fields[0].code).toBe('not_published');
    expect((await call(clients.content_manager, 'put', `/collections/${col.id}/items`, { content_ids: [y.id, x.id] })).status).toBe(200);
    expect((await pub(`/collections/${col.slug}`)).body.items.map((i: { slug: string }) => i.slug)).toEqual([y.slug, x.slug]);
    expect((await call(clients.content_manager, 'put', `/collections/${col.id}/items`, { content_ids: [x.id, x.id] })).status).toBe(422);
    // a failed replace leaves the previous order intact
    expect((await pub(`/collections/${col.slug}`)).body.items).toHaveLength(2);
    await call(clients.editor_in_chief, 'post', `/contents/${y.id}/transition`, { to: 'unpublished' });
    expect((await call(clients.editor, 'get', `/collections/${col.id}`)).body.items[0].warning).toBe('not_published');
    expect((await pub(`/collections/${col.slug}`)).body.items.map((i: { slug: string }) => i.slug)).toEqual([x.slug]);
  });
  it('homepage: chief only, published items only, order shown on the public home', async () => {
    const mk = async (title: string) => {
      const { id, slug } = await approvedItem({ title });
      await readyToPublish(id);
      await call(clients.editor_in_chief, 'post', `/contents/${id}/transition`, { to: 'published' });
      return { id, slug };
    };
    const [p, q] = [await mk('होम चयन एक'), await mk('होम चयन दो')];
    const draft = (await call(clients.editor, 'post', '/contents', baseDraft())).body;
    expect((await call(clients.editor, 'put', '/homepage', { featured_ids: [p.id] })).status).toBe(403);
    expect((await call(clients.editor_in_chief, 'put', '/homepage', { featured_ids: [p.id, draft.id] })).status).toBe(422);
    expect((await call(clients.editor_in_chief, 'put', '/homepage', { featured_ids: [q.id, p.id] })).status).toBe(200);
    expect((await pub('/home')).body.blocks.picks.map((x: { slug: string }) => x.slug)).toEqual([q.slug, p.slug]);
    await call(clients.editor_in_chief, 'put', '/homepage', { featured_ids: [] });
    expect((await pub('/home')).body.blocks.picks).toBeUndefined();
  });
  it('settings: site_admin only, whitelisted keys, tags stripped, shown publicly when non-empty', async () => {
    expect((await call(clients.editor_in_chief, 'put', '/settings', { values: { contact_phone: '1' } })).status).toBe(403);
    expect((await call(clients.site_admin, 'put', '/settings', { values: { secret_key: 'x' } })).status).toBe(422);
    const ok = await call(clients.site_admin, 'put', '/settings', { values: { contact_email: 'desk@example.org', contact_phone: '', site_description: '<i>विवरण</i>' } });
    expect(ok.status).toBe(200);
    expect((await pub('/settings/public')).body).toEqual({ contact_email: 'desk@example.org', site_description: 'विवरण' });
    expect((await call(clients.site_admin, 'get', '/settings')).body.contact_phone).toBe('');
  });
  it('media: list, alt text update, and delete only when unused', async () => {
    const list = await call(clients.content_manager, 'get', '/media');
    expect(list.status).toBe(200);
    expect(list.body.items.length).toBeGreaterThan(0);
    expect((await call(clients.site_admin, 'delete', `/media/${altMediaId}`)).status).toBe(422); // used as a cover
    const spare = await MediaAsset.create({ storage_key: 'spare.png', mime: 'image/png', width: 1, height: 1, bytes: 1, alt_text: '' });
    expect((await call(clients.editor, 'delete', `/media/${spare._id}`)).status).toBe(403);
    expect((await call(clients.site_admin, 'delete', `/media/${spare._id}`)).status).toBe(204);
  });
  it('audit: every change is recorded with actor, from and to; the log holds no body text and is read only', async () => {
    const { id } = await approvedItem({ body: 'गुप्त पाठ जो लॉग में नहीं आना चाहिए' });
    const res = await call(clients.editor_in_chief, 'get', `/audit?entity=content&page_size=100`);
    expect(res.status).toBe(200);
    const mine = res.body.items.filter((a: { entity_id: string }) => a.entity_id === id);
    expect(mine.map((a: { action: string }) => a.action)).toEqual(expect.arrayContaining(['content.create', 'content.transition']));
    expect(mine.find((a: { to: string }) => a.to === 'approved')).toMatchObject({ from: 'in_review' });
    expect(JSON.stringify(res.body)).not.toContain('गुप्त पाठ');
    expect((await call(clients.editor_in_chief, 'delete', '/audit')).status).toBe(404);
    expect((await call(clients.editor_in_chief, 'get', '/audit?page_size=1000')).status).toBe(422);
  });
  it('dashboard counts items by status; ops health reports the scheduler', async () => {
    const dash = (await call(clients.content_manager, 'get', '/dashboard')).body;
    expect(dash.counts.draft).toBeGreaterThan(0);
    expect(dash.counts.published).toBeGreaterThan(0);
    const ops = (await call(clients.site_admin, 'get', '/ops/health')).body;
    expect(ops.db).toBe('up');
    expect(ops.scheduler.last_run_at).toBeTruthy();
  });
});
