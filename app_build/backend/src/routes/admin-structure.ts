import { Router } from 'express';
import mongoose, { type Model, type Types } from 'mongoose';
import { z } from 'zod';
import type { Env } from '../config/env.js';
import { schedulerState } from '../jobs/scheduler.js';
import { actorOf, ah, OBJECT_ID, parseWith } from '../lib/admin.js';
import { notFound, validationFailed } from '../lib/errors.js';
import { inList, publishedFilter } from '../lib/queries.js';
import { stripHtml } from '../lib/sanitize.js';
import { SETTING_KEYS } from '../lib/settings.js';
import { SLUG_PATTERN, uniqueSlug } from '../lib/slug.js';
import { ROLES } from '../lib/workflow.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { requireCsrf } from '../middleware/security.js';
import {
  AdminUser, AuditLog, Author, Category, Collection, CollectionItem, Content, MediaAsset, SiteSetting, Submission, Topic,
} from '../models/index.js';
import { writeAudit } from '../services/audit.js';
import { withTx } from '../services/content.js';

const plain = (max: number) => z.string().max(max).transform((s) => stripHtml(s).trim());
const oidStr = z.string().regex(OBJECT_ID, 'invalid id');
const pageQ = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(30),
});
const idOf = (req: { params: Record<string, string | string[] | undefined> }) => {
  const id = String(req.params.id);
  if (!OBJECT_ID.test(id)) throw notFound();
  return id;
};
const slugTakenError = () => validationFailed([{ field: 'slug', code: 'slug_taken', message_hi: 'यह पता पहले से उपयोग में है' }]);

type Doc = Record<string, unknown> & { _id: Types.ObjectId };

export function createAdminStructureRouter(env: Env): Router {
  const r = Router();
  r.use(requireAuth, requireRole(env, ...ROLES), requireCsrf);
  const chiefUp = requireRole(env, 'site_admin', 'editor_in_chief');
  const adminOnly = requireRole(env, 'site_admin');
  const audit = (req: Parameters<typeof actorOf>[0], action: string, entity: string, entity_id: string, note?: string) =>
    writeAudit({ actor_id: req.admin!.id, action, entity, entity_id, note, request_id: (req as { id?: string }).id });

  // ---------- authors ----------
  const authorFields = z.object({
    name: plain(120).pipe(z.string().min(1)),
    slug: z.string().max(80).regex(SLUG_PATTERN),
    bio: plain(2000).nullable(),
    is_public: z.boolean(),
    birth_year: z.number().int().min(1000).max(2100).nullable(),
    birthplace: plain(100).nullable(),
    private_contact: plain(300).nullable(),
    photo_media_id: oidStr.nullable(),
    archived: z.boolean(),
  });

  async function checkAuthorPhoto(isPublic: boolean | undefined, photo: string | null | undefined, current?: Doc) {
    const pub = isPublic ?? Boolean(current?.is_public);
    const media = photo === undefined ? (current?.photo_media_id as Types.ObjectId | undefined) : photo;
    if (!pub || !media) return;
    const m = (await MediaAsset.findById(media).select('alt_text').lean()) as unknown as { alt_text?: string } | null;
    if (!m) throw validationFailed([{ field: 'photo_media_id', code: 'unknown_media' }]);
    if (!m.alt_text?.trim()) throw validationFailed([{ field: 'photo_media_id', code: 'alt_required', message_hi: 'सार्वजनिक चित्र के लिए वैकल्पिक पाठ आवश्यक है' }]);
  }
  const authorShape = (a: Doc) => ({
    id: String(a._id), name: a.name, slug: a.slug, bio: a.bio ?? null, is_public: a.is_public, archived: a.archived,
    birth_year: a.birth_year ?? null, birthplace: a.birthplace ?? null, private_contact: a.private_contact ?? null,
    photo_media_id: a.photo_media_id ? String(a.photo_media_id) : null,
  });

  r.get('/authors', ah(async (req) => {
    const q = parseWith(pageQ.extend({ q: z.string().trim().max(80).optional() }), req.query);
    const filter: Record<string, unknown> = {};
    if (q.q) filter.name = mongoose.trusted({ $regex: q.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }) as never;
    const [rows, total] = await Promise.all([
      Author.find(filter).select('+private_contact').sort({ name: 1 }).skip((q.page - 1) * q.page_size).limit(q.page_size).lean(),
      Author.countDocuments(filter),
    ]);
    return { items: (rows as unknown as Doc[]).map(authorShape), page: q.page, page_size: q.page_size, total };
  }));
  r.post('/authors', ah(async (req) => {
    const b = parseWith(authorFields.partial().required({ name: true }), req.body);
    await checkAuthorPhoto(b.is_public, b.photo_media_id);
    const slug = b.slug ?? (await uniqueSlug(async (s) => Boolean(await Author.exists({ slug: s })), '', 'rachnakar'));
    if (b.slug && (await Author.exists({ slug }))) throw slugTakenError();
    const a = await Author.create({ ...b, slug } as never);
    await audit(req, 'author.create', 'author', String(a._id));
    return authorShape((await Author.findById(a._id).select('+private_contact').lean()) as unknown as Doc);
  }, 201));
  r.get('/authors/:id', ah(async (req) => {
    const a = await Author.findById(idOf(req)).select('+private_contact').lean();
    if (!a) throw notFound();
    return authorShape(a as unknown as Doc);
  }));
  r.patch('/authors/:id', ah(async (req) => {
    const id = idOf(req);
    const b = parseWith(authorFields.partial(), req.body);
    const cur = (await Author.findById(id).lean()) as unknown as Doc | null;
    if (!cur) throw notFound();
    await checkAuthorPhoto(b.is_public, b.photo_media_id, cur);
    if (b.slug && b.slug !== cur.slug && (await Author.exists({ slug: b.slug }))) throw slugTakenError();
    const a = await Author.findByIdAndUpdate(id, { $set: b } as never, { returnDocument: 'after' }).select('+private_contact').lean();
    await audit(req, 'author.update', 'author', id);
    return authorShape(a as unknown as Doc);
  }));

  // ---------- categories and topics ----------
  const taxFields = z.object({
    name: plain(80).pipe(z.string().min(1)),
    slug: z.string().max(80).regex(SLUG_PATTERN),
    description: plain(500).nullable(),
    sort_order: z.number().int().min(0).max(9999),
    is_active: z.boolean(),
  });
  const taxShape = (t: Doc) => ({ id: String(t._id), name: t.name, slug: t.slug, description: t.description ?? null, sort_order: t.sort_order, is_active: t.is_active });

  function taxonomy(path: string, model: Model<never>, entity: string, usedIn: (id: string) => Promise<number>) {
    r.get(`/${path}`, ah(async () => ({
      items: ((await model.find({}).sort({ sort_order: 1, name: 1 }).lean()) as unknown as Doc[]).map(taxShape),
    })));
    r.post(`/${path}`, ah(async (req) => {
      const b = parseWith(taxFields.partial().required({ name: true }), req.body);
      const slug = b.slug ?? (await uniqueSlug(async (s) => Boolean(await model.exists({ slug: s } as never)), '', entity));
      if (b.slug && (await model.exists({ slug } as never))) throw slugTakenError();
      const t = await model.create({ ...b, slug } as never);
      await audit(req, `${entity}.create`, entity, String((t as unknown as Doc)._id));
      return taxShape((t as unknown as { toObject(): Doc }).toObject());
    }, 201));
    r.patch(`/${path}/:id`, ah(async (req) => {
      const id = idOf(req);
      const b = parseWith(taxFields.partial(), req.body);
      const cur = (await model.findById(id).lean()) as unknown as Doc | null;
      if (!cur) throw notFound();
      if (b.slug && b.slug !== cur.slug && (await model.exists({ slug: b.slug } as never))) throw slugTakenError();
      const t = await model.findByIdAndUpdate(id, { $set: b } as never, { returnDocument: 'after' }).lean();
      await audit(req, `${entity}.update`, entity, id);
      return taxShape(t as unknown as Doc);
    }));
    // Deleting is allowed only when nothing uses it, and only by site_admin.
    r.delete(`/${path}/:id`, adminOnly, ah(async (req) => {
      const id = idOf(req);
      if (!(await model.exists({ _id: id } as never))) throw notFound();
      if ((await usedIn(id)) > 0) throw validationFailed([{ field: 'id', code: 'in_use', message_hi: 'यह उपयोग में है, इसे हटाया नहीं जा सकता' }]);
      await model.deleteOne({ _id: id } as never);
      await audit(req, `${entity}.delete`, entity, id);
      return undefined;
    }));
  }
  taxonomy('categories', Category as unknown as Model<never>, 'category', (id) => Content.countDocuments({ category_id: id }));
  taxonomy('topics', Topic as unknown as Model<never>, 'topic', (id) => Content.countDocuments({ topic_ids: id }));

  // ---------- collections ----------
  const collectionFields = z.object({
    title: plain(160).pipe(z.string().min(1)),
    slug: z.string().max(80).regex(SLUG_PATTERN),
    description: plain(1000).nullable(),
    status: z.enum(['draft', 'published', 'archived']),
  });
  async function collectionShape(c: Doc) {
    const items = (await CollectionItem.find({ collection_id: c._id }).sort({ position: 1 }).lean()) as unknown as Array<{ content_id: Types.ObjectId; position: number }>;
    const docs = (await Content.find({ _id: inList(items.map((i) => i.content_id)) }).select('title status published_at').lean()) as unknown as Array<{ _id: Types.ObjectId; title: string; status: string; published_at?: Date }>;
    const byId = new Map(docs.map((d) => [String(d._id), d]));
    return {
      id: String(c._id), title: c.title, slug: c.slug, description: c.description ?? null, status: c.status, published_at: c.published_at ?? null,
      items: items.map((i) => {
        const d = byId.get(String(i.content_id));
        return { content_id: String(i.content_id), position: i.position, title: d?.title ?? null, status: d?.status ?? null, warning: d?.status !== 'published' ? 'not_published' : null };
      }),
    };
  }
  r.get('/collections', ah(async () => {
    const rows = (await Collection.find({}).sort({ created_at: -1 }).lean()) as unknown as Doc[];
    return { items: await Promise.all(rows.map(collectionShape)) };
  }));
  r.post('/collections', ah(async (req) => {
    const b = parseWith(collectionFields.partial().required({ title: true }), req.body);
    const slug = b.slug ?? (await uniqueSlug(async (s) => Boolean(await Collection.exists({ slug: s })), '', 'sangrah'));
    if (b.slug && (await Collection.exists({ slug }))) throw slugTakenError();
    const status = b.status ?? 'draft';
    const c = await Collection.create({ ...b, slug, status, published_at: status === 'published' ? new Date() : undefined } as never);
    await audit(req, 'collection.create', 'collection', String(c._id));
    return collectionShape(c.toObject() as unknown as Doc);
  }, 201));
  r.get('/collections/:id', ah(async (req) => {
    const c = await Collection.findById(idOf(req)).lean();
    if (!c) throw notFound();
    return collectionShape(c as unknown as Doc);
  }));
  r.patch('/collections/:id', ah(async (req) => {
    const id = idOf(req);
    const b = parseWith(collectionFields.partial(), req.body);
    const cur = (await Collection.findById(id).lean()) as unknown as Doc | null;
    if (!cur) throw notFound();
    if (b.slug && b.slug !== cur.slug && (await Collection.exists({ slug: b.slug }))) throw slugTakenError();
    const set: Record<string, unknown> = { ...b };
    if (b.status === 'published' && !cur.published_at) set.published_at = new Date();
    const c = await Collection.findByIdAndUpdate(id, { $set: set } as never, { returnDocument: 'after' }).lean();
    await audit(req, 'collection.update', 'collection', id);
    return collectionShape(c as unknown as Doc);
  }));
  // Ordered members, published items only; replaced atomically so a failure never leaves half a list.
  r.put('/collections/:id/items', ah(async (req) => {
    const id = idOf(req);
    const b = parseWith(z.object({ content_ids: z.array(oidStr).max(200) }), req.body);
    if (new Set(b.content_ids).size !== b.content_ids.length) throw validationFailed([{ field: 'content_ids', code: 'duplicate' }]);
    if (!(await Collection.exists({ _id: id }))) throw notFound();
    const pub = (await Content.find({ _id: inList(b.content_ids), ...publishedFilter() }).select('_id').lean()) as unknown as Array<{ _id: Types.ObjectId }>;
    const ok = new Set(pub.map((p) => String(p._id)));
    const bad = b.content_ids.filter((x) => !ok.has(x));
    if (bad.length > 0) {
      throw validationFailed(bad.map((x) => ({ field: `content_ids.${x}`, code: 'not_published', message_hi: 'केवल प्रकाशित रचनाएँ जोड़ी जा सकती हैं' })));
    }
    await withTx(async (session) => {
      await CollectionItem.deleteMany({ collection_id: id }, { session });
      if (b.content_ids.length > 0) {
        await CollectionItem.create(b.content_ids.map((cid, i) => ({ collection_id: id, content_id: cid, position: i + 1 })) as never, { session, ordered: true });
      }
    });
    await audit(req, 'collection.reorder', 'collection', id, `${b.content_ids.length} items`);
    return collectionShape((await Collection.findById(id).lean()) as unknown as Doc);
  }));

  // ---------- homepage ----------
  r.get('/homepage', chiefUp, ah(async () => {
    const [featured, candidates] = await Promise.all([
      Content.find({ ...publishedFilter(), featured: true }).sort({ feature_order: 1 }).select('title slug feature_order').lean(),
      Content.find({ ...publishedFilter() }).sort({ published_at: -1 }).limit(100).select('title slug').lean(),
    ]);
    const shape = (c: unknown) => { const x = c as { _id: Types.ObjectId; title: string; slug: string; feature_order?: number }; return { id: String(x._id), title: x.title, slug: x.slug, feature_order: x.feature_order ?? null }; };
    return { featured: featured.map(shape), candidates: candidates.map(shape) };
  }));
  r.put('/homepage', chiefUp, ah(async (req) => {
    const b = parseWith(z.object({ featured_ids: z.array(oidStr).max(6) }), req.body);
    if (new Set(b.featured_ids).size !== b.featured_ids.length) throw validationFailed([{ field: 'featured_ids', code: 'duplicate' }]);
    const pub = (await Content.find({ _id: inList(b.featured_ids), ...publishedFilter() }).select('_id').lean()) as unknown as Array<{ _id: Types.ObjectId }>;
    if (pub.length !== b.featured_ids.length) {
      throw validationFailed([{ field: 'featured_ids', code: 'not_published', message_hi: 'केवल प्रकाशित रचनाएँ चुनी जा सकती हैं' }]);
    }
    await withTx(async (session) => {
      await Content.updateMany({ featured: true }, { $set: { featured: false }, $unset: { feature_order: '' } }, { session });
      for (const [i, cid] of b.featured_ids.entries()) {
        await Content.updateOne({ _id: cid }, { $set: { featured: true, feature_order: i + 1 } }, { session });
      }
    });
    await audit(req, 'homepage.update', 'homepage', 'picks', `${b.featured_ids.length} items`);
    return { featured_ids: b.featured_ids };
  }));

  // ---------- site settings ----------
  r.get('/settings', adminOnly, ah(async () => {
    const rows = (await SiteSetting.find({}).lean()) as unknown as Array<{ key: string; value?: string }>;
    const byKey = new Map(rows.map((x) => [x.key, x.value ?? '']));
    return Object.fromEntries(SETTING_KEYS.map((k) => [k, byKey.get(k) ?? '']));
  }));
  r.put('/settings', adminOnly, ah(async (req) => {
    const shape = Object.fromEntries(SETTING_KEYS.map((k) => [k, plain(500).optional()]));
    const b = parseWith(z.object({ values: z.object(shape).strict() }), req.body).values as Record<string, string | undefined>;
    for (const [key, value] of Object.entries(b)) {
      if (value !== undefined) await SiteSetting.updateOne({ key }, { $set: { key, value } }, { upsert: true });
    }
    await audit(req, 'settings.update', 'settings', 'site', Object.keys(b).join(','));
    return b;
  }));

  // ---------- audit (read only) ----------
  r.get('/audit', chiefUp, ah(async (req) => {
    const q = parseWith(
      pageQ.extend({ entity: z.string().max(40).optional(), actor: z.string().max(40).optional(), from: z.coerce.date().optional(), to: z.coerce.date().optional() }),
      req.query,
    );
    const filter: Record<string, unknown> = {};
    if (q.entity) filter.entity = q.entity;
    if (q.actor) filter.actor = q.actor;
    if (q.from || q.to) filter.created_at = mongoose.trusted({ ...(q.from ? { $gte: q.from } : {}), ...(q.to ? { $lte: q.to } : {}) }) as never;
    const [rows, total] = await Promise.all([
      AuditLog.find(filter).sort({ created_at: -1 }).skip((q.page - 1) * q.page_size).limit(q.page_size).lean(),
      AuditLog.countDocuments(filter),
    ]);
    return {
      items: (rows as unknown as Array<Record<string, unknown> & { _id: Types.ObjectId }>).map((a) => ({
        id: String(a._id), created_at: a.created_at, actor: a.actor, action: a.action, entity: a.entity, entity_id: a.entity_id ?? null,
        from: a.from ?? null, to: a.to ?? null, note: a.note ?? null,
      })),
      page: q.page, page_size: q.page_size, total,
    };
  }));

  // ---------- dashboard and ops ----------
  r.get('/dashboard', ah(async () => {
    const [byStatus, upcoming, failures, pendingSubs, recent] = await Promise.all([
      Content.aggregate<{ _id: string; n: number }>([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
      Content.find({ status: 'scheduled' }).sort({ scheduled_at: 1 }).limit(5).select('title scheduled_at schedule_error').lean(),
      Content.find({ status: 'scheduled', schedule_error: mongoose.trusted({ $exists: true }) as never }).select('title schedule_error scheduled_at').lean(),
      Submission.countDocuments({ status: 'pending_review' }),
      AuditLog.find({}).sort({ created_at: -1 }).limit(8).lean(),
    ]);
    const counts = Object.fromEntries(byStatus.map((s) => [s._id, s.n]));
    const short = (c: unknown) => { const x = c as { _id: Types.ObjectId; title: string; scheduled_at?: Date; schedule_error?: string }; return { id: String(x._id), title: x.title, scheduled_at: x.scheduled_at ?? null, schedule_error: x.schedule_error ?? null }; };
    return {
      counts, scheduled_upcoming: upcoming.map(short), scheduler_alerts: failures.map(short), submissions_pending: pendingSubs,
      recent: (recent as unknown as Array<{ created_at: Date; action: string; entity: string; actor: string }>).map((a) => ({ at: a.created_at, action: a.action, entity: a.entity, actor: a.actor })),
    };
  }));
  r.get('/ops/health', adminOnly, ah(async () => ({
    db: mongoose.connection.readyState === 1 ? 'up' : 'down',
    scheduler: { started: schedulerState.started, last_run_at: schedulerState.last_run_at, last_error: schedulerState.last_error },
    node: process.version,
  })));

  // ---------- admin accounts (site_admin only) ----------
  // Lets a site admin shut out a lost or compromised account at once, without touching the database.
  r.get('/users', adminOnly, ah(async () => {
    const rows = (await AdminUser.find({}).sort({ display_name: 1 }).lean()) as unknown as Array<{
      _id: Types.ObjectId; email: string; display_name: string; role: string; is_active: boolean; last_login_at?: Date;
    }>;
    return {
      items: rows.map((u) => ({
        id: String(u._id), email: u.email, display_name: u.display_name, role: u.role, is_active: u.is_active, last_login_at: u.last_login_at ?? null,
      })),
    };
  }));

  r.patch('/users/:id', adminOnly, ah(async (req) => {
    const id = String(req.params.id);
    if (!OBJECT_ID.test(id)) throw notFound();
    const b = parseWith(z.object({ is_active: z.boolean() }).strict(), req.body);
    if (id === req.admin!.id) {
      throw validationFailed([{ field: 'id', code: 'self', message_hi: 'आप अपना ही खाता निष्क्रिय नहीं कर सकते' }]);
    }
    const user = (await AdminUser.findById(id).lean()) as unknown as { role: string; is_active: boolean } | null;
    if (!user) throw notFound();
    if (!b.is_active && user.role === 'site_admin' && user.is_active) {
      const others = await AdminUser.countDocuments({ role: 'site_admin', is_active: true, _id: mongoose.trusted({ $ne: id }) as never });
      if (others === 0) throw validationFailed([{ field: 'id', code: 'last_site_admin', message_hi: 'अंतिम सक्रिय साइट व्यवस्थापक को निष्क्रिय नहीं किया जा सकता' }]);
    }
    await AdminUser.updateOne({ _id: id }, { $set: { is_active: b.is_active } });
    // Deactivation ends every session of that account now (requireAuth would also refuse it on the next call).
    if (!b.is_active) await mongoose.connection.collection('sessions').deleteMany({ 'session.user_id': id });
    await audit(req, b.is_active ? 'admin.reactivated' : 'admin.deactivated', 'admin_user', id);
    return { id, is_active: b.is_active };
  }));

  return r;
}
