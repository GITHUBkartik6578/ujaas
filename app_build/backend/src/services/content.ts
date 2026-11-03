import mongoose, { type ClientSession, type Types } from 'mongoose';
import { z } from 'zod';
import { AppError, forbidden, notFound, validationFailed } from '../lib/errors.js';
import { buildContentSearchFields } from '../lib/content.js';
import { hasForbiddenControlChars, toStoredText } from '../lib/hindi.js';
import { stripHtml } from '../lib/sanitize.js';
import { SLUG_PATTERN, uniqueSlug } from '../lib/slug.js';
import {
  assertContentTransition, canEditContent, canSetFinalApproval, canSetLangProof, publishBlockers,
  type ContentStatus, type Role,
} from '../lib/workflow.js';
import { Author, Category, Content, ContentRevision, CONTENT_TYPES, MediaAsset, SlugRedirect } from '../models/index.js';
import { writeAudit } from './audit.js';

export interface Actor {
  id?: string;
  role: Role | 'system';
  request_id?: string;
}

const oidStr = z.string().regex(/^[a-f0-9]{24}$/i, 'invalid id');
const plain = (max: number) => z.string().max(max).transform((s) => stripHtml(s).trim());

/** Fields an editor can change. Everything is optional here; create() requires the essential ones. */
export const contentFields = z.object({
  title: plain(160).pipe(z.string().min(1)),
  slug: z.string().max(80).regex(SLUG_PATTERN).optional(),
  content_type: z.enum(CONTENT_TYPES),
  body: z.string().min(1).max(200_000),
  body_format: z.enum(['verse', 'prose']),
  excerpt: plain(300).pipe(z.string().min(1)),
  category_id: oidStr,
  topic_ids: z.array(oidStr).max(20),
  credits: z.array(z.object({ author_id: oidStr, role: z.enum(['author', 'translator']).default('author') })).max(10),
  source_note: plain(500).nullable(),
  translator_note: plain(500).nullable(),
  rights_note: plain(1000).nullable(),
  cover_media_id: oidStr.nullable(),
  seo_title: plain(160).nullable(),
  seo_description: plain(300).nullable(),
  canonical_url: z.string().url().max(300).nullable(),
  lang_checked: z.boolean(),
  proof_checked: z.boolean(),
  final_approved: z.boolean(),
});
export const createContentInput = contentFields.partial().required({
  title: true, content_type: true, body: true, body_format: true, excerpt: true, category_id: true,
});
export const updateContentInput = contentFields.partial();
export type ContentInput = z.infer<typeof updateContentInput>;

const EDITABLE = [
  'title', 'slug', 'content_type', 'body', 'body_format', 'excerpt', 'category_id', 'topic_ids', 'credits',
  'source_note', 'translator_note', 'rights_note', 'cover_media_id', 'seo_title', 'seo_description', 'canonical_url',
  'lang_checked', 'proof_checked', 'final_approved',
] as const;

interface Rec {
  _id: Types.ObjectId;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  body_format: 'verse' | 'prose';
  content_type: string;
  category_id: Types.ObjectId;
  topic_ids: Types.ObjectId[];
  credits: Array<{ author_id: Types.ObjectId; role: string }>;
  cover_media_id?: Types.ObjectId | null;
  rights_note?: string | null;
  status: ContentStatus;
  revision_no: number;
  published_at?: Date | null;
  scheduled_at?: Date | null;
  lang_checked: boolean;
  proof_checked: boolean;
  final_approved: boolean;
  [k: string]: unknown;
}

export function snapshotOf(c: Rec): Record<string, unknown> {
  const snap: Record<string, unknown> = {};
  for (const k of EDITABLE) snap[k] = c[k] ?? null;
  return snap;
}

export async function withTx<T>(fn: (session: ClientSession) => Promise<T>): Promise<T> {
  const session = await mongoose.startSession();
  try {
    let out!: T;
    await session.withTransaction(async () => {
      out = await fn(session);
    });
    return out;
  } finally {
    await session.endSession();
  }
}

const load = async (id: string, session?: ClientSession): Promise<Rec> => {
  if (!/^[a-f0-9]{24}$/i.test(id)) throw notFound();
  const doc = await Content.findById(id).session(session ?? null).lean();
  if (!doc) throw notFound();
  return doc as unknown as Rec;
};

async function checkRefs(input: ContentInput) {
  const fields: Array<{ field: string; code: string; message_hi?: string }> = [];
  if (input.category_id) {
    if (!(await Category.exists({ _id: input.category_id, is_active: true }))) fields.push({ field: 'category_id', code: 'unknown_category', message_hi: 'श्रेणी नहीं मिली' });
  }
  if (input.credits && input.credits.length > 0) {
    const ids = input.credits.map((c) => c.author_id);
    const n = await Author.countDocuments({ _id: mongoose.trusted({ $in: ids }) as never, archived: false });
    if (n !== new Set(ids).size) fields.push({ field: 'credits', code: 'unknown_author', message_hi: 'रचनाकार नहीं मिला' });
  }
  if (input.cover_media_id && !(await MediaAsset.exists({ _id: input.cover_media_id }))) {
    fields.push({ field: 'cover_media_id', code: 'unknown_media', message_hi: 'चित्र नहीं मिला' });
  }
  if (fields.length > 0) throw validationFailed(fields);
}

function cleanBody(input: ContentInput) {
  if (input.body !== undefined) {
    if (hasForbiddenControlChars(input.body)) {
      throw validationFailed([{ field: 'body', code: 'control_chars', message_hi: 'पाठ में अमान्य अक्षर हैं' }]);
    }
    input.body = toStoredText(input.body);
  }
  if (input.title) input.title = input.title.normalize('NFC');
  if (input.excerpt) input.excerpt = input.excerpt.normalize('NFC');
}

function checkFlagPermissions(input: ContentInput, role: Role | 'system') {
  if (role === 'system') return;
  if ((input.lang_checked !== undefined || input.proof_checked !== undefined) && !canSetLangProof(role)) throw forbidden();
  if (input.final_approved !== undefined && !canSetFinalApproval(role)) throw forbidden();
}

async function searchFieldsFor(c: { title: string; excerpt: string; body: string; category_id: Types.ObjectId; credits: Array<{ author_id: Types.ObjectId }> }) {
  const [cat, authors] = await Promise.all([
    Category.findById(c.category_id).select('name').lean(),
    Author.find({ _id: mongoose.trusted({ $in: c.credits.map((x) => x.author_id) }) as never }).select('name').lean(),
  ]);
  return buildContentSearchFields({
    title: c.title, excerpt: c.excerpt, body: c.body,
    authorNames: (authors as unknown as Array<{ name: string }>).map((a) => a.name),
    categoryName: (cat as unknown as { name?: string } | null)?.name,
  });
}

export async function createContent(raw: z.infer<typeof createContentInput>, actor: Actor): Promise<Rec> {
  const input: ContentInput = { ...raw };
  const role = actor.role;
  checkFlagPermissions(input, role);
  cleanBody(input);
  await checkRefs(input);
  const slug =
    input.slug ?? (await uniqueSlug(async (s) => Boolean(await Content.exists({ slug: s })) || Boolean(await SlugRedirect.exists({ old_slug: s })), '', 'rachna'));
  if (input.slug && ((await Content.exists({ slug })) || (await SlugRedirect.exists({ old_slug: slug })))) {
    throw validationFailed([{ field: 'slug', code: 'slug_taken', message_hi: 'यह पता पहले से उपयोग में है' }]);
  }
  const doc = {
    ...input, slug, status: 'draft' as const, revision_no: 1,
    topic_ids: input.topic_ids ?? [], credits: input.credits ?? [],
  };
  const search = await searchFieldsFor(doc as never);
  const created = await withTx(async (session) => {
    const [c] = await Content.create([{ ...doc, ...search }] as never, { session });
    const rec = c!.toObject() as unknown as Rec;
    await ContentRevision.create([{ content_id: rec._id, revision_no: 1, snapshot: snapshotOf(rec), actor_id: actor.id, note: 'created' }] as never, { session });
    return rec;
  });
  await writeAudit({ actor_id: actor.id, action: 'content.create', entity: 'content', entity_id: String(created._id), to: 'draft', request_id: actor.request_id });
  return created;
}

export async function updateContent(
  id: string, raw: ContentInput, expectedRevision: number, actor: Actor, opts: { resetChecks?: boolean } = {},
): Promise<Rec> {
  const input: ContentInput = { ...raw };
  const current = await load(id);
  if (actor.role !== 'system' && !canEditContent(current.status, actor.role)) throw forbidden();
  if (current.revision_no !== expectedRevision) {
    throw new AppError(409, 'conflict', 'This item was changed by someone else', 'यह रचना किसी और ने बदल दी है, कृपया दोबारा खोलें');
  }
  // A restore clears the approvals on purpose; that is not an attempt to grant them, so it skips this check.
  if (!opts.resetChecks) checkFlagPermissions(input, actor.role);
  cleanBody(input);
  await checkRefs(input);

  const slugChanged = input.slug !== undefined && input.slug !== current.slug;
  if (slugChanged) {
    const taken = await Content.exists({ slug: input.slug, _id: mongoose.trusted({ $ne: current._id }) as never });
    const redirected = await SlugRedirect.findOne({ old_slug: input.slug }).lean();
    const ownRedirect = redirected && String((redirected as unknown as { target_id: Types.ObjectId }).target_id) === String(current._id);
    if (taken || (redirected && !ownRedirect)) {
      throw validationFailed([{ field: 'slug', code: 'slug_taken', message_hi: 'यह पता पहले से उपयोग में है' }]);
    }
  }
  const merged = { ...current, ...input } as Rec;
  const search = await searchFieldsFor(merged);

  const updated = await withTx(async (session) => {
    const res = await Content.findOneAndUpdate(
      { _id: current._id, revision_no: current.revision_no },
      { $set: { ...input, ...search }, $inc: { revision_no: 1 } },
      { returnDocument: 'after', session },
    ).lean();
    if (!res) throw new AppError(409, 'conflict', 'This item was changed by someone else', 'यह रचना किसी और ने बदल दी है, कृपया दोबारा खोलें');
    const rec = res as unknown as Rec;
    await ContentRevision.create([{ content_id: rec._id, revision_no: rec.revision_no, snapshot: snapshotOf(rec), actor_id: actor.id }] as never, { session });
    if (slugChanged && current.published_at) {
      // A slug that was ever public keeps working: the old address redirects to the new one.
      await SlugRedirect.updateOne({ old_slug: current.slug }, { $set: { old_slug: current.slug, entity: 'content', target_id: rec._id } }, { upsert: true, session });
    }
    if (slugChanged) await SlugRedirect.deleteOne({ old_slug: rec.slug, target_id: rec._id } as never, { session });
    return rec;
  });
  await writeAudit({ actor_id: actor.id, action: 'content.update', entity: 'content', entity_id: String(updated._id), request_id: actor.request_id });
  return updated;
}

async function coverAlt(c: Rec): Promise<string | null> {
  if (!c.cover_media_id) return null;
  const m = (await MediaAsset.findById(c.cover_media_id).select('alt_text').lean()) as unknown as { alt_text?: string } | null;
  return m?.alt_text ?? '';
}

async function assertPublishable(c: Rec) {
  const blockers = publishBlockers({
    lang_checked: c.lang_checked, proof_checked: c.proof_checked, final_approved: c.final_approved,
    rights_note: c.rights_note ?? '', credits: c.credits, cover_alt: await coverAlt(c),
  });
  if (blockers.length > 0) {
    throw new AppError(422, 'publish_blocked', `Publishing needs: ${blockers.join(', ')}`, 'प्रकाशित करने से पहले ये जाँचें पूरी करें', blockers.map((b) => ({ field: b, code: 'required' })));
  }
}

export interface TransitionOptions { note?: string; scheduled_at?: Date }

/** The one function every status change goes through (editorial_workflow skill). */
export async function transitionContent(id: string, to: ContentStatus, opts: TransitionOptions, actor: Actor): Promise<Rec> {
  const current = await load(id);
  const from = current.status;
  if (actor.role === 'system') {
    if (!(from === 'scheduled' && to === 'published')) throw forbidden();
  } else {
    assertContentTransition(from, to, actor.role);
  }
  const set: Record<string, unknown> = { status: to };
  const unset: Record<string, ''> = {};
  const now = new Date();

  if (to === 'scheduled') {
    if (!opts.scheduled_at || opts.scheduled_at.getTime() <= now.getTime()) {
      throw validationFailed([{ field: 'scheduled_at', code: 'must_be_future', message_hi: 'समय भविष्य का होना चाहिए' }]);
    }
    await assertPublishable(current);
    set.scheduled_at = opts.scheduled_at;
    unset.schedule_error = '';
  }
  if (to === 'published') {
    await assertPublishable(current);
    set.published_at = from === 'unpublished' && current.published_at ? current.published_at : now;
    unset.scheduled_at = '';
    unset.schedule_error = '';
    unset.unpublished_at = '';
  }
  if (to === 'unpublished') set.unpublished_at = now;
  if (to === 'archived') set.archived_at = now;
  if (to === 'draft' || to === 'approved') {
    // Sent back for changes: the final approval no longer holds.
    if (from === 'in_review' || from === 'approved') set.final_approved = false;
    if (from === 'scheduled') unset.scheduled_at = '';
  }
  if (to === 'approved' && from === 'scheduled') unset.scheduled_at = '';

  const update: Record<string, unknown> = { $set: set };
  if (Object.keys(unset).length > 0) update.$unset = unset;
  const res = await Content.findOneAndUpdate({ _id: current._id, status: from }, update, { returnDocument: 'after' }).lean();
  if (!res) throw new AppError(409, 'conflict', 'Status changed meanwhile', 'स्थिति इसी बीच बदल गई');
  const rec = res as unknown as Rec;
  if (to === 'published' && rec.cover_media_id) {
    await MediaAsset.updateOne({ _id: rec.cover_media_id }, { $set: { is_public: true } }); // public use of a cover needs alt text, checked above
  }
  await writeAudit({
    actor_id: actor.id, action: 'content.transition', entity: 'content', entity_id: String(rec._id),
    from, to, note: opts.note?.slice(0, 500), request_id: actor.request_id,
  });
  return rec;
}

export async function restoreRevision(id: string, revisionNo: number, actor: Actor): Promise<Rec> {
  const current = await load(id);
  if (current.status === 'published' || current.status === 'scheduled') {
    throw new AppError(422, 'restore_not_allowed', 'Unpublish before restoring a revision', 'पहले रचना को अप्रकाशित करें');
  }
  const rev = await ContentRevision.findOne({ content_id: current._id, revision_no: revisionNo }).lean();
  if (!rev) throw notFound();
  // JSON round trip turns stored ObjectIds back into the plain id strings the input schema expects.
  const snap = JSON.parse(JSON.stringify((rev as unknown as { snapshot: Record<string, unknown> }).snapshot)) as Record<string, unknown>;
  // The restored text is new work: earlier approvals do not carry over.
  snap.lang_checked = false;
  snap.proof_checked = false;
  snap.final_approved = false;
  delete snap.slug; // an address never moves because of a restore
  const parsed = updateContentInput.safeParse(snap);
  if (!parsed.success) throw validationFailed([{ field: 'snapshot', code: 'invalid_snapshot' }]);
  const restored = await updateContent(id, parsed.data, current.revision_no, actor, { resetChecks: true });
  await writeAudit({ actor_id: actor.id, action: 'content.restore', entity: 'content', entity_id: id, note: `from revision ${revisionNo}`, request_id: actor.request_id });
  return restored;
}

export interface DueResult { published: string[]; failed: Array<{ id: string; reason: string }> }

/**
 * Publishes every scheduled item whose time has come. Runs every minute as actor "system".
 * A failure leaves the item scheduled and records schedule_error for the dashboard.
 */
export async function publishDue(now: Date = new Date()): Promise<DueResult> {
  const due = await Content.find({ status: 'scheduled', scheduled_at: mongoose.trusted({ $lte: now }) as never }).select('_id').lean();
  const result: DueResult = { published: [], failed: [] };
  for (const d of due) {
    const id = String(d._id);
    try {
      await transitionContent(id, 'published', { note: 'scheduled publication' }, { role: 'system' });
      result.published.push(id);
    } catch (err) {
      const reason = err instanceof AppError ? err.message : 'unexpected error';
      await Content.updateOne({ _id: d._id, status: 'scheduled' }, { $set: { schedule_error: reason.slice(0, 300) } });
      await writeAudit({ action: 'content.schedule_failed', entity: 'content', entity_id: id, note: reason.slice(0, 300) });
      result.failed.push({ id, reason });
    }
  }
  return result;
}
