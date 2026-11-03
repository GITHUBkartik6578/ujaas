import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { Content, SiteSetting, SlugRedirect, Author } from '../src/models/index.js';
import { seedDevData, type DevSeedResult } from '../src/seed/dev.js';
import { createApp } from '../src/app.js';
import { startHarness, testEnv, type Harness } from './helpers.js';

let h: Harness;
let seed: DevSeedResult;
const get = (path: string) => request(h.app).get(`/api/v1${path}`);
const slugsOf = (body: { items: Array<{ slug: string }> }) => body.items.map((i) => i.slug).sort();

beforeAll(async () => {
  h = await startHarness({ RATE_LIMIT_SCALE: '100' });
  // Empty database first: every block must simply be absent (home hides what has no data).
  const empty = await get('/home');
  expect(empty.body).toEqual({ blocks: {} });
  seed = await seedDevData();
});
afterAll(async () => {
  await h.close();
});

const s = (k: string) => seed.slugs[k]!;
const HIDDEN = ['hidden', 'draft', 'future', 'archived', 'approved'];
const HIDDEN_WORDS = ['गुप्तशब्द', 'मसौदाशब्द', 'भविष्यशब्द', 'पुरालेखशब्द', 'अनुमोदितशब्द'];

describe('T-SRCH-02 Hindi search relevance set (30+ queries, index and query share one normaliser)', () => {
  const cases: Array<[string, string[]]> = [
    ['आँगन', ['aangan']], ['आंगन', ['aangan']], ['धूप', ['aangan']], ['आँगन की धूप', ['aangan']],
    ['हँसी', ['aangan']], ['हंसी', ['aangan']], ['उजास', ['aangan']],
    ['ज़िंदगी', ['zindagi']], ['जिंदगी', ['zindagi']], ['ग़ज़ल', ['zindagi']], ['गजल', ['zindagi']],
    ['सफ़र', ['zindagi']], ['सफर', ['zindagi']], ['ख़ामोशी', ['zindagi']], ['खामोशी', ['zindagi']],
    ['बारिश', ['barish']], ['बारिश की रात।', ['barish']], ['  बारिश   रात ', ['barish']],
    ['दीपक', ['barish']], ['काँपती', ['barish']], ['कांपती', ['barish']],
    ['भाषा', ['bhasha']], ['आईना', ['bhasha']], ['रचनाकार निजी', ['bhasha']],
    ['चाँदनी', ['chandni']], ['चांदनी', ['chandni']], ['चाँदनी रात', ['chandni']],
    ['पहाड़', ['pahad']], ['पहाड', ['pahad']], ['नदी का गीत', ['pahad']],
    ['नमूना', ['aangan', 'zindagi', 'barish', 'bhasha', 'chandni', 'pahad']],
    ['रचनाकार एक', ['aangan', 'chandni', 'pahad']], ['कविता', ['aangan', 'chandni', 'pahad']],
    ['गुप्तशब्द', []], ['मसौदाशब्द', []], ['भविष्यशब्द', []], ['पुरालेखशब्द', []], ['अनुमोदितशब्द', []], ['xyzzy', []],
  ];
  it(`returns the expected published records for all ${cases.length} queries`, async () => {
    expect(cases.length).toBeGreaterThanOrEqual(30);
    const failures: string[] = [];
    for (const [q, want] of cases) {
      const res = await get(`/search?q=${encodeURIComponent(q)}&page_size=50`);
      const got = slugsOf(res.body);
      const exp = want.map(s).sort();
      if (res.status !== 200 || JSON.stringify(got) !== JSON.stringify(exp)) {
        failures.push(`${JSON.stringify(q)} -> ${JSON.stringify(got)} expected ${JSON.stringify(exp)} (HTTP ${res.status})`);
      }
    }
    expect(failures).toEqual([]);
  });
});

describe('T-SRCH-01 / T-SRCH-03 search behaviour', () => {
  it('ranks a title match first, paginates and filters by type and category', async () => {
    const all = await get('/search?q=%E0%A4%A8%E0%A4%AE%E0%A5%82%E0%A4%A8%E0%A4%BE&page_size=2&page=2');
    expect(all.status).toBe(200);
    expect(all.body.total).toBe(6);
    expect(all.body.items).toHaveLength(2);
    expect((await get(`/search?q=${encodeURIComponent('नमूना')}&type=ghazal`)).body.items.map((i: { slug: string }) => i.slug)).toEqual([s('zindagi')]);
    expect(slugsOf((await get(`/search?q=${encodeURIComponent('नमूना')}&category=kavita`)).body)).toEqual([s('aangan'), s('chandni'), s('pahad')].sort());
  });
  it('rejects bad input with 422 and Hindi-ready field errors; empty result is a normal 200', async () => {
    expect((await get('/search')).status).toBe(422);
    expect((await get(`/search?q=${'क'.repeat(101)}`)).status).toBe(422);
    expect((await get('/search?q=x&page_size=500')).status).toBe(422);
    expect((await get('/search?q[$ne]=x')).status).toBe(422); // operator injection never reaches Mongo
    expect((await get('/search?q=a&q=b')).status).toBe(422);
    const none = await get('/search?q=%E0%A4%95%E0%A5%8B%E0%A4%88-%E0%A4%A8%E0%A4%B9%E0%A5%80%E0%A4%82-zzz');
    expect(none.status).toBe(200);
    expect(none.body.items).toEqual([]);
  });
});

describe('T-CAT-01 contents and categories', () => {
  it('lists only published contents, newest first, with category counts from published items only', async () => {
    const res = await get('/contents?page_size=50');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(6);
    expect(res.body.items.map((i: { slug: string }) => i.slug)).toEqual(
      ['aangan', 'barish', 'zindagi', 'bhasha', 'chandni', 'pahad'].map(s),
    );
    const cats = (await get('/categories')).body.items as Array<{ slug: string; works_count: number }>;
    expect(Object.fromEntries(cats.map((c) => [c.slug, c.works_count]))).toEqual({ kavita: 3, kahani: 1, ghazal: 1, vichar: 1 });
    expect(slugsOf((await get('/categories/kavita/contents')).body)).toEqual([s('aangan'), s('chandni'), s('pahad')].sort());
    expect((await get('/categories/nope')).status).toBe(404);
    expect((await get('/contents?type=nonsense')).status).toBe(422);
    expect((await get('/contents?category=nope')).body.items).toEqual([]);
  });
  it('paginates', async () => {
    const p2 = await get('/contents?page_size=4&page=2');
    expect(p2.body.items).toHaveLength(2);
    expect(p2.body.page).toBe(2);
    expect(p2.body.page_size).toBe(4);
  });
});

describe('T-READ-01 detail page data', () => {
  it('returns the full text with verse line breaks kept, credited authors and source fields', async () => {
    const res = await get(`/contents/${s('aangan')}`);
    expect(res.status).toBe(200);
    expect(res.body.body).toBe('आँगन में उतरी धूप\nहँसी की तरह\nसुबह का उजास');
    expect(res.body.body_format).toBe('verse');
    expect(res.body.authors).toEqual([{ name: 'रचनाकार एक', slug: 'rachnakar-ek', role: 'author' }]);
    expect(res.body.category).toEqual({ slug: 'kavita', name: 'कविता' });
  });
  it('shows a non-public author as plain text (no slug) and never links a profile', async () => {
    const res = await get(`/contents/${s('bhasha')}`);
    expect(res.body.authors).toEqual([{ name: 'रचनाकार निजी', slug: null, role: 'author' }]);
  });
  it('covers need a public asset with alt text', async () => {
    expect((await get(`/contents/${s('aangan')}`)).body.cover).toMatchObject({ url: '/media/dev-cover-with-alt.png', alt: 'DEV DATA: नमूना आवरण' });
    expect((await get(`/contents/${s('pahad')}`)).body.cover).toBeNull();
  });
});

describe('T-AUTH-01 authors', () => {
  it('lists only public authors with published-work counts and supports the alphabet filter', async () => {
    const res = await get('/authors');
    expect(slugsOf(res.body)).toEqual(['rachnakar-do', 'rachnakar-ek', 'rachnakar-teen']);
    const ek = res.body.items.find((a: { slug: string }) => a.slug === 'rachnakar-ek');
    expect(ek.works_count).toBe(3); // the unpublished, draft, future, archived and approved works are not counted
    expect(slugsOf((await get(`/authors?startswith=${encodeURIComponent('रचनाकार ए')}`)).body)).toEqual(['rachnakar-ek']);
    expect(slugsOf((await get('/authors?type=ghazal')).body)).toEqual(['rachnakar-teen']);
  });
  it('a non-public author is a 404 (profile and works) and never exposes private_contact', async () => {
    expect((await get('/authors/rachnakar-niji')).status).toBe(404);
    expect((await get('/authors/rachnakar-niji/contents')).status).toBe(404);
    const profile = await get('/authors/rachnakar-ek');
    expect(profile.status).toBe(200);
    expect(JSON.stringify(profile.body)).not.toMatch(/private_contact|is_public/);
    expect(slugsOf((await get('/authors/rachnakar-ek/contents')).body)).toEqual([s('aangan'), s('chandni'), s('pahad')].sort());
    expect((await get('/contents?author=rachnakar-niji')).body.items).toEqual([]);
  });
  it('an archived author disappears', async () => {
    await Author.updateOne({ slug: 'rachnakar-do' }, { $set: { archived: true } });
    expect((await get('/authors/rachnakar-do')).status).toBe(404);
    await Author.updateOne({ slug: 'rachnakar-do' }, { $set: { archived: false } });
  });
});

describe('T-COL-01 collections', () => {
  it('keeps the admin order and omits the unpublished member', async () => {
    const res = await get('/collections/namuna-sangrah');
    expect(res.status).toBe(200);
    expect(res.body.items.map((i: { slug: string }) => i.slug)).toEqual([s('barish'), s('aangan'), s('chandni')]);
    const list = await get('/collections');
    expect(list.body.items[0]).toMatchObject({ slug: 'namuna-sangrah', works_count: 3 });
    expect((await get('/collections/nope')).status).toBe(404);
  });
});

describe('home, settings, redirects, sitemap data', () => {
  it('home gives picks (featured), latest and authors, and omits the issue block until it exists', async () => {
    const { blocks } = (await get('/home')).body;
    expect(blocks.picks.map((p: { slug: string }) => p.slug)).toEqual([s('aangan'), s('pahad')]);
    expect(blocks.picks[0].lines).toEqual(['आँगन में उतरी धूप', 'हँसी की तरह', 'सुबह का उजास']);
    expect(blocks.latest.length).toBeGreaterThan(0);
    expect(blocks.authors.map((a: { slug: string }) => a.slug)).toContain('rachnakar-ek');
    expect(blocks.issue).toBeUndefined();
  });
  it('settings/public returns only whitelisted, non-empty values', async () => {
    await SiteSetting.create([
      { key: 'contact_email', value: '' }, { key: 'contact_phone', value: 'DEV-PHONE' }, { key: 'secret_key', value: 'do-not-leak' },
    ]);
    expect((await get('/settings/public')).body).toEqual({ contact_phone: 'DEV-PHONE' });
  });
  it('old slugs resolve through redirects, but only to published targets', async () => {
    const aangan = await Content.findOne({ slug: s('aangan') });
    const hidden = await Content.findOne({ slug: s('hidden') });
    await SlugRedirect.create([
      { old_slug: 'purana-aangan', entity: 'content', target_id: aangan!._id },
      { old_slug: 'purana-chhipi', entity: 'content', target_id: hidden!._id },
    ]);
    expect((await get('/redirects/content/purana-aangan')).body).toEqual({ slug: s('aangan') });
    expect((await get('/redirects/content/purana-chhipi')).status).toBe(404);
    expect((await get('/redirects/content/kuch-nahin')).status).toBe(404);
  });
  it('sitemap data lists published public URLs only', async () => {
    const paths = ((await get('/sitemap-data')).body.urls as Array<{ path: string }>).map((u) => u.path);
    expect(paths).toContain(`/rachna/${s('aangan')}`);
    expect(paths).toContain('/rachnakar/rachnakar-ek');
    expect(paths).not.toContain('/rachnakar/rachnakar-niji');
    for (const k of HIDDEN) expect(paths).not.toContain(`/rachna/${s(k)}`);
  });
});

describe('T-PUB-03 / T-SUB-05 enumeration: nothing unpublished or private is reachable', () => {
  const routes = (slug: string) => [
    '/contents?page_size=50', `/contents/${slug}`, '/categories/kavita/contents?page_size=50', '/authors/rachnakar-ek/contents?page_size=50',
    '/collections/namuna-sangrah', '/home', '/sitemap-data', '/search?q=%E0%A4%A8%E0%A4%AE%E0%A5%82%E0%A4%A8%E0%A4%BE&page_size=50',
  ];

  it('never returns hidden records or private fields from any public route', async () => {
    const forbidden = [
      'rights_note', 'submission_id', 'lang_checked', 'proof_checked', 'final_approved', 'revision_no', 'search_text', 'private_contact',
      'permission_note', 'uploaded_by', 'original_filename', 'password', 'ip_hash', 'storage_key', 'is_public', 'dev_data',
      ...HIDDEN_WORDS, ...HIDDEN.map((k) => s(k)),
    ];
    for (const r of routes(s('aangan'))) {
      const res = await get(r);
      expect(res.status, r).toBe(200);
      const text = JSON.stringify(res.body);
      for (const f of forbidden) expect(text, `${r} leaked ${f}`).not.toContain(f);
    }
    for (const k of HIDDEN) expect((await get(`/contents/${s(k)}`)).status, k).toBe(404);
  });

  it('unpublish removes an item from lists, search, author, category, collection, home, sitemap and detail at once', async () => {
    const before = [`/contents/${s('chandni')}`, '/contents?page_size=50', '/collections/namuna-sangrah', '/home', '/sitemap-data', `/search?q=${encodeURIComponent('चाँदनी')}`, '/authors/rachnakar-ek/contents', '/categories/kavita/contents'];
    for (const r of before) expect(JSON.stringify((await get(r)).body), r).toContain('chandni');
    await Content.updateOne({ slug: s('chandni') }, { $set: { status: 'unpublished', unpublished_at: new Date() } });
    for (const r of before) {
      const res = await get(r);
      if (r.startsWith('/contents/')) expect(res.status).toBe(404);
      else expect(JSON.stringify(res.body), r).not.toContain('"chandni"');
    }
    expect((await get(`/search?q=${encodeURIComponent('चाँदनी')}`)).body.total).toBe(0);
  });

  it('is read-only: public routes accept no writes and no private collections are routed', async () => {
    for (const p of ['/contents', '/submissions-list', '/admin/submissions']) {
      const res = await request(h.app).post(`/api/v1${p}`).set('Origin', 'http://localhost:3000').send({});
      expect([401, 404]).toContain(res.status);
    }
    expect((await get('/submissions')).status).toBe(404);
  });
});

describe('rate limit', () => {
  it('search is limited to 30 per minute per IP (429 with Retry-After)', async () => {
    let last = 0;
    let retry: string | undefined;
    const strict = createApp(testEnv()); // RATE_LIMIT_SCALE defaults to 1, as in production
    for (let i = 0; i < 35; i++) {
      const res = await request(strict).get('/api/v1/search?q=%E0%A4%A8%E0%A4%AE%E0%A5%82%E0%A4%A8%E0%A4%BE');
      last = res.status;
      retry = res.headers['retry-after'];
    }
    expect(last).toBe(429);
    expect(retry).toBeTruthy();
  });
});
