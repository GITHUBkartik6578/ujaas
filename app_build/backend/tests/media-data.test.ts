import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import sharp from 'sharp';
import { AuditLog, Content, ContactMessage, MediaAsset, Submission, SubmissionEvent, Author, Category } from '../src/models/index.js';
import { runMigrations } from '../src/db/migrate.js';
import { runRetention } from '../src/jobs/retention.js';
import { publishedFilter } from '../src/lib/queries.js';
import { mediaKey, signMediaToken } from '../src/lib/preview.js';
import { ORIGIN, loginAgent, makeAdmin, startHarness, testEnv, type Harness } from './helpers.js';

let h: Harness;
let agent: ReturnType<typeof request.agent>;
let csrf: string;

beforeAll(async () => {
  h = await startHarness();
  const { email } = await makeAdmin('site_admin');
  const l = await loginAgent(h.app, email);
  agent = l.agent;
  csrf = l.csrf!;
});
afterAll(async () => {
  await h.close();
});

const upload = (buf: Buffer, name: string) =>
  agent.post('/api/v1/admin/media').set('Origin', ORIGIN).set('X-CSRF-Token', csrf).attach('file', buf, name);

const png = () => sharp({ create: { width: 40, height: 30, channels: 3, background: '#620206' } }).png().toBuffer();

describe('T-MED-01 upload validation', () => {
  it('accepts a real PNG, stores it under a random key and never trusts the filename', async () => {
    const res = await upload(await png(), '../../etc/passwd<script>.png');
    expect(res.status).toBe(201);
    expect(res.body.url).toMatch(/^\/media\/[0-9a-f]{32}\.png$/);
    expect(res.body.url).not.toContain('passwd');
    expect(res.body.width).toBe(40);
    const stored = await MediaAsset.findById(res.body.id).lean();
    expect(stored?.storage_key).toMatch(/^[0-9a-f]{32}\.png$/);
    expect(stored?.alt_text).toBe(''); // alt text is required before public use
    expect(stored?.is_public).toBe(false);
  });

  it('strips EXIF/GPS by re-encoding', async () => {
    const withExif = await sharp({ create: { width: 64, height: 48, channels: 3, background: '#F4E2D1' } })
      .withExif({ IFD0: { Copyright: 'SECRET-OWNER', Artist: 'SECRET-ARTIST' } })
      .jpeg()
      .toBuffer();
    expect((await sharp(withExif).metadata()).exif).toBeTruthy();
    const res = await upload(withExif, 'photo.jpg');
    expect(res.status).toBe(201);
    const key = String(res.body.url).split('/').pop()!;
    const bytes = readFileSync(path.join(h.env.MEDIA_DIR, key));
    expect((await sharp(bytes).metadata()).exif).toBeUndefined();
    expect(bytes.toString('latin1')).not.toContain('SECRET-OWNER');
  });

  it('rejects wrong magic bytes even with an image extension (415)', async () => {
    const res = await upload(Buffer.from('this is plain text, not an image'), 'fake.png');
    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe('unsupported_media_type');
  });

  it('rejects SVG (415)', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    expect((await upload(svg, 'a.svg')).status).toBe(415);
    expect((await upload(svg, 'a.png')).status).toBe(415);
  });

  it('rejects a file that claims to be a JPEG but is not decodable (415)', async () => {
    const bogus = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(200, 7)]);
    expect((await upload(bogus, 'x.jpg')).status).toBe(415);
  });

  it('rejects files over 5 MB (413)', async () => {
    const big = Buffer.concat([await png(), Buffer.alloc(5 * 1024 * 1024 + 10, 1)]);
    const res = await upload(big, 'big.png');
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('payload_too_large');
  });

  it('neutralises a polyglot: payload appended to a real image is gone after re-encoding', async () => {
    const poly = Buffer.concat([await png(), Buffer.from('<?php system($_GET["c"]); ?><script>alert(1)</script>')]);
    const res = await upload(poly, 'poly.png');
    expect(res.status).toBe(201);
    const bytes = readFileSync(path.join(h.env.MEDIA_DIR, String(res.body.url).split('/').pop()!));
    expect(bytes.toString('latin1')).not.toContain('<script>');
    expect(bytes.toString('latin1')).not.toContain('system(');
  });

  it('requires a file field (422) and a session (401) and a CSRF token (403)', async () => {
    const none = await agent.post('/api/v1/admin/media').set('Origin', ORIGIN).set('X-CSRF-Token', csrf);
    expect(none.status).toBe(422);
    const anon = await request(h.app).post('/api/v1/admin/media').set('Origin', ORIGIN).attach('file', await png(), 'a.png');
    expect(anon.status).toBe(401);
    const noCsrf = await agent.post('/api/v1/admin/media').set('Origin', ORIGIN).attach('file', await png(), 'a.png');
    expect(noCsrf.status).toBe(403);
  });

  it('serves uploads with nosniff and no directory listing', async () => {
    const up = await upload(await png(), 'serve.png');
    const get = await agent.get(up.body.url); // a new upload is private: the signed-in admin sees it
    expect(get.status).toBe(200);
    expect(get.headers['x-content-type-options']).toBe('nosniff');
    expect(get.headers['content-type']).toMatch(/image\/png/);
    expect(get.headers['cache-control']).toBe('private, no-store');
    expect((await request(h.app).get('/media/')).status).toBe(404);
  });

  it('hides private images from anonymous visitors, except through a signed preview link', async () => {
    const up = await upload(await png(), 'private.png');
    const key = String(up.body.url).split('/').pop()!;
    expect((await request(h.app).get(up.body.url)).status).toBe(404); // same answer as a missing file
    const t = signMediaToken(key, mediaKey(h.env));
    expect((await request(h.app).get(`${up.body.url}?t=${t}`)).status).toBe(200);
    expect((await request(h.app).get(`${up.body.url}?t=${t}x`)).status).toBe(404);
    const expired = signMediaToken(key, mediaKey(h.env), Date.now() - 31 * 60_000);
    expect((await request(h.app).get(`${up.body.url}?t=${expired}`)).status).toBe(404);
    const otherKey = signMediaToken('0'.repeat(32) + '.png', mediaKey(h.env)); // a token is bound to one file
    expect((await request(h.app).get(`${up.body.url}?t=${otherKey}`)).status).toBe(404);
  });

  it('serves public images to anyone, with a cacheable header', async () => {
    const up = await upload(await png(), 'public.png');
    await agent.patch(`/api/v1/admin/media/${up.body.id}`).set('Origin', ORIGIN).set('X-CSRF-Token', csrf).send({ is_public: true });
    const get = await request(h.app).get(up.body.url);
    expect(get.status).toBe(200);
    expect(get.headers['cache-control']).toBe('public, max-age=604800');
  });

  it('never serves a file that has no media record', async () => {
    expect((await request(h.app).get('/media/' + 'a'.repeat(32) + '.png')).status).toBe(404);
    expect((await request(h.app).get('/media/../package.json')).status).toBe(404);
  });

  it('deleting an image removes the file and its address', async () => {
    const up = await upload(await png(), 'gone.png');
    const key = String(up.body.url).split('/').pop()!;
    await agent.patch(`/api/v1/admin/media/${up.body.id}`).set('Origin', ORIGIN).set('X-CSRF-Token', csrf).send({ is_public: true });
    expect(existsSync(path.join(h.env.MEDIA_DIR, key))).toBe(true);
    const del = await agent.delete(`/api/v1/admin/media/${up.body.id}`).set('Origin', ORIGIN).set('X-CSRF-Token', csrf);
    expect(del.status).toBe(204);
    expect(existsSync(path.join(h.env.MEDIA_DIR, key))).toBe(false);
    expect((await request(h.app).get(up.body.url)).status).toBe(404);
    expect((await agent.get(up.body.url)).status).toBe(404);
  });

  it('a malformed id on update is a 404, not a server error', async () => {
    const res = await agent.patch('/api/v1/admin/media/not-an-id').set('Origin', ORIGIN).set('X-CSRF-Token', csrf).send({ alt_text: 'x' });
    expect(res.status).toBe(404);
  });
});

describe('T-MED-02 alt text', () => {
  it('lets editors set alt, credit and permission note, with tags stripped', async () => {
    const up = await upload(await png(), 'alt.png');
    const res = await agent.patch(`/api/v1/admin/media/${up.body.id}`).set('Origin', ORIGIN).set('X-CSRF-Token', csrf)
      .send({ alt_text: '<b>खिड़की के पास खुली किताब</b>', credit: 'फ़ोटो: UJAAS', permission_note: 'अनुमति ली गई', is_public: true });
    expect(res.status).toBe(200);
    expect(res.body.alt_text).toBe('खिड़की के पास खुली किताब');
    expect(res.body).not.toHaveProperty('permission_note'); // private
  });
});

describe('audit log is append-only', () => {
  it('blocks update and delete', async () => {
    await AuditLog.create({ actor: 'system', action: 'test.row', entity: 'test' });
    await expect(AuditLog.updateOne({ action: 'test.row' }, { $set: { note: 'x' } })).rejects.toThrow(/append-only/);
    await expect(AuditLog.deleteMany({ action: 'test.row' })).rejects.toThrow(/append-only/);
    const row = await AuditLog.findOne({ action: 'test.row' });
    row!.note = 'changed';
    await expect(row!.save()).rejects.toThrow(/append-only/);
  });
});

describe('migrations and indexes', () => {
  it('are idempotent and create the unique indexes', async () => {
    expect(await runMigrations()).toEqual([]); // already applied by the harness
    const idx = await Content.collection.indexes();
    expect(idx.some((i) => i.name === 'slug_1' && i.unique)).toBe(true);
    const subIdx = await Submission.collection.indexes();
    expect(subIdx.some((i) => i.name === 'reference_id_1' && i.unique)).toBe(true);
  });
});

describe('published-only helper (T-PUB-03 groundwork)', () => {
  it('returns only published items whose time has come', async () => {
    const author = await Author.create({ name: 'DEV DATA लेखक', slug: 'dev-lekhak', is_public: true, dev_data: true });
    const cat = await Category.create({ name: 'DEV DATA श्रेणी', slug: 'dev-shreni', dev_data: true });
    const base = {
      body: 'पंक्ति एक\nपंक्ति दो', body_format: 'verse' as const, excerpt: 'अंश', content_type: 'kavita' as const,
      category_id: cat._id, credits: [{ author_id: author._id, role: 'author' as const }], dev_data: true,
    };
    const past = new Date(Date.now() - 60_000);
    const future = new Date(Date.now() + 3_600_000);
    await Content.create([
      { ...base, title: 'दिखे', slug: 'dikhe', status: 'published' as const, published_at: past },
      { ...base, title: 'भविष्य', slug: 'bhavishya', status: 'published' as const, published_at: future },
      { ...base, title: 'मसौदा', slug: 'masauda', status: 'draft' as const },
      { ...base, title: 'अनप्रकाशित', slug: 'anprakashit', status: 'unpublished' as const, published_at: past },
      { ...base, title: 'पुरालेख', slug: 'puralekh', status: 'archived' as const, published_at: past },
      { ...base, title: 'अनुमोदित', slug: 'anumodit', status: 'approved' as const },
    ]);
    const visible = await Content.find(publishedFilter()).lean();
    expect(visible.map((c) => c.slug)).toEqual(['dikhe']);
  });
});

describe('T-SUB-07 retention job (D-02)', () => {
  const sub = (status: string, daysOld: number, ref: string) => ({
    reference_id: ref, display_name: 'DEV', email: 'dev@example.org', title: 't', creation_type: 'kavita', body: 'b',
    consent_original: true, consent_publication: true, consent_privacy: true, consent_text_version: 'dev-0',
    consent_at: new Date(), ip_hash: 'h', ua_hash: 'h', dedupe_hash: ref, status,
    created_at: new Date(Date.now() - daysOld * 86_400_000),
  });

  it('does nothing while RETENTION_DAYS_* are unset', async () => {
    await Submission.collection.insertOne(sub('rejected', 4000, 'UJ-AAAAAAA2') as never);
    const res = await runRetention(testEnv());
    expect(res).toEqual({ enabled: false, submissions_removed: 0, contact_removed: 0 });
    expect(await Submission.countDocuments({ reference_id: 'UJ-AAAAAAA2' })).toBe(1);
  });

  it('when set, removes only old finished submissions and their events, never open ones', async () => {
    const old = await Submission.collection.insertOne(sub('withdrawn', 400, 'UJ-BBBBBBB2') as never);
    await Submission.collection.insertOne(sub('pending_review', 400, 'UJ-CCCCCCC2') as never);
    await Submission.collection.insertOne(sub('rejected', 5, 'UJ-DDDDDDD2') as never);
    await SubmissionEvent.create({ submission_id: old.insertedId, actor: 'system', to_status: 'withdrawn' });
    await ContactMessage.collection.insertOne({ name: 'n', email: 'a@b.org', subject: 's', message: 'm', ip_hash: 'h', status: 'handled', created_at: new Date(Date.now() - 400 * 86_400_000) } as never);
    const res = await runRetention(testEnv({ RETENTION_DAYS_SUBMISSIONS: '365', RETENTION_DAYS_CONTACT: '365' }));
    expect(res.enabled).toBe(true);
    expect(await Submission.countDocuments({ reference_id: 'UJ-BBBBBBB2' })).toBe(0);
    expect(await SubmissionEvent.countDocuments({ submission_id: old.insertedId })).toBe(0);
    expect(await Submission.countDocuments({ reference_id: 'UJ-CCCCCCC2' })).toBe(1); // open: kept
    expect(await Submission.countDocuments({ reference_id: 'UJ-DDDDDDD2' })).toBe(1); // recent: kept
    expect(res.contact_removed).toBe(1);
  });

  it('the connection is a replica set so transactions are possible', async () => {
    const session = await mongoose.startSession();
    await session.withTransaction(async () => {
      await Category.create([{ name: 'tx', slug: 'tx-cat', dev_data: true }], { session });
    });
    await session.endSession();
    expect(await Category.countDocuments({ slug: 'tx-cat' })).toBe(1);
  });
});
