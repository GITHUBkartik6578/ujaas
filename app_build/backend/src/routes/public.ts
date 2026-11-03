import { Router, type Request, type RequestHandler } from 'express';
import mongoose, { type Types } from 'mongoose';
import { z, type ZodType } from 'zod';
import type { Env } from '../config/env.js';
import { notFound, validationFailed, zodToFields } from '../lib/errors.js';
import { searchFolded } from '../lib/hindi.js';
import { openingLines } from '../lib/content.js';
import { escapeRegex, inList, publishedFilter, regex } from '../lib/queries.js';
import { authorCard, contentCard, contentFull, loadContext } from '../lib/serializers.js';
import { SETTING_KEYS } from '../lib/settings.js';
import { mediaKey, previewKey, signMediaToken, verifyPreview } from '../lib/preview.js';
import { limits } from '../middleware/security.js';
import { currentIssueBlock, issueSitemapPaths } from './issues.js';
import {
  Author, Category, Collection, CollectionItem, Content, CONTENT_TYPES, SiteSetting, SlugRedirect,
} from '../models/index.js';

/**
 * Public, unauthenticated reads (docs/api-contract.md §2).
 * Rules: every content read goes through publishedFilter(); every response is built by an allow-list
 * serializer; unknown and unpublished are indistinguishable (404).
 */

const h = (fn: (req: Request) => Promise<unknown>): RequestHandler => async (req, res, next) => {
  try {
    res.setHeader('Cache-Control', 'no-cache'); // unpublish must take effect at once
    res.json(await fn(req));
  } catch (err) {
    next(err);
  }
};

function parse<T>(schema: ZodType<T>, input: unknown): T {
  const r = schema.safeParse(input);
  if (!r.success) throw validationFailed(zodToFields(r.error));
  return r.data;
}

const pageQ = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  page_size: z.coerce.number().int().min(1).max(50).default(20),
});
const slugP = z.string().min(1).max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const paged = <T>(items: T[], total: number, page: number, page_size: number) => ({ items, page, page_size, total });



export function createPublicRouter(env: Env): Router {
  const r = Router();
  const mediaBase = env.MEDIA_BASE_URL;
  const mediaSecret = mediaKey(env);

  type Lean = Parameters<typeof contentCard>[0] & {
    _id: Types.ObjectId; body: string; body_format: 'verse' | 'prose';
  };

  async function cardsFor(docs: Lean[]) {
    const ctx = await loadContext(docs, mediaBase);
    return docs.map((d) => contentCard(d, ctx));
  }

  async function listContents(filter: Record<string, unknown>, page: number, size: number) {
    const f = { ...publishedFilter(), ...filter };
    const [docs, total] = await Promise.all([
      Content.find(f).sort({ published_at: -1, _id: -1 }).skip((page - 1) * size).limit(size).lean(),
      Content.countDocuments(f),
    ]);
    return paged(await cardsFor(docs as unknown as Lean[]), total, page, size);
  }

  /** works per public author, counted from published content only. */
  async function workCounts(type?: string): Promise<Map<string, number>> {
    const match: Record<string, unknown> = { ...publishedFilter() };
    if (type) match.content_type = type;
    const rows = await Content.aggregate<{ _id: Types.ObjectId; n: number }>([
      { $match: match },
      { $unwind: '$credits' },
      { $group: { _id: '$credits.author_id', n: { $sum: 1 } } },
    ]);
    return new Map(rows.map((x) => [String(x._id), x.n]));
  }

  // ---------- contents ----------
  r.get('/contents', h(async (req) => {
    const q = parse(
      pageQ.extend({
        type: z.enum(CONTENT_TYPES).optional(),
        category: slugP.optional(),
        author: slugP.optional(),
        sort: z.literal('newest').default('newest'),
      }),
      req.query,
    );
    const filter: Record<string, unknown> = {};
    if (q.type) filter.content_type = q.type;
    if (q.category) {
      const cat = await Category.findOne({ slug: q.category, is_active: true }).select('_id').lean();
      if (!cat) return paged([], 0, q.page, q.page_size);
      filter.category_id = cat._id;
    }
    if (q.author) {
      const a = await Author.findOne({ slug: q.author, is_public: true, archived: false }).select('_id').lean();
      if (!a) return paged([], 0, q.page, q.page_size);
      filter['credits.author_id'] = a._id;
    }
    return listContents(filter, q.page, q.page_size);
  }));

  r.get('/contents/:slug', h(async (req) => {
    const slug = parse(slugP, req.params.slug);
    const doc = await Content.findOne({ slug, ...publishedFilter() }).lean();
    if (!doc) throw notFound();
    const ctx = await loadContext([doc as unknown as Lean], mediaBase);
    return contentFull(doc as unknown as Parameters<typeof contentFull>[0], ctx);
  }));

  // ---------- categories ----------
  r.get('/categories', h(async () => {
    const [cats, counts] = await Promise.all([
      Category.find({ is_active: true }).sort({ sort_order: 1, name: 1 }).lean(),
      Content.aggregate<{ _id: Types.ObjectId; n: number }>([
        { $match: { ...publishedFilter() } },
        { $group: { _id: '$category_id', n: { $sum: 1 } } },
      ]),
    ]);
    const byId = new Map(counts.map((c) => [String(c._id), c.n]));
    return {
      items: cats.map((c) => ({
        slug: c.slug, name: c.name, description: c.description ?? null, works_count: byId.get(String(c._id)) ?? 0,
      })),
    };
  }));

  r.get('/categories/:slug', h(async (req) => {
    const slug = parse(slugP, req.params.slug);
    const c = await Category.findOne({ slug, is_active: true }).lean();
    if (!c) throw notFound();
    const works_count = await Content.countDocuments({ ...publishedFilter(), category_id: c._id });
    return { slug: c.slug, name: c.name, description: c.description ?? null, works_count };
  }));

  r.get('/categories/:slug/contents', h(async (req) => {
    const slug = parse(slugP, req.params.slug);
    const q = parse(pageQ, req.query);
    const c = await Category.findOne({ slug, is_active: true }).select('_id').lean();
    if (!c) throw notFound();
    return listContents({ category_id: c._id }, q.page, q.page_size);
  }));

  // ---------- authors ----------
  r.get('/authors', h(async (req) => {
    const q = parse(
      pageQ.extend({ startswith: z.string().min(1).max(12).optional(), type: z.enum(CONTENT_TYPES).optional() }),
      req.query,
    );
    const counts = await workCounts(q.type);
    const filter: Record<string, unknown> = { is_public: true, archived: false };
    if (q.startswith) filter.name = regex(`^${escapeRegex(q.startswith.normalize('NFC'))}`);
    if (q.type) filter._id = inList([...counts.keys()]);
    const [docs, total] = await Promise.all([
      Author.find(filter).sort({ name: 1 }).skip((q.page - 1) * q.page_size).limit(q.page_size).lean(),
      Author.countDocuments(filter),
    ]);
    const ctx = await loadContext([], mediaBase, {
      mediaIds: docs.map((a) => a.photo_media_id).filter(Boolean) as Types.ObjectId[],
    });
    return paged(docs.map((a) => authorCard(a, ctx, counts.get(String(a._id)) ?? 0)), total, q.page, q.page_size);
  }));

  async function publicAuthor(slug: string) {
    const a = await Author.findOne({ slug, is_public: true, archived: false }).lean();
    if (!a) throw notFound(); // a non-public author is indistinguishable from a missing one
    return a;
  }

  r.get('/authors/:slug', h(async (req) => {
    const a = await publicAuthor(parse(slugP, req.params.slug));
    const n = await Content.countDocuments({ ...publishedFilter(), 'credits.author_id': a._id });
    const ctx = await loadContext([], mediaBase, { mediaIds: a.photo_media_id ? [a.photo_media_id] : [] });
    return authorCard(a, ctx, n);
  }));

  r.get('/authors/:slug/contents', h(async (req) => {
    const a = await publicAuthor(parse(slugP, req.params.slug));
    const q = parse(pageQ, req.query);
    return listContents({ 'credits.author_id': a._id }, q.page, q.page_size);
  }));

  // ---------- collections ----------
  const collectionFilter = () => ({ status: 'published' as const, published_at: publishedFilter().published_at });

  async function memberCards(collectionId: Types.ObjectId) {
    const items = await CollectionItem.find({ collection_id: collectionId }).sort({ position: 1 }).lean();
    const docs = await Content.find({ _id: inList(items.map((i) => i.content_id)), ...publishedFilter() }).lean();
    const byId = new Map(docs.map((d) => [String(d._id), d]));
    const ordered = items.map((i) => byId.get(String(i.content_id))).filter(Boolean) as unknown as Lean[];
    return cardsFor(ordered);
  }

  r.get('/collections', h(async (req) => {
    const q = parse(pageQ, req.query);
    const f = collectionFilter();
    const [docs, total] = await Promise.all([
      Collection.find(f).sort({ published_at: -1 }).skip((q.page - 1) * q.page_size).limit(q.page_size).lean(),
      Collection.countDocuments(f),
    ]);
    // One count query for the whole page instead of loading every member's full card per collection.
    const memberRows = await CollectionItem.find({ collection_id: inList(docs.map((c) => c._id)) }).select('collection_id content_id').lean();
    const live = new Set(
      (await Content.find({ _id: inList(memberRows.map((m) => m.content_id)), ...publishedFilter() }).select('_id').lean()).map((d) => String(d._id)),
    );
    const counts = new Map<string, number>();
    for (const m of memberRows) {
      if (live.has(String(m.content_id))) counts.set(String(m.collection_id), (counts.get(String(m.collection_id)) ?? 0) + 1);
    }
    const items = docs.map((c) => ({
      slug: c.slug, title: c.title, description: c.description ?? null, works_count: counts.get(String(c._id)) ?? 0,
    }));
    return paged(items, total, q.page, q.page_size);
  }));

  r.get('/collections/:slug', h(async (req) => {
    const slug = parse(slugP, req.params.slug);
    const c = await Collection.findOne({ slug, ...collectionFilter() }).lean();
    if (!c) throw notFound();
    return { slug: c.slug, title: c.title, description: c.description ?? null, items: await memberCards(c._id) };
  }));

  // ---------- search ----------
  r.get('/search', limits.search(env.RATE_LIMIT_SCALE), h(async (req) => {
    const q = parse(
      pageQ.extend({
        q: z.string().trim().min(1).max(100),
        type: z.enum(CONTENT_TYPES).optional(),
        category: slugP.optional(),
      }),
      req.query,
    );
    const terms = searchFolded(q.q).split(' ').filter(Boolean).slice(0, 8);
    if (terms.length === 0) return { ...paged([], 0, q.page, q.page_size), q: q.q };
    const filter: Record<string, unknown> = {
      ...publishedFilter(),
      $and: terms.map((t) => ({ search_text_folded: regex(escapeRegex(t)) })),
    };
    if (q.type) filter.content_type = q.type;
    if (q.category) {
      const cat = await Category.findOne({ slug: q.category, is_active: true }).select('_id').lean();
      if (!cat) return { ...paged([], 0, q.page, q.page_size), q: q.q };
      filter.category_id = cat._id;
    }
    // $and holds trusted regexes; the array wrapper itself must be trusted too.
    filter.$and = mongoose.trusted(filter.$and);
    const docs = (await Content.find(filter).sort({ published_at: -1, _id: -1 }).limit(500).lean()) as unknown as Array<Lean & { search_text_folded: string }>;
    // Titles that contain every term rank first, then newest.
    const score = (d: Lean) => (terms.every((t) => searchFolded(d.title).includes(t)) ? 2 : 1);
    const ranked = [...docs].sort((a, b) => score(b) - score(a));
    const total = ranked.length;
    const slice = ranked.slice((q.page - 1) * q.page_size, q.page * q.page_size);
    return { ...paged(await cardsFor(slice), total, q.page, q.page_size), q: q.q };
  }));

  // ---------- home and settings ----------
  r.get('/home', h(async () => {
    const [featured, latest, counts] = await Promise.all([
      Content.find({ ...publishedFilter(), featured: true }).sort({ feature_order: 1, published_at: -1 }).limit(6).lean(),
      Content.find({ ...publishedFilter() }).sort({ published_at: -1, _id: -1 }).limit(6).lean(),
      workCounts(),
    ]);
    const ctxDocs = [...featured, ...latest] as unknown as Lean[];
    const topAuthorIds = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([id]) => id);
    const authorDocs = await Author.find({ _id: inList(topAuthorIds), is_public: true, archived: false }).lean();
    const ctx = await loadContext(ctxDocs, mediaBase, {
      mediaIds: authorDocs.map((a) => a.photo_media_id).filter(Boolean) as Types.ObjectId[],
    });
    const withLines = (d: Lean & { excerpt: string }) => ({
      ...contentCard(d, ctx),
      lines: openingLines(d.body, d.body_format, d.excerpt),
    });
    const blocks: Record<string, unknown> = {};
    const issue = await currentIssueBlock(env);
    if (issue) blocks.issue = issue; // the newest published issue; omitted until one exists
    if (featured.length > 0) blocks.picks = (featured as unknown as Array<Lean & { excerpt: string }>).map(withLines);
    if (latest.length > 0) blocks.latest = (latest as unknown as Array<Lean & { excerpt: string }>).map(withLines);
    if (authorDocs.length > 0) {
      blocks.authors = authorDocs
        .sort((a, b) => (counts.get(String(b._id)) ?? 0) - (counts.get(String(a._id)) ?? 0))
        .slice(0, 8)
        .map((a) => authorCard(a, ctx, counts.get(String(a._id)) ?? 0));
    }
    return { blocks }; // empty blocks are omitted; the page hides what is missing
  }));

  r.get('/settings/public', h(async () => {
    const rows = (await SiteSetting.find({ key: inList([...SETTING_KEYS]) }).lean()) as unknown as Array<{ key: string; value?: string | null }>;
    const out: Record<string, string> = {};
    for (const row of rows) if (row.value && row.value.trim()) out[row.key] = row.value;
    return out; // empty values are never returned (nothing renders when empty)
  }));

  // Signed, time-limited preview of any status. Same allow-list serializer, never indexed, never cached.
  r.get('/preview/:token', async (req, res, next) => {
    try {
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      const id = verifyPreview(String(req.params.token), previewKey(env));
      if (!id || !/^[a-f0-9]{24}$/i.test(id)) throw notFound();
      const doc = await Content.findById(id).lean();
      if (!doc) throw notFound();
      const ctx = await loadContext([doc as unknown as Lean], mediaBase, {
        allowPrivateMedia: true,
        signMedia: (key) => signMediaToken(key, mediaSecret),
      });
      res.json({ ...contentFull(doc as unknown as Parameters<typeof contentFull>[0], ctx), preview: true, status: (doc as unknown as { status: string }).status });
    } catch (err) {
      next(err);
    }
  });

  r.get('/redirects/content/:slug', h(async (req) => {
    const old = parse(slugP, req.params.slug);
    const red = await SlugRedirect.findOne({ old_slug: old, entity: 'content' }).lean();
    if (!red) throw notFound();
    const target = await Content.findOne({ _id: red.target_id, ...publishedFilter() }).select('slug').lean();
    if (!target) throw notFound();
    return { slug: target.slug };
  }));

  r.get('/sitemap-data', h(async () => {
    const [contents, authors, cats, cols] = await Promise.all([
      Content.find({ ...publishedFilter() }).select('slug published_at updated_at').lean(),
      Author.find({ is_public: true, archived: false }).select('slug updated_at').lean(),
      Category.find({ is_active: true }).select('slug updated_at').lean(),
      Collection.find(collectionFilter()).select('slug updated_at').lean(),
    ]);
    const u = (p: string, d?: Date | null) => ({ path: p, lastmod: d ? new Date(d).toISOString() : null });
    const issues = await issueSitemapPaths();
    return {
      urls: [
        ...issues,
        ...contents.map((c) => u(`/rachna/${c.slug}`, c.updated_at)),
        ...authors.map((a) => u(`/rachnakar/${a.slug}`, a.updated_at)),
        ...cats.map((c) => u(`/sahitya/${c.slug}`, c.updated_at)),
        ...cols.map((c) => u(`/sangrah/${c.slug}`, c.updated_at)),
      ],
    };
  }));

  return r;
}
