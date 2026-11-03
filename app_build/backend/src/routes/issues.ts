import { Router } from 'express';
import mongoose, { type Types } from 'mongoose';
import { z } from 'zod';
import type { Env } from '../config/env.js';
import { actorOf, ah, OBJECT_ID, parseWith } from '../lib/admin.js';
import { AppError, forbidden, notFound, validationFailed } from '../lib/errors.js';
import { inList, lte, publishedFilter } from '../lib/queries.js';
import { stripHtml } from '../lib/sanitize.js';
import { contentCard, coverOf, loadContext } from '../lib/serializers.js';
import { SLUG_PATTERN, uniqueSlug } from '../lib/slug.js';
import { isChiefUp } from '../lib/workflow.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { requireCsrf } from '../middleware/security.js';
import { Content, IssueItem, MagazineIssue, MediaAsset } from '../models/index.js';
import { writeAudit } from '../services/audit.js';
import { withTx } from '../services/content.js';

/**
 * The e-magazine: issues and their ordered contents (magazine_issues skill).
 * A creation lives once in `contents`; an issue only points at it, so it can sit in many issues and in the
 * general listing without being copied. Reading stays on the article's own address (/rachna/[slug]).
 */

interface IssueRec {
  _id: Types.ObjectId; title: string; slug: string; issue_number: number; volume?: string; period_label: string; publication_date: Date;
  cover_media_id?: Types.ObjectId | null; editorial_intro?: string; publication_details?: string;
  status: 'draft' | 'published' | 'archived'; show_in_archive: boolean; published_at?: Date; updated_at?: Date;
}

export const publishedIssueFilter = (now: Date = new Date()) => ({ status: 'published' as const, published_at: lte(now) });

const plain = (max: number) => z.string().max(max).transform((s) => stripHtml(s).trim().normalize('NFC'));
const oidStr = z.string().regex(OBJECT_ID, 'invalid id');
const slugP = z.string().min(1).max(160).regex(SLUG_PATTERN);
const pageQ = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  page_size: z.coerce.number().int().min(1).max(50).default(12),
});

/** Public card of an issue. The cover shows only when its file is public and has alt text. */
async function issueCards(issues: IssueRec[], mediaBase: string) {
  const ctx = await loadContext([], mediaBase, { mediaIds: issues.map((i) => i.cover_media_id).filter(Boolean) as Types.ObjectId[] });
  return issues.map((i) => ({
    slug: i.slug, title: i.title, issue_number: i.issue_number, volume: i.volume ?? null, period_label: i.period_label,
    publication_date: i.publication_date, cover: coverOf(ctx, i.cover_media_id),
  }));
}

/** The home page's issue block: the newest published issue, or nothing. */
export async function currentIssueBlock(env: Env) {
  const issue = (await MagazineIssue.findOne(publishedIssueFilter()).sort({ publication_date: -1 }).lean()) as unknown as IssueRec | null;
  if (!issue) return null;
  const [card] = await issueCards([issue], env.MEDIA_BASE_URL);
  return { ...card!, editorial_intro: issue.editorial_intro ?? null };
}

export async function issueSitemapPaths() {
  const rows = (await MagazineIssue.find(publishedIssueFilter()).select('slug updated_at').lean()) as unknown as IssueRec[];
  return rows.map((i) => ({ path: `/e-patrika/${i.slug}`, lastmod: i.updated_at ? new Date(i.updated_at).toISOString() : null }));
}

async function publishedMembers(issueId: Types.ObjectId | string) {
  const items = (await IssueItem.find({ issue_id: issueId }).sort({ position: 1 }).lean()) as unknown as Array<{ content_id: Types.ObjectId; position: number; section_label?: string }>;
  const docs = await Content.find({ _id: inList(items.map((i) => i.content_id)), ...publishedFilter() }).lean();
  const byId = new Map(docs.map((d) => [String(d._id), d]));
  return items.flatMap((i) => {
    const d = byId.get(String(i.content_id));
    return d ? [{ item: i, doc: d }] : []; // an item that is no longer published is simply absent
  });
}

export function createPublicIssuesRouter(env: Env): Router {
  const r = Router();
  const h = (fn: (req: import('express').Request) => Promise<unknown>): import('express').RequestHandler => async (req, res, next) => {
    try {
      res.setHeader('Cache-Control', 'no-cache');
      res.json(await fn(req));
    } catch (err) {
      next(err);
    }
  };

  // Landing and archive: the newest issue, then newest first, with a year filter.
  r.get('/issues', h(async (req) => {
    const q = parseWith(pageQ.extend({ year: z.coerce.number().int().min(1900).max(2200).optional() }), req.query);
    const base = publishedIssueFilter();
    const filter: Record<string, unknown> = { ...base, show_in_archive: true };
    if (q.year) filter.publication_date = mongoose.trusted({ $gte: new Date(Date.UTC(q.year, 0, 1)), $lt: new Date(Date.UTC(q.year + 1, 0, 1)) }) as never;
    const [rows, total, years, current] = await Promise.all([
      MagazineIssue.find(filter).sort({ publication_date: -1, issue_number: -1 }).skip((q.page - 1) * q.page_size).limit(q.page_size).lean(),
      MagazineIssue.countDocuments(filter),
      MagazineIssue.aggregate<{ _id: number }>([
        { $match: { ...base, show_in_archive: true } }, { $group: { _id: { $year: '$publication_date' } } }, { $sort: { _id: -1 } },
      ]),
      currentIssueBlock(env),
    ]);
    return {
      items: await issueCards(rows as unknown as IssueRec[], env.MEDIA_BASE_URL),
      page: q.page, page_size: q.page_size, total, years: years.map((y) => y._id), current,
    };
  }));

  r.get('/issues/:slug', h(async (req) => {
    const slug = parseWith(slugP, req.params.slug);
    const issue = (await MagazineIssue.findOne({ slug, ...publishedIssueFilter() }).lean()) as unknown as IssueRec | null;
    if (!issue) throw notFound(); // a draft or archived issue is indistinguishable from a missing one
    const members = await publishedMembers(issue._id);
    const ctx = await loadContext(members.map((m) => m.doc) as never, env.MEDIA_BASE_URL, { mediaIds: issue.cover_media_id ? [issue.cover_media_id] : [] });
    return {
      slug: issue.slug, title: issue.title, issue_number: issue.issue_number, volume: issue.volume ?? null, period_label: issue.period_label,
      publication_date: issue.publication_date, cover: coverOf(ctx, issue.cover_media_id),
      editorial_intro: issue.editorial_intro ?? null, publication_details: issue.publication_details ?? null,
      items: members.map((m) => ({ position: m.item.position, section_label: m.item.section_label ?? null, content: contentCard(m.doc as never, ctx) })),
    };
  }));

  // Previous and next article inside an issue; the article keeps its own address.
  r.get('/issues/:slug/neighbors/:content', h(async (req) => {
    const slug = parseWith(slugP, req.params.slug);
    const contentSlug = parseWith(slugP, req.params.content);
    const issue = (await MagazineIssue.findOne({ slug, ...publishedIssueFilter() }).lean()) as unknown as IssueRec | null;
    if (!issue) throw notFound();
    const members = await publishedMembers(issue._id);
    const i = members.findIndex((m) => (m.doc as unknown as { slug: string }).slug === contentSlug);
    if (i < 0) throw notFound();
    const ctx = await loadContext(members.map((m) => m.doc) as never, env.MEDIA_BASE_URL);
    const card = (j: number) => (members[j] ? contentCard(members[j]!.doc as never, ctx) : null);
    return { issue: { slug: issue.slug, title: issue.title }, prev: card(i - 1), next: card(i + 1) };
  }));
  return r;
}

/** Issue manager (editors and above). Publishing an issue is for the chief and above, like publishing a creation. */
export function createAdminIssuesRouter(env: Env): Router {
  const r = Router();
  // Scoped to /issues so this guard never applies to another /admin router.
  r.use('/issues', requireAuth, requireRole(env, 'site_admin', 'editor_in_chief', 'editor'), requireCsrf);
  const idOf = (req: { params: Record<string, string | string[] | undefined> }) => {
    const id = String(req.params.id);
    if (!OBJECT_ID.test(id)) throw notFound();
    return id;
  };
  const audit = (req: Parameters<typeof actorOf>[0], action: string, id: string, extra: { from?: string; to?: string; note?: string } = {}) =>
    writeAudit({ actor_id: req.admin!.id, action, entity: 'issue', entity_id: id, request_id: (req as { id?: string }).id, ...extra });

  const fields = z.object({
    title: plain(160).pipe(z.string().min(1)),
    slug: slugP,
    issue_number: z.number().int().min(1).max(100000),
    volume: plain(40).nullable(),
    period_label: plain(80).pipe(z.string().min(1)),
    publication_date: z.coerce.date(),
    cover_media_id: oidStr.nullable(),
    editorial_intro: plain(5000).nullable(),
    publication_details: plain(1000).nullable(),
    show_in_archive: z.boolean(),
  });
  const createShape = fields.partial().required({ title: true, issue_number: true, period_label: true, publication_date: true });

  async function shape(i: IssueRec) {
    const members = (await IssueItem.find({ issue_id: i._id }).sort({ position: 1 }).lean()) as unknown as Array<{ content_id: Types.ObjectId; position: number; section_label?: string }>;
    const docs = (await Content.find({ _id: inList(members.map((m) => m.content_id)) }).select('title status slug').lean()) as unknown as Array<{ _id: Types.ObjectId; title: string; status: string; slug: string }>;
    const byId = new Map(docs.map((d) => [String(d._id), d]));
    const cover = i.cover_media_id ? ((await MediaAsset.findById(i.cover_media_id).select('storage_key alt_text').lean()) as unknown as { storage_key: string; alt_text: string } | null) : null;
    return {
      id: String(i._id), title: i.title, slug: i.slug, issue_number: i.issue_number, volume: i.volume ?? null, period_label: i.period_label,
      publication_date: i.publication_date, cover_media_id: i.cover_media_id ? String(i.cover_media_id) : null,
      cover: cover ? { url: `${env.MEDIA_BASE_URL}/${cover.storage_key}`, alt: cover.alt_text } : null,
      editorial_intro: i.editorial_intro ?? null, publication_details: i.publication_details ?? null, status: i.status,
      show_in_archive: i.show_in_archive, published_at: i.published_at ?? null,
      items: members.map((m) => {
        const d = byId.get(String(m.content_id));
        return { content_id: String(m.content_id), position: m.position, section_label: m.section_label ?? null, title: d?.title ?? null, status: d?.status ?? null, warning: d?.status !== 'published' ? 'not_published' : null };
      }),
    };
  }
  const takenNumber = async (n: number, except?: string) => Boolean(await MagazineIssue.exists({ issue_number: n, ...(except ? { _id: mongoose.trusted({ $ne: except }) as never } : {}) }));
  const numberTaken = () => validationFailed([{ field: 'issue_number', code: 'number_taken', message_hi: 'यह अंक संख्या पहले से उपयोग में है' }]);
  const slugTaken = () => validationFailed([{ field: 'slug', code: 'slug_taken', message_hi: 'यह पता पहले से उपयोग में है' }]);

  async function checkCover(id: string | null | undefined) {
    if (id && !(await MediaAsset.exists({ _id: id }))) throw validationFailed([{ field: 'cover_media_id', code: 'unknown_media', message_hi: 'चित्र नहीं मिला' }]);
  }

  r.get('/issues', ah(async () => {
    const rows = (await MagazineIssue.find({}).sort({ publication_date: -1, issue_number: -1 }).lean()) as unknown as IssueRec[];
    const counts = await IssueItem.aggregate<{ _id: Types.ObjectId; n: number }>([{ $group: { _id: '$issue_id', n: { $sum: 1 } } }]);
    const n = new Map(counts.map((c) => [String(c._id), c.n]));
    return {
      items: rows.map((i) => ({
        id: String(i._id), title: i.title, slug: i.slug, issue_number: i.issue_number, period_label: i.period_label, status: i.status,
        publication_date: i.publication_date, items_count: n.get(String(i._id)) ?? 0,
      })),
    };
  }));

  r.post('/issues', ah(async (req) => {
    const b = parseWith(createShape, req.body);
    if (await takenNumber(b.issue_number)) throw numberTaken();
    await checkCover(b.cover_media_id);
    const slug = b.slug ?? (await uniqueSlug(async (s) => Boolean(await MagazineIssue.exists({ slug: s })), '', `ank-${b.issue_number}`));
    if (b.slug && (await MagazineIssue.exists({ slug }))) throw slugTaken();
    const i = await MagazineIssue.create({ ...b, slug, status: 'draft', show_in_archive: b.show_in_archive ?? true } as never);
    await audit(req, 'issue.create', String(i._id), { to: 'draft' });
    return shape(i.toObject() as unknown as IssueRec);
  }, 201));

  r.get('/issues/:id', ah(async (req) => {
    const i = await MagazineIssue.findById(idOf(req)).lean();
    if (!i) throw notFound();
    return shape(i as unknown as IssueRec);
  }));

  r.patch('/issues/:id', ah(async (req) => {
    const id = idOf(req);
    const b = parseWith(fields.partial(), req.body);
    const cur = (await MagazineIssue.findById(id).lean()) as unknown as IssueRec | null;
    if (!cur) throw notFound();
    if (b.issue_number !== undefined && b.issue_number !== cur.issue_number && (await takenNumber(b.issue_number, id))) throw numberTaken();
    if (b.slug && b.slug !== cur.slug && (await MagazineIssue.exists({ slug: b.slug }))) throw slugTaken();
    await checkCover(b.cover_media_id);
    const upd = await MagazineIssue.findByIdAndUpdate(id, { $set: b } as never, { returnDocument: 'after' }).lean();
    // A published issue keeps a public cover only if it still has alt text.
    if (cur.status === 'published' && upd) await publicCover(upd as unknown as IssueRec);
    await audit(req, 'issue.update', id);
    return shape(upd as unknown as IssueRec);
  }));

  async function publicCover(i: IssueRec) {
    if (!i.cover_media_id) return;
    const m = (await MediaAsset.findById(i.cover_media_id).select('alt_text').lean()) as unknown as { alt_text?: string } | null;
    if (m?.alt_text?.trim()) await MediaAsset.updateOne({ _id: i.cover_media_id }, { $set: { is_public: true } });
  }

  // Ordered members: published creations only, replaced in one transaction, so a failure keeps the old order.
  r.put('/issues/:id/items', ah(async (req) => {
    const id = idOf(req);
    const b = parseWith(z.object({ items: z.array(z.object({ content_id: oidStr, section_label: plain(80).nullable().optional() })).max(100) }), req.body);
    const ids = b.items.map((x) => x.content_id);
    if (new Set(ids).size !== ids.length) throw validationFailed([{ field: 'items', code: 'duplicate' }]);
    if (!(await MagazineIssue.exists({ _id: id }))) throw notFound();
    const ok = new Set((await Content.find({ _id: inList(ids), ...publishedFilter() }).select('_id').lean()).map((d) => String(d._id)));
    const bad = ids.filter((x) => !ok.has(x));
    if (bad.length > 0) throw validationFailed(bad.map((x) => ({ field: `items.${x}`, code: 'not_published', message_hi: 'केवल प्रकाशित रचनाएँ जोड़ी जा सकती हैं' })));
    await withTx(async (session) => {
      await IssueItem.deleteMany({ issue_id: id }, { session });
      if (b.items.length > 0) {
        await IssueItem.create(b.items.map((x, n) => ({ issue_id: id, content_id: x.content_id, position: n + 1, section_label: x.section_label || undefined })) as never, { session, ordered: true });
      }
    });
    await audit(req, 'issue.reorder', id, { note: `${b.items.length} items` });
    return shape((await MagazineIssue.findById(id).lean()) as unknown as IssueRec);
  }));

  const TRANSITIONS: Record<string, Record<string, 'editor' | 'chief'>> = {
    draft: { published: 'chief' },
    published: { draft: 'chief', archived: 'chief' },
    archived: { draft: 'editor' },
  };
  r.post('/issues/:id/transition', ah(async (req) => {
    const id = idOf(req);
    const { to } = parseWith(z.object({ to: z.enum(['draft', 'published', 'archived']) }), req.body);
    const cur = (await MagazineIssue.findById(id).lean()) as unknown as IssueRec | null;
    if (!cur) throw notFound();
    const need = TRANSITIONS[cur.status]?.[to];
    if (!need) throw new AppError(422, 'state_transition_invalid', `Cannot move from ${cur.status} to ${to}`, 'यह स्थिति-परिवर्तन मान्य नहीं है');
    if (need === 'chief' && !isChiefUp(req.admin!.role)) throw forbidden();
    const set: Record<string, unknown> = { status: to };
    if (to === 'published') {
      const blockers: string[] = [];
      const cover = cur.cover_media_id ? ((await MediaAsset.findById(cur.cover_media_id).select('alt_text').lean()) as unknown as { alt_text?: string } | null) : null;
      if (!cur.cover_media_id) blockers.push('cover');
      else if (!cover?.alt_text?.trim()) blockers.push('cover_alt');
      if (!cur.issue_number) blockers.push('issue_number');
      if (!cur.publication_date) blockers.push('publication_date');
      const members = await IssueItem.find({ issue_id: id }).select('content_id').lean();
      const live = await Content.countDocuments({ _id: inList(members.map((m) => m.content_id)), ...publishedFilter() });
      if (live < 1) blockers.push('items');
      if (blockers.length > 0) {
        throw new AppError(422, 'publish_blocked', `Publishing needs: ${blockers.join(', ')}`, 'प्रकाशित करने से पहले ये पूरा करें', blockers.map((b) => ({ field: b, code: 'required' })));
      }
      set.published_at = cur.published_at ?? new Date();
    }
    const upd = await MagazineIssue.findOneAndUpdate({ _id: id, status: cur.status }, { $set: set }, { returnDocument: 'after' }).lean();
    if (!upd) throw new AppError(409, 'conflict', 'Status changed meanwhile', 'स्थिति इसी बीच बदल गई');
    if (to === 'published') await publicCover(upd as unknown as IssueRec);
    await audit(req, 'issue.transition', id, { from: cur.status, to });
    return shape(upd as unknown as IssueRec);
  }));

  return r;
}
