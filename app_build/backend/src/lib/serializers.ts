import type { Types } from 'mongoose';
import { Author, Category, MediaAsset } from '../models/index.js';
import { inList } from './queries.js';

/**
 * Public serializers are explicit allow-lists (spec_contract skill, docs/data-model.md §3).
 * No document is ever returned whole. Private fields never appear here:
 * rights_note, submission_id, check flags, revision_no, search fields, private_contact, media permission notes.
 */

interface IdLike { _id: Types.ObjectId }

export interface PublicCover { url: string; alt: string; credit: string | null; width: number; height: number }
export interface PublicAuthorRef { name: string; slug: string | null; role: string }

export interface Ctx {
  categories: Map<string, { slug: string; name: string }>;
  authors: Map<string, { name: string; slug: string; is_public: boolean; photo_media_id?: Types.ObjectId }>;
  media: Map<string, { storage_key: string; alt_text: string; credit?: string; width: number; height: number }>;
  mediaBase: string;
  /** Preview only: adds a short-lived signed `?t=` to each image address so private images load (middleware/media.ts). */
  signMedia?: (storageKey: string) => string;
}

const idStr = (x: unknown) => String(x);

/** Loads everything the serializers need for a batch of contents with three queries. */
export async function loadContext(
  contents: Array<{
    category_id: Types.ObjectId;
    credits: Array<{ author_id: Types.ObjectId }>;
    cover_media_id?: Types.ObjectId | null;
  }>,
  mediaBase: string,
  extra: { authorIds?: Types.ObjectId[]; mediaIds?: Types.ObjectId[]; allowPrivateMedia?: boolean; signMedia?: (storageKey: string) => string } = {},
): Promise<Ctx> {
  const catIds = [...new Set(contents.map((c) => idStr(c.category_id)))];
  const authorIds = [
    ...new Set([...contents.flatMap((c) => c.credits.map((cr) => idStr(cr.author_id))), ...(extra.authorIds ?? []).map(idStr)]),
  ];
  const [cats, authors] = await Promise.all([
    Category.find({ _id: inList(catIds) }).select('slug name').lean(),
    Author.find({ _id: inList(authorIds) }).select('slug name is_public photo_media_id').lean(),
  ]);
  const mediaIds = [
    ...new Set([
      ...contents.map((c) => (c.cover_media_id ? idStr(c.cover_media_id) : '')).filter(Boolean),
      ...authors.filter((a) => a.is_public && a.photo_media_id).map((a) => idStr(a.photo_media_id)),
      ...(extra.mediaIds ?? []).map(idStr),
    ]),
  ];
  const media = await MediaAsset.find({ _id: inList(mediaIds), ...(extra.allowPrivateMedia ? {} : { is_public: true }) }).select('storage_key alt_text credit width height').lean();
  return {
    categories: new Map((cats as Array<IdLike & { slug: string; name: string }>).map((c) => [idStr(c._id), { slug: c.slug, name: c.name }])),
    authors: new Map(
      (authors as unknown as Array<IdLike & { name: string; slug: string; is_public: boolean; photo_media_id?: Types.ObjectId }>).map((a) => [
        idStr(a._id),
        { name: a.name, slug: a.slug, is_public: a.is_public, photo_media_id: a.photo_media_id },
      ]),
    ),
    media: new Map(
      (media as unknown as Array<IdLike & { storage_key: string; alt_text: string; credit?: string; width: number; height: number }>).map((m) => [
        idStr(m._id),
        { storage_key: m.storage_key, alt_text: m.alt_text, credit: m.credit, width: m.width, height: m.height },
      ]),
    ),
    mediaBase,
    ...(extra.signMedia ? { signMedia: extra.signMedia } : {}),
  };
}

/** A cover or photo is public only when the asset is public AND has alt text. */
export function coverOf(ctx: Ctx, mediaId?: Types.ObjectId | null): PublicCover | null {
  if (!mediaId) return null;
  const m = ctx.media.get(idStr(mediaId));
  if (!m || !m.alt_text.trim()) return null;
  const url = `${ctx.mediaBase}/${m.storage_key}`;
  return { url: ctx.signMedia ? `${url}?t=${ctx.signMedia(m.storage_key)}` : url, alt: m.alt_text, credit: m.credit ?? null, width: m.width, height: m.height };
}

interface ContentLike {
  slug: string;
  title: string;
  excerpt: string;
  content_type: string;
  category_id: Types.ObjectId;
  credits: Array<{ author_id: Types.ObjectId; role?: string }>;
  cover_media_id?: Types.ObjectId | null;
  published_at?: Date | null;
}

export function authorRefs(ctx: Ctx, credits: ContentLike['credits']): PublicAuthorRef[] {
  return credits.flatMap((cr) => {
    const a = ctx.authors.get(idStr(cr.author_id));
    if (!a) return [];
    // The name is a credit and is shown; a link to the profile exists only when the author is public.
    return [{ name: a.name, slug: a.is_public ? a.slug : null, role: cr.role ?? 'author' }];
  });
}

export function contentCard(c: ContentLike, ctx: Ctx) {
  const cat = ctx.categories.get(idStr(c.category_id));
  return {
    slug: c.slug,
    title: c.title,
    excerpt: c.excerpt,
    type: c.content_type,
    category: cat ? { slug: cat.slug, name: cat.name } : null,
    authors: authorRefs(ctx, c.credits),
    cover: coverOf(ctx, c.cover_media_id),
    published_at: c.published_at ?? null,
  };
}

export function contentFull(
  c: ContentLike & {
    body: string;
    body_format: string;
    source_note?: string | null;
    translator_note?: string | null;
    seo_title?: string | null;
    seo_description?: string | null;
  },
  ctx: Ctx,
) {
  return {
    ...contentCard(c, ctx),
    body: c.body,
    body_format: c.body_format,
    source_note: c.source_note ?? null,
    translator_note: c.translator_note ?? null,
    seo_title: c.seo_title ?? null,
    seo_description: c.seo_description ?? null,
  };
}

export function authorCard(
  a: { slug: string; name: string; bio?: string | null; birth_year?: number | null; birthplace?: string | null; photo_media_id?: Types.ObjectId | null },
  ctx: Ctx,
  works_count?: number,
) {
  return {
    slug: a.slug,
    name: a.name,
    bio: a.bio ?? null,
    birth_year: a.birth_year ?? null,
    birthplace: a.birthplace ?? null,
    photo: coverOf(ctx, a.photo_media_id), // authors listed here are public by query
    ...(works_count === undefined ? {} : { works_count }),
  };
}
