import { Router } from 'express';
import mongoose, { type Types } from 'mongoose';
import { z } from 'zod';
import type { Env } from '../config/env.js';
import { actorOf, ah, OBJECT_ID, parseWith } from '../lib/admin.js';
import { AppError, notFound } from '../lib/errors.js';
import { escapeRegex, regex } from '../lib/queries.js';
import { searchFolded } from '../lib/hindi.js';
import { previewKey, signPreview } from '../lib/preview.js';
import { ROLES, type ContentStatus } from '../lib/workflow.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { requireCsrf } from '../middleware/security.js';
import { Author, Category, Content, ContentRevision, CONTENT_STATUSES, CONTENT_TYPES, MediaAsset } from '../models/index.js';
import { createContent, createContentInput, restoreRevision, transitionContent, updateContent, updateContentInput, withTx } from '../services/content.js';
import { purgeContents } from '../services/delete.js';
import { writeAudit } from '../services/audit.js';

const pageQ = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
});

interface Row {
  _id: Types.ObjectId;
  slug: string;
  title: string;
  status: ContentStatus;
  content_type: string;
  category_id: Types.ObjectId;
  credits: Array<{ author_id: Types.ObjectId; role: string }>;
  revision_no: number;
  scheduled_at?: Date;
  published_at?: Date;
  schedule_error?: string;
  updated_at: Date;
  [k: string]: unknown;
}

/** Admin shape: includes private working fields (rights note, checks) that the public API never shows. */
async function adminShape(c: Row) {
  const [cat, authors, media] = await Promise.all([
    Category.findById(c.category_id).select('name slug').lean(),
    Author.find({ _id: mongoose.trusted({ $in: c.credits.map((x) => x.author_id) }) as never }).select('name slug').lean(),
    c.cover_media_id ? MediaAsset.findById(c.cover_media_id).select('storage_key alt_text credit width height').lean() : null,
  ]);
  const aById = new Map((authors as unknown as Array<{ _id: Types.ObjectId; name: string }>).map((a) => [String(a._id), a.name]));
  const m = media as unknown as { storage_key: string; alt_text: string; credit?: string } | null;
  return {
    id: String(c._id),
    slug: c.slug, title: c.title, status: c.status, content_type: c.content_type, body: c.body, body_format: c.body_format,
    excerpt: c.excerpt, category_id: String(c.category_id), category: cat ? { slug: (cat as unknown as { slug: string }).slug, name: (cat as unknown as { name: string }).name } : null,
    topic_ids: ((c.topic_ids as Types.ObjectId[]) ?? []).map(String),
    credits: c.credits.map((x) => ({ author_id: String(x.author_id), role: x.role, name: aById.get(String(x.author_id)) ?? null })),
    source_note: c.source_note ?? null, translator_note: c.translator_note ?? null, rights_note: c.rights_note ?? null,
    cover_media_id: c.cover_media_id ? String(c.cover_media_id) : null,
    cover: m ? { url: `/media/${m.storage_key}`, alt: m.alt_text, credit: m.credit ?? null } : null,
    seo_title: c.seo_title ?? null, seo_description: c.seo_description ?? null, canonical_url: c.canonical_url ?? null,
    lang_checked: c.lang_checked, proof_checked: c.proof_checked, final_approved: c.final_approved,
    featured: Boolean(c.featured), scheduled_at: c.scheduled_at ?? null, published_at: c.published_at ?? null,
    schedule_error: c.schedule_error ?? null, revision_no: c.revision_no, created_at: c.created_at, updated_at: c.updated_at,
  };
}

export function createAdminContentRouter(env: Env): Router {
  const r = Router();
  r.use(requireAuth, requireRole(env, ...ROLES), requireCsrf);
  const editorUp = requireRole(env, 'site_admin', 'editor_in_chief', 'editor');
  const adminOnly = requireRole(env, 'site_admin');

  r.get('/contents', ah(async (req) => {
    const q = parseWith(
      pageQ.extend({
        status: z.enum(CONTENT_STATUSES).optional(),
        type: z.enum(CONTENT_TYPES).optional(),
        category: z.string().regex(OBJECT_ID).optional(),
        q: z.string().trim().max(100).optional(),
      }),
      req.query,
    );
    const filter: Record<string, unknown> = {};
    if (q.status) filter.status = q.status;
    if (q.type) filter.content_type = q.type;
    if (q.category) filter.category_id = q.category;
    if (q.q) filter.search_text_folded = regex(escapeRegex(searchFolded(q.q)));
    const [rows, total] = await Promise.all([
      Content.find(filter).select('-body -search_text -search_text_folded').sort({ updated_at: -1, _id: -1 }).skip((q.page - 1) * q.page_size).limit(q.page_size).lean(),
      Content.countDocuments(filter),
    ]);
    const cats = await Category.find({}).select('name').lean();
    const catName = new Map((cats as unknown as Array<{ _id: Types.ObjectId; name: string }>).map((c) => [String(c._id), c.name]));
    return {
      items: (rows as unknown as Row[]).map((c) => ({
        id: String(c._id), slug: c.slug, title: c.title, status: c.status, content_type: c.content_type,
        category: catName.get(String(c.category_id)) ?? null, scheduled_at: c.scheduled_at ?? null,
        published_at: c.published_at ?? null, schedule_error: c.schedule_error ?? null, revision_no: c.revision_no, updated_at: c.updated_at,
      })),
      page: q.page, page_size: q.page_size, total,
    };
  }));

  r.post('/contents', ah(async (req) => {
    const input = parseWith(createContentInput, req.body);
    const c = await createContent(input, actorOf(req));
    return adminShape(c as unknown as Row);
  }, 201));

  const idOf = (req: { params: Record<string, string | string[] | undefined> }) => {
    const id = String(req.params.id);
    if (!OBJECT_ID.test(id)) throw notFound();
    return id;
  };

  r.get('/contents/:id', ah(async (req) => {
    const c = await Content.findById(idOf(req)).lean();
    if (!c) throw notFound();
    return adminShape(c as unknown as Row);
  }));

  r.patch('/contents/:id', ah(async (req) => {
    const header = req.header('if-match');
    if (!header || !/^\d+$/.test(header.replace(/"/g, ''))) {
      throw new AppError(428, 'precondition_required', 'If-Match with the revision number is required', 'संस्करण संख्या आवश्यक है');
    }
    const input = parseWith(updateContentInput, req.body);
    const c = await updateContent(idOf(req), input, Number(header.replace(/"/g, '')), actorOf(req));
    return adminShape(c as unknown as Row);
  }));

  const transitionBody = z.object({
    to: z.enum(CONTENT_STATUSES),
    note: z.string().trim().max(500).optional(),
    scheduled_at: z.coerce.date().optional(),
  });
  r.post('/contents/:id/transition', ah(async (req) => {
    const b = parseWith(transitionBody, req.body);
    const c = await transitionContent(idOf(req), b.to, { note: b.note, scheduled_at: b.scheduled_at }, actorOf(req));
    return adminShape(c as unknown as Row);
  }));

  r.get('/contents/:id/revisions', editorUp, ah(async (req) => {
    const id = idOf(req);
    if (!(await Content.exists({ _id: id }))) throw notFound();
    const rows = await ContentRevision.find({ content_id: id }).sort({ revision_no: -1 }).limit(200).lean();
    return {
      items: (rows as unknown as Array<{ revision_no: number; created_at: Date; note?: string; actor_id?: Types.ObjectId; snapshot: { title?: string } }>).map((x) => ({
        revision_no: x.revision_no, created_at: x.created_at, note: x.note ?? null, actor_id: x.actor_id ? String(x.actor_id) : null, title: x.snapshot?.title ?? null,
      })),
    };
  }));

  r.post('/contents/:id/revisions/:n/restore', editorUp, ah(async (req) => {
    const n = Number(req.params.n);
    if (!Number.isInteger(n) || n < 1) throw notFound();
    const c = await restoreRevision(idOf(req), n, actorOf(req));
    return adminShape(c as unknown as Row);
  }));

  r.post('/contents/:id/preview-link', ah(async (req) => {
    const id = idOf(req);
    if (!(await Content.exists({ _id: id }))) throw notFound();
    const token = signPreview(id, previewKey(env));
    await writeAudit({ actor_id: req.admin!.id, action: 'content.preview_link', entity: 'content', entity_id: id, request_id: (req as { id?: string }).id });
    return { token, path: `/preview/${token}`, expires_in_minutes: 30 };
  }));

  // Permanent delete, site_admin only, any status (a published piece disappears from the site, search and sitemap at once).
  r.delete('/contents/:id', adminOnly, ah(async (req) => {
    const id = idOf(req);
    const c = (await Content.findById(id).select('status title').lean()) as unknown as { status: string; title: string } | null;
    if (!c) throw notFound();
    await withTx((session) => purgeContents([new mongoose.Types.ObjectId(id)], session));
    await writeAudit({
      actor_id: req.admin!.id, action: 'content.delete', entity: 'content', entity_id: id,
      note: `${c.status}: ${c.title}`.slice(0, 200), request_id: (req as { id?: string }).id,
    });
    return undefined;
  }));

  return r;
}
