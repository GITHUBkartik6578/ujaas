import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { Content, IssueItem, MagazineIssue, MediaAsset } from '../src/models/index.js';
import type { Role } from '../src/lib/workflow.js';
import { seedDevData, type DevSeedResult } from '../src/seed/dev.js';
import { ORIGIN, loginAgent, makeAdmin, startHarness, type Harness } from './helpers.js';

let h: Harness;
interface Client { agent: ReturnType<typeof request.agent>; csrf: string }
const clients = {} as Record<Role, Client>;
const ROLE_LIST: Role[] = ['site_admin', 'editor_in_chief', 'editor', 'content_manager'];
type Method = 'get' | 'post' | 'patch' | 'put' | 'delete';
const call = (c: Client, method: Method, path: string, body?: unknown) => {
  const req = c.agent[method](`/api/v1/admin${path}`).set('Origin', ORIGIN).set('X-CSRF-Token', c.csrf);
  return body === undefined ? req : req.send(body as object);
};
const pub = (path: string) => request(h.app).get(`/api/v1${path}`);

let seed: DevSeedResult;
const idOfContent = async (key: string) => String((await Content.findOne({ slug: seed.slugs[key] }).lean())!._id);
let number = 0;
const newIssue = (over: Record<string, unknown> = {}) => ({
  title: `परीक्षण अंक ${++number}`, issue_number: 100 + number, period_label: 'जनवरी–मार्च', publication_date: '2026-03-15',
  cover_media_id: seed.mediaIds.withAlt, editorial_intro: 'अंक का परिचय', publication_details: 'प्रकाशक का विवरण', ...over,
});
/** An issue with the given members, published. */
async function publishedIssue(keys: string[], over: Record<string, unknown> = {}) {
  const issue = (await call(clients.editor, 'post', '/issues', newIssue(over))).body;
  const items = await Promise.all(keys.map(async (k, i) => ({ content_id: await idOfContent(k), section_label: i === 0 ? 'पहला खंड' : 'दूसरा खंड' })));
  const put = await call(clients.editor, 'put', `/issues/${issue.id}/items`, { items });
  expect(put.status, JSON.stringify(put.body)).toBe(200);
  const pubd = await call(clients.editor_in_chief, 'post', `/issues/${issue.id}/transition`, { to: 'published' });
  expect(pubd.status, JSON.stringify(pubd.body)).toBe(200);
  return { id: issue.id as string, slug: issue.slug as string, number: issue.issue_number as number };
}

beforeAll(async () => {
  h = await startHarness({ ENABLED_ROLES: ROLE_LIST.join(','), RATE_LIMIT_SCALE: '100' });
  seed = await seedDevData();
  for (const role of ROLE_LIST) {
    const { email } = await makeAdmin(role);
    const l = await loginAgent(h.app, email);
    clients[role] = { agent: l.agent, csrf: l.csrf! };
  }
});
afterAll(async () => {
  await h.close();
});

describe('before the first issue exists', () => {
  it('the public archive is empty, the home page has no issue block, and any issue address is 404', async () => {
    const res = await pub('/issues');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ items: [], total: 0, years: [], current: null });
    expect((await pub('/home')).body.blocks.issue).toBeUndefined();
    expect((await pub('/issues/ank-1')).status).toBe(404);
  });
});

describe('T-ADM-03 the issue manager is for editors and above', () => {
  const ZERO = '000000000000000000000000';
  const routes: Array<[Method, string, Role[], unknown?]> = [
    ['get', '/issues', ['site_admin', 'editor_in_chief', 'editor']], ['post', '/issues', ['site_admin', 'editor_in_chief', 'editor'], {}],
    ['get', `/issues/${ZERO}`, ['site_admin', 'editor_in_chief', 'editor']], ['patch', `/issues/${ZERO}`, ['site_admin', 'editor_in_chief', 'editor'], {}],
    ['put', `/issues/${ZERO}/items`, ['site_admin', 'editor_in_chief', 'editor'], { items: [] }],
    ['post', `/issues/${ZERO}/transition`, ['site_admin', 'editor_in_chief', 'editor'], { to: 'published' }],
  ];
  it('matches the permission table, and every route answers 401 without a session', async () => {
    const wrong: string[] = [];
    for (const [method, path, allowed, body] of routes) {
      for (const role of ROLE_LIST) {
        const res = await call(clients[role], method, path, body);
        if (allowed.includes(role) === (res.status === 403)) wrong.push(`${role} ${method} ${path} -> ${res.status}`);
      }
      expect((await request(h.app)[method](`/api/v1/admin${path}`).set('Origin', ORIGIN)).status, `${method} ${path}`).toBe(401);
    }
    expect(wrong).toEqual([]);
  });
});

describe('issue records', () => {
  it('creates a draft with a generated address and cleans the text', async () => {
    const res = await call(clients.editor, 'post', '/issues', newIssue({ title: '<b>पहला अंक</b>', editorial_intro: '<i>परिचय</i>' }));
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ title: 'पहला अंक', status: 'draft', editorial_intro: 'परिचय', show_in_archive: true });
    expect(res.body.slug).toMatch(/^ank-\d+/);
  });
  it('refuses a number or address that is taken, a missing cover file and missing fields', async () => {
    const a = (await call(clients.editor, 'post', '/issues', newIssue({ slug: 'taken-slug' }))).body;
    const dupNumber = await call(clients.editor, 'post', '/issues', newIssue({ issue_number: a.issue_number }));
    expect(dupNumber.status).toBe(422);
    expect(dupNumber.body.error.fields[0].code).toBe('number_taken');
    expect((await call(clients.editor, 'post', '/issues', newIssue({ slug: 'taken-slug' }))).body.error.fields[0].code).toBe('slug_taken');
    expect((await call(clients.editor, 'post', '/issues', newIssue({ cover_media_id: '1'.repeat(24) }))).status).toBe(422);
    expect((await call(clients.editor, 'post', '/issues', { title: 'x' })).status).toBe(422);
    const other = (await call(clients.editor, 'post', '/issues', newIssue())).body;
    expect((await call(clients.editor, 'patch', `/issues/${other.id}`, { issue_number: a.issue_number })).status).toBe(422);
    expect((await call(clients.editor, 'patch', `/issues/${other.id}`, { period_label: 'अप्रैल–जून', volume: '२' })).body).toMatchObject({ period_label: 'अप्रैल–जून', volume: '२' });
  });
});

describe('T-MAG-02 ordered contents, shared creations', () => {
  it('only published creations can be attached, in any order, with section labels; a failed replace keeps the old order', async () => {
    const issue = (await call(clients.editor, 'post', '/issues', newIssue())).body;
    const a = await idOfContent('aangan');
    const b = await idOfContent('zindagi');
    const draft = String((await Content.findOne({ slug: seed.slugs.draft }).lean())!._id);
    const bad = await call(clients.editor, 'put', `/issues/${issue.id}/items`, { items: [{ content_id: a }, { content_id: draft }] });
    expect(bad.status).toBe(422);
    expect(bad.body.error.fields[0].code).toBe('not_published');
    expect((await call(clients.editor, 'put', `/issues/${issue.id}/items`, { items: [{ content_id: a }, { content_id: a }] })).status).toBe(422);
    const ok = await call(clients.editor, 'put', `/issues/${issue.id}/items`, { items: [{ content_id: b, section_label: 'काव्य खंड' }, { content_id: a, section_label: 'कथा खंड' }] });
    expect(ok.body.items.map((i: { title: string; section_label: string }) => [i.title, i.section_label])).toEqual([
      ['नमूना ग़ज़ल: ज़िंदगी', 'काव्य खंड'], ['नमूना कविता: आँगन की धूप', 'कथा खंड'],
    ]);
    // a failed replace changes nothing
    expect((await call(clients.editor, 'put', `/issues/${issue.id}/items`, { items: [{ content_id: draft }] })).status).toBe(422);
    expect((await call(clients.editor, 'get', `/issues/${issue.id}`)).body.items).toHaveLength(2);
    expect(await IssueItem.countDocuments({ issue_id: issue.id })).toBe(2);
    // reorder
    const re = await call(clients.editor, 'put', `/issues/${issue.id}/items`, { items: [{ content_id: a }, { content_id: b }] });
    expect(re.body.items.map((i: { position: number }) => i.position)).toEqual([1, 2]);
    expect(re.body.items[0].content_id).toBe(a);
  });

  it('the same creation can be in two issues and in the general list without being copied', async () => {
    const one = await publishedIssue(['aangan', 'zindagi'], { publication_date: '2026-03-01' });
    const two = await publishedIssue(['aangan', 'barish'], { publication_date: '2026-06-01' });
    const slug = seed.slugs.aangan!;
    expect(await Content.countDocuments({ slug })).toBe(1);
    for (const i of [one, two]) {
      const page = (await pub(`/issues/${i.slug}`)).body;
      expect(page.items.map((x: { content: { slug: string } }) => x.content.slug)).toContain(slug);
    }
    expect(JSON.stringify((await pub('/contents?page_size=50')).body)).toContain(slug);
    expect((await pub(`/contents/${slug}`)).status).toBe(200); // the article keeps its own address
  });

  it('previous and next stay inside the issue, in order', async () => {
    const i = await publishedIssue(['aangan', 'zindagi', 'barish']);
    const mid = (await pub(`/issues/${i.slug}/neighbors/${seed.slugs.zindagi}`)).body;
    expect(mid.prev.slug).toBe(seed.slugs.aangan);
    expect(mid.next.slug).toBe(seed.slugs.barish);
    expect((await pub(`/issues/${i.slug}/neighbors/${seed.slugs.aangan}`)).body.prev).toBeNull();
    expect((await pub(`/issues/${i.slug}/neighbors/${seed.slugs.bhasha}`)).status).toBe(404); // not a member
  });
});

describe('publishing an issue', () => {
  it('needs a cover with alt text and at least one published creation, and only the chief may publish', async () => {
    const noCover = (await call(clients.editor, 'post', '/issues', newIssue({ cover_media_id: null }))).body;
    const r1 = await call(clients.editor_in_chief, 'post', `/issues/${noCover.id}/transition`, { to: 'published' });
    expect(r1.status).toBe(422);
    expect(r1.body.error.code).toBe('publish_blocked');
    expect(r1.body.error.fields.map((f: { field: string }) => f.field)).toEqual(['cover', 'items']);

    const noAlt = (await call(clients.editor, 'post', '/issues', newIssue({ cover_media_id: seed.mediaIds.noAlt }))).body;
    await call(clients.editor, 'put', `/issues/${noAlt.id}/items`, { items: [{ content_id: await idOfContent('aangan') }] });
    const r2 = await call(clients.editor_in_chief, 'post', `/issues/${noAlt.id}/transition`, { to: 'published' });
    expect(r2.body.error.fields.map((f: { field: string }) => f.field)).toEqual(['cover_alt']);

    const ok = (await call(clients.editor, 'post', '/issues', newIssue())).body;
    await call(clients.editor, 'put', `/issues/${ok.id}/items`, { items: [{ content_id: await idOfContent('aangan') }] });
    expect((await call(clients.editor, 'post', `/issues/${ok.id}/transition`, { to: 'published' })).status).toBe(403);
    expect((await pub(`/issues/${ok.slug}`)).status).toBe(404); // a draft is not public
    const done = await call(clients.editor_in_chief, 'post', `/issues/${ok.id}/transition`, { to: 'published' });
    expect(done.status).toBe(200);
    expect(done.body.published_at).toBeTruthy();
    expect((await pub(`/issues/${ok.slug}`)).status).toBe(200);
  });

  it('illegal moves are 422; a published issue can be pulled back or archived, an archived one returns to draft', async () => {
    const i = await publishedIssue(['aangan']);
    expect((await call(clients.editor, 'post', `/issues/${i.id}/transition`, { to: 'archived' })).status).toBe(403);
    expect((await call(clients.editor_in_chief, 'post', `/issues/${i.id}/transition`, { to: 'archived' })).body.status).toBe('archived');
    expect((await pub(`/issues/${i.slug}`)).status).toBe(404);
    expect((await call(clients.editor, 'post', `/issues/${i.id}/transition`, { to: 'published' })).status).toBe(422);
    expect((await call(clients.editor, 'post', `/issues/${i.id}/transition`, { to: 'draft' })).body.status).toBe('draft');
    expect((await call(clients.site_admin, 'post', `/issues/${i.id}/transition`, { to: 'archived' })).status).toBe(422); // draft cannot be archived
  });

  it('a cover becomes public with the issue and the public record exposes no private field', async () => {
    const i = await publishedIssue(['aangan']);
    const page = (await pub(`/issues/${i.slug}`)).body;
    expect(page.cover).toMatchObject({ url: '/media/dev-cover-with-alt.png', alt: 'DEV DATA: नमूना आवरण' });
    expect(await MediaAsset.countDocuments({ _id: seed.mediaIds.withAlt, is_public: true })).toBe(1);
    const text = JSON.stringify([page, (await pub('/issues')).body]);
    // The issue record is an explicit allow-list (a creation card legitimately carries its own published date).
    expect(Object.keys(page).sort()).toEqual(['cover', 'editorial_intro', 'issue_number', 'items', 'period_label', 'publication_date', 'publication_details', 'slug', 'title', 'volume']);
    for (const secret of ['pdf', 'cover_media_id', 'dev_data', '"status"', 'rights_note', 'search_text', 'storage_key', 'show_in_archive']) expect(text, secret).not.toContain(secret);
  });
});

describe('T-MAG-01 landing, archive and year filter', () => {
  it('lists published issues newest first with a year filter, hides ones kept out of the archive, and names the current issue', async () => {
    const y25 = await publishedIssue(['aangan'], { publication_date: '2025-12-01', period_label: 'अक्टूबर–दिसंबर' });
    const y26 = await publishedIssue(['zindagi'], { publication_date: '2026-09-01', period_label: 'जुलाई–सितंबर' });
    const hidden = await publishedIssue(['barish'], { publication_date: '2026-10-15', show_in_archive: false });
    const all = (await pub('/issues?page_size=50')).body;
    const slugs = all.items.map((x: { slug: string }) => x.slug);
    expect(slugs.indexOf(y26.slug)).toBeLessThan(slugs.indexOf(y25.slug)); // newest first
    expect(slugs).not.toContain(hidden.slug); // kept out of the archive
    expect((await pub(`/issues/${hidden.slug}`)).status).toBe(200); // but still readable at its own address
    expect(all.years).toEqual(expect.arrayContaining([2026, 2025]));
    expect(all.years[0]).toBeGreaterThan(all.years.at(-1) - 1);
    expect(all.current.slug).toBe(hidden.slug); // the newest published issue
    const only25 = (await pub('/issues?year=2025&page_size=50')).body;
    expect(only25.items.map((x: { slug: string }) => x.slug)).toContain(y25.slug);
    expect(only25.items.map((x: { slug: string }) => x.slug)).not.toContain(y26.slug);
    expect((await pub('/issues?year=abc')).status).toBe(422);
    expect((await pub('/issues?page_size=500')).status).toBe(422);
    expect((await pub('/home')).body.blocks.issue.slug).toBe(hidden.slug);
    expect(JSON.stringify((await pub('/sitemap-data')).body)).toContain(`/e-patrika/${y25.slug}`);
  });
});

describe('T-MAG-03 a creation that is no longer published', () => {
  it('disappears from the public issue page, shows a warning to editors, and cannot be the only member of a published issue', async () => {
    const i = await publishedIssue(['chandni', 'pahad']);
    await Content.updateOne({ slug: seed.slugs.chandni }, { $set: { status: 'unpublished' } });
    const page = (await pub(`/issues/${i.slug}`)).body;
    expect(page.items.map((x: { content: { slug: string } }) => x.content.slug)).toEqual([seed.slugs.pahad]);
    expect((await pub(`/issues/${i.slug}/neighbors/${seed.slugs.chandni}`)).status).toBe(404);
    const admin = (await call(clients.editor, 'get', `/issues/${i.id}`)).body;
    expect(admin.items.find((x: { title: string }) => x.title.includes('चाँदनी')).warning).toBe('not_published');
    // pulling the last live member out means a draft issue cannot be published again
    await Content.updateOne({ slug: seed.slugs.pahad }, { $set: { status: 'unpublished' } });
    await call(clients.editor_in_chief, 'post', `/issues/${i.id}/transition`, { to: 'draft' });
    const again = await call(clients.editor_in_chief, 'post', `/issues/${i.id}/transition`, { to: 'published' });
    expect(again.status).toBe(422);
    expect(again.body.error.fields.map((f: { field: string }) => f.field)).toEqual(['items']);
  });
});

describe('data integrity', () => {
  it('keeps one record per issue number', async () => {
    expect(await MagazineIssue.countDocuments({ issue_number: 1 })).toBe(0);
    const idx = await MagazineIssue.collection.indexes();
    expect(idx.some((x) => x.name === 'issue_number_1' && x.unique)).toBe(true);
  });
});
