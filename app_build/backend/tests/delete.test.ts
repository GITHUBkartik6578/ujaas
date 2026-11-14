import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Types } from 'mongoose';
import request from 'supertest';
import {
  Author, Category, Collection, CollectionItem, Content, ContentRevision, IssueItem, MagazineIssue, SlugRedirect, AuditLog,
} from '../src/models/index.js';
import { ORIGIN, loginAgent, makeAdmin, startHarness, type Harness } from './helpers.js';

let h: Harness;
let admin: ReturnType<typeof request.agent>;
let adminCsrf: string;
let editor: ReturnType<typeof request.agent>;
let editorCsrf: string;
let catId: Types.ObjectId;
let n = 0;

beforeAll(async () => {
  h = await startHarness();
  const a = await loginAgent(h.app, (await makeAdmin('site_admin')).email);
  admin = a.agent; adminCsrf = a.csrf!;
  const e = await loginAgent(h.app, (await makeAdmin('editor')).email);
  editor = e.agent; editorCsrf = e.csrf!;
  catId = (await Category.create({ name: 'कविता', slug: 'kavita-del' }))._id;
});
afterAll(async () => { await h.close(); });

const del = (ag: typeof admin, csrf: string, url: string) => ag.delete(`/api/v1/admin${url}`).set('Origin', ORIGIN).set('X-CSRF-Token', csrf);
const author = (name: string) => Author.create({ name, slug: `a-${++n}-${name.length}`, is_public: true });
const piece = (title: string, status: 'draft' | 'published', authorIds: Types.ObjectId[]) => Content.create({
  title, slug: `p-${++n}`, content_type: 'kavita', body: 'a\nb', body_format: 'verse', excerpt: 'x', category_id: catId,
  credits: authorIds.map((id) => ({ author_id: id, role: 'author' })), status, published_at: status === 'published' ? new Date(Date.now() - 1000) : undefined,
});

describe('delete content (any status)', () => {
  it('deletes a published piece and everything that points at it', async () => {
    const a = await author('लेखक');
    const c = await piece('प्रकाशित', 'published', [a._id]);
    await ContentRevision.create({ content_id: c._id, revision_no: 1, snapshot: {} });
    await SlugRedirect.create({ old_slug: `old-${n}`, entity: 'content', target_id: c._id });
    const col = await Collection.create({ title: 'सं', slug: `col-${++n}` });
    await CollectionItem.create({ collection_id: col._id, content_id: c._id, position: 1 });
    const iss = await MagazineIssue.create({ title: 'अंक', slug: `iss-${++n}`, issue_number: n, period_label: 'x', publication_date: new Date() });
    await IssueItem.create({ issue_id: iss._id, content_id: c._id, position: 1 });

    const res = await del(admin, adminCsrf, `/contents/${c._id}`);
    expect(res.status).toBeLessThan(300);
    expect(await Content.exists({ _id: c._id })).toBeNull();
    expect(await ContentRevision.countDocuments({ content_id: c._id })).toBe(0);
    expect(await SlugRedirect.countDocuments({ target_id: c._id })).toBe(0);
    expect(await CollectionItem.countDocuments({ content_id: c._id })).toBe(0);
    expect(await IssueItem.countDocuments({ content_id: c._id })).toBe(0);
    expect(await Collection.exists({ _id: col._id })).toBeTruthy(); // the grouping stays
    expect(await AuditLog.countDocuments({ action: 'content.delete', entity_id: String(c._id) })).toBe(1);
    expect((await request(h.app).get(`/api/v1/contents/${c.slug}`)).status).toBe(404);
  });

  it('is for site admins only', async () => {
    const a = await author('दूसरा');
    const c = await piece('रहेगा', 'draft', [a._id]);
    expect((await del(editor, editorCsrf, `/contents/${c._id}`)).status).toBe(403);
    expect(await Content.exists({ _id: c._id })).toBeTruthy();
  });
});

describe('delete author', () => {
  it('deletes an author with no works', async () => {
    const a = await author('खाली');
    expect((await del(admin, adminCsrf, `/authors/${a._id}`)).status).toBeLessThan(300);
    expect(await Author.exists({ _id: a._id })).toBeNull();
  });

  it('refuses an author with works unless with_works=1, then removes sole-credit works and only the credit on shared ones', async () => {
    const a = await author('मुख्य');
    const b = await author('सहलेखक');
    const solo = await piece('अकेली', 'published', [a._id]);
    const shared = await piece('साझा', 'published', [a._id, b._id]);

    const refused = await del(admin, adminCsrf, `/authors/${a._id}`);
    expect(refused.status).toBe(422);
    expect(JSON.stringify(refused.body)).toContain('has_works');
    expect(await Author.exists({ _id: a._id })).toBeTruthy();

    const ok = await del(admin, adminCsrf, `/authors/${a._id}?with_works=1`);
    expect(ok.status).toBeLessThan(300);
    expect(await Author.exists({ _id: a._id })).toBeNull();
    expect(await Content.exists({ _id: solo._id })).toBeNull();
    const kept = await Content.findById(shared._id).lean();
    expect(kept?.credits.map((c) => String(c.author_id))).toEqual([String(b._id)]);
  });

  it('is for site admins only', async () => {
    const a = await author('सुरक्षित');
    expect((await del(editor, editorCsrf, `/authors/${a._id}`)).status).toBe(403);
    expect(await Author.exists({ _id: a._id })).toBeTruthy();
  });
});

describe('delete collection and issue', () => {
  it('deletes a collection and its list but keeps the pieces', async () => {
    const a = await author('सं-लेखक');
    const c = await piece('बची रहेगी', 'published', [a._id]);
    const col = await Collection.create({ title: 'हटेगा', slug: `col-${++n}` });
    await CollectionItem.create({ collection_id: col._id, content_id: c._id, position: 1 });
    expect((await del(admin, adminCsrf, `/collections/${col._id}`)).status).toBeLessThan(300);
    expect(await Collection.exists({ _id: col._id })).toBeNull();
    expect(await CollectionItem.countDocuments({ collection_id: col._id })).toBe(0);
    expect(await Content.exists({ _id: c._id })).toBeTruthy();
    expect((await del(editor, editorCsrf, `/collections/${col._id}`)).status).toBe(403);
  });

  it('deletes an issue and its list but keeps the pieces; editors may not', async () => {
    const a = await author('अंक-लेखक');
    const c = await piece('अंक की रचना', 'published', [a._id]);
    const iss = await MagazineIssue.create({ title: 'हटेगा', slug: `iss-${++n}`, issue_number: n + 100, period_label: 'x', publication_date: new Date() });
    await IssueItem.create({ issue_id: iss._id, content_id: c._id, position: 1 });
    expect((await del(editor, editorCsrf, `/issues/${iss._id}`)).status).toBe(403);
    expect((await del(admin, adminCsrf, `/issues/${iss._id}`)).status).toBeLessThan(300);
    expect(await MagazineIssue.exists({ _id: iss._id })).toBeNull();
    expect(await IssueItem.countDocuments({ issue_id: iss._id })).toBe(0);
    expect(await Content.exists({ _id: c._id })).toBeTruthy();
  });
});
