import { Router } from 'express';
import mongoose, { type Types } from 'mongoose';
import { z } from 'zod';
import type { Env } from '../config/env.js';
import { actorOf, ah, OBJECT_ID, parseWith } from '../lib/admin.js';
import { AppError, notFound, validationFailed } from '../lib/errors.js';
import { escapeRegex, regex } from '../lib/queries.js';
import { stripHtml } from '../lib/sanitize.js';
import { assertSubmissionTransition, type Role, type SubmissionStatus } from '../lib/workflow.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { requireCsrf } from '../middleware/security.js';
import { AdminUser, Category, ContactMessage, Content, Submission, SubmissionEvent, SUBMISSION_STATUSES } from '../models/index.js';
import { writeAudit } from '../services/audit.js';
import { createContent, withTx } from '../services/content.js';

const oidStr = z.string().regex(OBJECT_ID, 'invalid id');
const pageQ = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(30),
});
const NOTE_REQUIRED: SubmissionStatus[] = ['revision_requested', 'rejected', 'withdrawn'];
const VERSE_TYPES = ['kavita', 'ghazal', 'geet'];

interface Sub {
  _id: Types.ObjectId; reference_id: string; display_name: string; pen_name?: string; email: string; title: string; creation_type: string;
  body: string; description?: string; consent_original: boolean; consent_publication: boolean; consent_privacy: boolean;
  consent_text_version: string; consent_at: Date; status: SubmissionStatus; assigned_to?: Types.ObjectId; converted_content_id?: Types.ObjectId;
  created_at: Date;
}

/**
 * The submission inbox and the contact inbox. Everything here is private writer data: editors and above only,
 * checked on the server. Pending, under-review and rejected work is reachable nowhere else.
 */
export function createAdminSubmissionsRouter(env: Env): Router {
  const r = Router();
  // Scoped to this router's own paths: a router-wide guard would also block other /admin routers mounted after it.
  r.use(['/submissions', '/staff', '/messages'], requireAuth, requireRole(env, 'site_admin', 'editor_in_chief', 'editor'), requireCsrf);
  const idOf = (req: { params: Record<string, string | string[] | undefined> }) => {
    const id = String(req.params.id);
    if (!OBJECT_ID.test(id)) throw notFound();
    return id;
  };
  const rid = (req: object) => (req as { id?: string }).id;

  async function adminNames(ids: string[]) {
    const real = ids.filter((x) => OBJECT_ID.test(x));
    const rows = (await AdminUser.find({ _id: mongoose.trusted({ $in: real }) as never }).select('display_name').lean()) as unknown as Array<{ _id: Types.ObjectId; display_name: string }>;
    return new Map(rows.map((a) => [String(a._id), a.display_name]));
  }

  r.get('/submissions', ah(async (req) => {
    const q = parseWith(pageQ.extend({ status: z.enum(SUBMISSION_STATUSES).optional(), q: z.string().trim().max(100).optional() }), req.query);
    const filter: Record<string, unknown> = {};
    if (q.status) filter.status = q.status;
    if (q.q) {
      // Reference IDs are upper case; titles and names are matched as typed.
      filter.$or = mongoose.trusted([
        { reference_id: regex(escapeRegex(q.q.toUpperCase())) }, { title: regex(escapeRegex(q.q)) }, { display_name: regex(escapeRegex(q.q)) },
      ]) as never;
    }
    const [rows, total] = await Promise.all([
      Submission.find(filter).select('-body -ip_hash -ua_hash -dedupe_hash').sort({ created_at: -1 }).skip((q.page - 1) * q.page_size).limit(q.page_size).lean(),
      Submission.countDocuments(filter),
    ]);
    const names = await adminNames((rows as unknown as Sub[]).map((s) => String(s.assigned_to ?? '')).filter(Boolean));
    return {
      items: (rows as unknown as Sub[]).map((s) => ({
        id: String(s._id), reference_id: s.reference_id, title: s.title, display_name: s.display_name, creation_type: s.creation_type,
        status: s.status, created_at: s.created_at, assigned_to: s.assigned_to ? names.get(String(s.assigned_to)) ?? null : null,
      })),
      page: q.page, page_size: q.page_size, total,
    };
  }));

  async function detail(id: string) {
    const s = (await Submission.findById(id).select('-ip_hash -ua_hash -dedupe_hash').lean()) as unknown as Sub | null;
    if (!s) throw notFound();
    const events = (await SubmissionEvent.find({ submission_id: id }).sort({ created_at: 1 }).lean()) as unknown as Array<{
      created_at: Date; actor: string; kind?: string; from_status?: string; to_status?: string; note?: string;
    }>;
    const names = await adminNames([...events.map((e) => e.actor), String(s.assigned_to ?? '')]);
    return {
      id: String(s._id), reference_id: s.reference_id, display_name: s.display_name, pen_name: s.pen_name ?? null, email: s.email,
      title: s.title, creation_type: s.creation_type, body: s.body, description: s.description ?? null, status: s.status,
      created_at: s.created_at,
      consent: { original: s.consent_original, publication: s.consent_publication, privacy: s.consent_privacy, version: s.consent_text_version, at: s.consent_at },
      assigned_to: s.assigned_to ? { id: String(s.assigned_to), name: names.get(String(s.assigned_to)) ?? null } : null,
      converted_content_id: s.converted_content_id ? String(s.converted_content_id) : null,
      events: events.map((e) => ({
        at: e.created_at, actor: names.get(e.actor) ?? e.actor, kind: e.kind ?? 'status', from: e.from_status ?? null, to: e.to_status ?? null, note: e.note ?? null,
      })),
    };
  }

  r.get('/submissions/:id', ah(async (req) => {
    const id = idOf(req);
    await writeAudit({ actor_id: req.admin!.id, action: 'submission.view', entity: 'submission', entity_id: id, request_id: rid(req) });
    return detail(id);
  }));

  r.post('/submissions/:id/transition', ah(async (req) => {
    const id = idOf(req);
    const b = parseWith(z.object({ to: z.enum(SUBMISSION_STATUSES), note: z.string().trim().max(2000).optional() }), req.body);
    const cur = (await Submission.findById(id).select('status').lean()) as unknown as { status: SubmissionStatus } | null;
    if (!cur) throw notFound();
    assertSubmissionTransition(cur.status, b.to, req.admin!.role as Role);
    if (b.to === 'converted') throw validationFailed([{ field: 'to', code: 'use_convert', message_hi: 'रूपांतरण के लिए अलग कार्य का उपयोग करें' }]);
    const note = b.note ? stripHtml(b.note) : undefined;
    if (NOTE_REQUIRED.includes(b.to) && !note) {
      throw validationFailed([{ field: 'note', code: 'note_required', message_hi: 'इस कार्य के लिए टिप्पणी आवश्यक है' }]);
    }
    await withTx(async (session) => {
      const res = await Submission.updateOne({ _id: id, status: cur.status }, { $set: { status: b.to } }, { session });
      if (res.modifiedCount !== 1) throw new AppError(409, 'conflict', 'Status changed meanwhile', 'स्थिति इसी बीच बदल गई');
      await SubmissionEvent.create([{ submission_id: id, from_status: cur.status, to_status: b.to, actor: req.admin!.id, kind: 'status', note }] as never, { session });
    });
    await writeAudit({ actor_id: req.admin!.id, action: 'submission.transition', entity: 'submission', entity_id: id, from: cur.status, to: b.to, request_id: rid(req) });
    return detail(id);
  }));

  r.post('/submissions/:id/assign', ah(async (req) => {
    const id = idOf(req);
    const b = parseWith(z.object({ assigned_to: oidStr.nullable() }), req.body);
    if (!(await Submission.exists({ _id: id }))) throw notFound();
    if (b.assigned_to && !(await AdminUser.exists({ _id: b.assigned_to, is_active: true }))) {
      throw validationFailed([{ field: 'assigned_to', code: 'unknown_admin', message_hi: 'संपादक नहीं मिला' }]);
    }
    await Submission.updateOne({ _id: id }, b.assigned_to ? { $set: { assigned_to: b.assigned_to } } : { $unset: { assigned_to: '' } });
    await SubmissionEvent.create({ submission_id: id, actor: req.admin!.id, kind: 'assign', note: b.assigned_to ? `assigned to ${b.assigned_to}` : 'unassigned' } as never);
    await writeAudit({ actor_id: req.admin!.id, action: 'submission.assign', entity: 'submission', entity_id: id, request_id: rid(req) });
    return detail(id);
  }));

  r.post('/submissions/:id/notes', ah(async (req) => {
    const id = idOf(req);
    const b = parseWith(z.object({ note: z.string().trim().min(1).max(2000) }), req.body);
    const cur = (await Submission.findById(id).select('status').lean()) as unknown as { status: string } | null;
    if (!cur) throw notFound();
    await SubmissionEvent.create({ submission_id: id, from_status: cur.status, to_status: cur.status, actor: req.admin!.id, kind: 'note', note: stripHtml(b.note) } as never);
    await writeAudit({ actor_id: req.admin!.id, action: 'submission.note', entity: 'submission', entity_id: id, request_id: rid(req) });
    return detail(id);
  }, 201));

  // Approved work becomes a DRAFT content record. Approved does not publish: it still goes through the content workflow.
  r.post('/submissions/:id/convert', ah(async (req) => {
    const id = idOf(req);
    const b = parseWith(z.object({ category_id: oidStr, author_id: oidStr.optional() }), req.body);
    const s = (await Submission.findById(id).lean()) as unknown as Sub | null;
    if (!s) throw notFound();
    assertSubmissionTransition(s.status, 'converted', req.admin!.role as Role);
    if (!(await Category.exists({ _id: b.category_id, is_active: true }))) {
      throw validationFailed([{ field: 'category_id', code: 'unknown_category', message_hi: 'श्रेणी नहीं मिली' }]);
    }
    const excerpt = (s.description?.trim() || [...s.body.replace(/\s+/g, ' ')].slice(0, 200).join('')).slice(0, 300);
    const content = await createContent({
      title: s.title, content_type: s.creation_type as never, body: s.body, body_format: VERSE_TYPES.includes(s.creation_type) ? 'verse' : 'prose',
      excerpt, category_id: b.category_id, credits: b.author_id ? [{ author_id: b.author_id, role: 'author' as const }] : [],
      // Internal pointer only: the rights note is completed by the editor from the recorded consent.
      rights_note: `Submission ${s.reference_id}: consent recorded ${s.consent_at.toISOString()} (text version ${s.consent_text_version})`,
    } as never, actorOf(req));
    const contentId = String((content as unknown as { _id: Types.ObjectId })._id);
    await Content.updateOne({ _id: contentId }, { $set: { submission_id: id } });
    await withTx(async (session) => {
      const res = await Submission.updateOne({ _id: id, status: 'approved' }, { $set: { status: 'converted', converted_content_id: contentId } }, { session });
      if (res.modifiedCount !== 1) throw new AppError(409, 'conflict', 'Status changed meanwhile', 'स्थिति इसी बीच बदल गई');
      await SubmissionEvent.create([{ submission_id: id, from_status: 'approved', to_status: 'converted', actor: req.admin!.id, kind: 'convert', note: `draft content ${contentId}` }] as never, { session });
    });
    await writeAudit({ actor_id: req.admin!.id, action: 'submission.convert', entity: 'submission', entity_id: id, from: 'approved', to: 'converted', request_id: rid(req) });
    return { content_id: contentId };
  }));

  // Names for the "assign to" list. Only id, name and role: no email, no hashes.
  r.get('/staff', ah(async () => {
    const rows = (await AdminUser.find({ is_active: true }).select('display_name role').sort({ display_name: 1 }).lean()) as unknown as Array<{ _id: Types.ObjectId; display_name: string; role: string }>;
    return { items: rows.map((a) => ({ id: String(a._id), display_name: a.display_name, role: a.role })) };
  }));

  // ---------- contact inbox ----------
  r.get('/messages', ah(async (req) => {
    const q = parseWith(pageQ.extend({ status: z.enum(['new', 'handled']).optional() }), req.query);
    const filter: Record<string, unknown> = q.status ? { status: q.status } : {};
    const [rows, total] = await Promise.all([
      ContactMessage.find(filter).select('-ip_hash').sort({ created_at: -1 }).skip((q.page - 1) * q.page_size).limit(q.page_size).lean(),
      ContactMessage.countDocuments(filter),
    ]);
    return {
      items: (rows as unknown as Array<Record<string, unknown> & { _id: Types.ObjectId }>).map((m) => ({
        id: String(m._id), name: m.name, email: m.email, subject: m.subject, message: m.message, status: m.status, created_at: m.created_at,
      })),
      page: q.page, page_size: q.page_size, total,
    };
  }));
  r.patch('/messages/:id', ah(async (req) => {
    const id = idOf(req);
    const b = parseWith(z.object({ status: z.enum(['new', 'handled']) }), req.body);
    const m = await ContactMessage.findByIdAndUpdate(id, { $set: { status: b.status } }, { returnDocument: 'after' }).lean();
    if (!m) throw notFound();
    await writeAudit({ actor_id: req.admin!.id, action: 'message.update', entity: 'contact_message', entity_id: id, to: b.status, request_id: rid(req) });
    return { id, status: b.status };
  }));

  // ---------- permanent deletes, site_admin only ----------
  // A submission goes with its whole history. A draft already made from it is a normal piece by then and stays.
  r.delete('/submissions/:id', requireRole(env, 'site_admin'), ah(async (req) => {
    const id = idOf(req);
    const s = (await Submission.findById(id).select('reference_id title').lean()) as unknown as { reference_id: string; title: string } | null;
    if (!s) throw notFound();
    await withTx(async (session) => {
      await SubmissionEvent.deleteMany({ submission_id: id } as never, { session });
      await Submission.deleteOne({ _id: id } as never, { session });
    });
    await writeAudit({
      actor_id: req.admin!.id, action: 'submission.delete', entity: 'submission', entity_id: id,
      note: `${s.reference_id}: ${s.title}`.slice(0, 200), request_id: rid(req),
    });
    return undefined;
  }));
  r.delete('/messages/:id', requireRole(env, 'site_admin'), ah(async (req) => {
    const id = idOf(req);
    const m = await ContactMessage.findByIdAndDelete(id).lean();
    if (!m) throw notFound();
    await writeAudit({ actor_id: req.admin!.id, action: 'message.delete', entity: 'contact_message', entity_id: id, request_id: rid(req) });
    return undefined;
  }));

  return r;
}
